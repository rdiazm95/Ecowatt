import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LineChart } from 'react-native-chart-kit';
import MultiSlider from '@ptomasroos/react-native-multi-slider';
import { apiClient } from '../api/client';
import { getProgramaciones, crearProgramacion, eliminarProgramacion as eliminarProgramacionApi } from '../api/programaciones';



const screenWidth = Dimensions.get('window').width;
const MAX_POTENCIA = 999.99;



// ---------------------------------------------------------------------------
// Componente reutilizable: ScrollView con indicador lateral personalizado
// ---------------------------------------------------------------------------
interface ScrollWithIndicatorProps {
  children: React.ReactNode;
  maxHeight: number;
}

const ScrollWithIndicator: React.FC<ScrollWithIndicatorProps> = ({ children, maxHeight }) => {
  const scrollY = useRef(new Animated.Value(0)).current;
  const [contentHeight, setContentHeight] = useState(0);
  const [containerHeight, setContainerHeight] = useState(maxHeight);

  const showIndicator = contentHeight > containerHeight;

  const thumbHeight = showIndicator
    ? Math.max(28, (containerHeight / contentHeight) * containerHeight)
    : 0;

  const thumbTop = scrollY.interpolate({
    inputRange: [0, Math.max(1, contentHeight - containerHeight)],
    outputRange: [0, Math.max(0, containerHeight - thumbHeight)],
    extrapolate: 'clamp',
  });

  return (
    <View style={{ maxHeight, flexDirection: 'row' }}>
      <ScrollView
        style={{ flex: 1 }}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        onContentSizeChange={(_, h) => setContentHeight(h)}
        onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}
      >
        {children}
      </ScrollView>

      {showIndicator && (
        <View style={indicatorStyles.track}>
          <Animated.View
            style={[
              indicatorStyles.thumb,
              { height: thumbHeight, transform: [{ translateY: thumbTop }] },
            ]}
          />
        </View>
      )}
    </View>
  );
};

const indicatorStyles = StyleSheet.create({
  track: {
    width: 4,
    backgroundColor: '#ecf0f1',
    borderRadius: 4,
    marginLeft: 4,
    marginVertical: 4,
    overflow: 'hidden',
  },
  thumb: {
    width: 4,
    backgroundColor: '#3498db',
    borderRadius: 4,
  },
});



// ---------------------------------------------------------------------------
// Normaliza una programación del backend al formato local
// ---------------------------------------------------------------------------
const mapProgFromBackend = (p: any) => ({
  id: p.id,
  nombre: p.dispositivo?.nombre ?? '—',
  potencia: parseFloat(p.potenciaW).toString(),
  duracion: parseFloat(p.duracionHoras).toString(),
  horaInicio: p.horaInicio,
  coste: parseFloat(p.costeEstimado).toFixed(4),
  kwh: (parseFloat(p.potenciaW) * parseFloat(p.duracionHoras)).toFixed(4),
});



export default function SimuladorScreen() {
  const currentRealHour = new Date().getHours();

  const [devices, setDevices] = useState<any[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<any>(null);
  const [programaciones, setProgramaciones] = useState<any[]>([]);

  const [selectedHour, setSelectedHour] = useState(currentRealHour);
  const [editedDuracion, setEditedDuracion] = useState('1');
  const [editedPotencia, setEditedPotencia] = useState('');

  const [simulacion, setSimulacion] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const toNumber = (value: any) => parseFloat(String(value).replace(',', '.')) || 0;

  const potenciaIngresada = toNumber(editedPotencia);
  const excedePotencia = potenciaIngresada > MAX_POTENCIA;

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const fetchData = async () => {
    try {
      const resDevices = await apiClient.get('/devices');
      setDevices(resDevices.data);

      setSelectedDevice((prevDevice: any) => {
        if (resDevices.data.length === 0) return null;
        if (!prevDevice) return resDevices.data[0];
        const stillExists = resDevices.data.find((d: any) => d.id === prevDevice.id);
        return stillExists ? stillExists : resDevices.data[0];
      });

      const hoyStr = new Date().toISOString().split('T')[0];
      const resProg = await getProgramaciones();
      const progsHoy = resProg.data
        .filter((p: any) => p.fecha === hoyStr)
        .map(mapProgFromBackend);
      setProgramaciones(progsHoy);

    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDevice) {
      setEditedPotencia(selectedDevice.potencia.toString());
      setEditedDuracion(selectedDevice.duracion ? selectedDevice.duracion.toString() : '1');
    }
  }, [selectedDevice]);

  const calcular = async (
    disp = selectedDevice,
    hr = selectedHour,
    dur = editedDuracion,
    pot = editedPotencia
  ) => {
    if (!disp) return;

    try {
      const duracionNum = toNumber(dur) || 1;
      const potenciaNum = toNumber(pot) || 0;

      if (potenciaNum === 0 || potenciaNum > MAX_POTENCIA) return;

      const resSimulador = await apiClient.post('/simulator/calculate', {
        deviceId: disp.id,
        startHour: hr,
        duracion: duracionNum,
        potencia: potenciaNum,
      });

      setSimulacion(resSimulador.data);
    } catch (error) {
      console.error('Error calculando coste:', error);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      calcular(selectedDevice, selectedHour, editedDuracion, editedPotencia);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [selectedDevice, selectedHour, editedDuracion, editedPotencia]);

  const handleProgramar = async () => {
    if (!selectedDevice || !simulacion) return;

    if (potenciaIngresada <= 0 || excedePotencia) {
      Alert.alert('Error', `La potencia debe estar entre 0.1 y ${MAX_POTENCIA} kW.`);
      return;
    }

    setSaving(true);

    try {
      try {
        await apiClient.patch(`/devices/${selectedDevice.id}`, { potencia: potenciaIngresada });
      } catch (apiError) {
        console.warn('No se pudo actualizar la potencia del dispositivo.');
      }

      const duracionNum = toNumber(editedDuracion) || 1;
      const horaFin = Math.min(24, selectedHour + duracionNum);

      const res = await crearProgramacion({
        horaInicio: selectedHour,
        horaFin,
        duracionHoras: duracionNum,
        potenciaW: potenciaIngresada,
        costeEstimado: parseFloat(simulacion.costeTotalEuros),
        id_dispositivo: selectedDevice.id,
      });

      const nuevaProg = {
        id: res.data.id,
        nombre: selectedDevice.nombre,
        potencia: potenciaIngresada.toString(),
        duracion: duracionNum.toString(),
        horaInicio: selectedHour,
        coste: parseFloat(simulacion.costeTotalEuros).toFixed(4),
        kwh: (potenciaIngresada * duracionNum).toFixed(4),
      };

      setProgramaciones((prev) => [...prev, nuevaProg]);

      Alert.alert('¡Añadido! ✅', `${selectedDevice.nombre} programado a las ${selectedHour}:00h.`);
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar la programación en el servidor.');
    } finally {
      setSaving(false);
    }
  };

  const eliminarProgramacion = (id: string | number) => {
    Alert.alert(
      'Eliminar programación',
      '¿Estás seguro de que deseas eliminar esta programación? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await eliminarProgramacionApi(Number(id));
              setProgramaciones((prev) =>
                prev.filter((p) => p.id !== id && p.id !== Number(id))
              );
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar la programación.');
            }
          },
        },
      ]
    );
  };

  if (loading && devices.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#3498db" />
      </SafeAreaView>
    );
  }

  const duracionActual = toNumber(editedDuracion) || 1;
  const endHour = Math.min(24, selectedHour + duracionActual);
  const isPastHour = selectedHour < currentRealHour;

  const chartLabels =
    simulacion && simulacion.desglose.length > 0
      ? simulacion.desglose.map((d: any, index: number) => (index % 4 === 0 ? d.hora : ''))
      : ['--'];

  const chartData =
    simulacion && simulacion.desglose.length > 0
      ? simulacion.desglose.map((d: any) => toNumber(d.costeFranja))
      : [0];

  const desgloseOrdenado =
    simulacion?.desglose?.length > 0
      ? [...simulacion.desglose].sort(
          (a: any, b: any) => toNumber(a.costeFranja) - toNumber(b.costeFranja)
        )
      : [];

  const horasBaratasReferencia = desgloseOrdenado.slice(0, Math.min(3, desgloseOrdenado.length));

  const costeBaratoMedio =
    horasBaratasReferencia.length > 0
      ? horasBaratasReferencia.reduce(
          (acc: number, item: any) => acc + toNumber(item.costeFranja),
          0
        ) / horasBaratasReferencia.length
      : 0;

  const costeActual = toNumber(simulacion?.costeTotalEuros);
  const diferenciaVsBarata = Math.max(0, costeActual - costeBaratoMedio);

  const horaBarataReferencia =
    horasBaratasReferencia.length > 0
      ? horasBaratasReferencia[0].hora
      : simulacion?.recomendacion?.horaOptima;

  const franjaActual = simulacion?.recomendacion?.franja || '';
  const esCara = franjaActual.includes('CARA');
  const esBarata = franjaActual.includes('BARATA');
  const esIntermedia = !!simulacion?.recomendacion && !esCara && !esBarata;

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.pageTitle}>Programador Diario</Text>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>1. Selecciona un electrodoméstico</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.carousel} keyboardShouldPersistTaps="handled">
              {devices.map((device) => {
                const isSelected = selectedDevice?.id === device.id;
                let icon = '⚡';
                if (device.tipo === 'lavadora') icon = '👕';
                if (device.tipo === 'lavavajillas') icon = '🍽️';
                if (device.tipo === 'horno') icon = '🍳';
                if (device.tipo === 'microondas') icon = '🍱';
                if (device.tipo === 'frigorifico') icon = '❄️';
                if (device.tipo === 'tv') icon = '📺';

                return (
                  <TouchableOpacity
                    key={device.id}
                    style={[styles.deviceCard, isSelected && styles.deviceCardSelected]}
                    onPress={() => setSelectedDevice(device)}
                  >
                    <Text style={styles.deviceIcon}>{icon}</Text>
                    <Text style={[styles.deviceName, isSelected && styles.deviceNameSelected]}>
                      {device.nombre}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>2. Elige la mejor hora</Text>

            {devices.length === 0 ? (
              <View style={{ height: 180, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 }}>
                <Text style={{ fontSize: 36, marginBottom: 10 }}>🔌</Text>
                <Text style={{ color: '#7f8c8d', textAlign: 'center', fontSize: 15, fontWeight: '500', fontStyle: 'italic' }}>
                  Crea un electrodoméstico en tu perfil para calcular la curva de precios.
                </Text>
              </View>
            ) : simulacion ? (
              <LineChart
                data={{ labels: chartLabels, datasets: [{ data: chartData }] }}
                width={screenWidth - 64}
                height={180}
                yAxisLabel="€"
                yAxisSuffix=""
                withInnerLines={false}
                chartConfig={{
                  backgroundColor: '#ffffff',
                  backgroundGradientFrom: '#ffffff',
                  backgroundGradientTo: '#ffffff',
                  decimalPlaces: 4,
                  color: (opacity = 1) => `rgba(52, 152, 219, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(44, 62, 80, ${opacity})`,
                  style: { borderRadius: 16 },
                  propsForDots: { r: '3', strokeWidth: '2', stroke: '#3498db' },
                }}
                bezier
                style={styles.chart}
              />
            ) : (
              <View style={{ height: 180, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator color="#3498db" />
                <Text style={{ color: '#bdc3c7', marginTop: 10 }}>Cargando curva...</Text>
              </View>
            )}

            <View style={styles.sliderContainer}>
              <Text style={styles.sliderLabel}>
                Franja de uso: <Text style={styles.hourValue}>{selectedHour.toString().padStart(2, '0')}:00h</Text> a{' '}
                <Text style={styles.hourValue}>{endHour.toString().padStart(2, '0')}:00h</Text>
              </Text>

              {isPastHour && (
                <Text style={styles.pastWarning}>⏳ Estás simulando una hora del pasado.</Text>
              )}

              <View style={styles.multiSliderWrapper}>
                <MultiSlider
                  values={[selectedHour, endHour]}
                  sliderLength={screenWidth - 84}
                  onValuesChange={(values) => {
                    setSelectedHour(values[0]);
                    setEditedDuracion((values[1] - values[0]).toString());
                  }}
                  min={0}
                  max={24}
                  step={1}
                  allowOverlap={false}
                  snapped={true}
                  minMarkerOverlapDistance={1}
                  selectedStyle={{ backgroundColor: '#3498db', height: 5 }}
                  unselectedStyle={{ backgroundColor: '#ecf0f1', height: 5 }}
                  markerStyle={{
                    backgroundColor: '#fff',
                    height: 24,
                    width: 24,
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor: '#3498db',
                    elevation: 3,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.2,
                    shadowRadius: 2,
                  }}
                />
              </View>

              <View style={styles.sliderTicks}>
                <Text style={styles.tickText}>00h</Text>
                <Text style={styles.tickText}>06h</Text>
                <Text style={styles.tickText}>12h</Text>
                <Text style={styles.tickText}>18h</Text>
                <Text style={styles.tickText}>24h</Text>
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>3. Ajustes y Confirmación</Text>
            <Text style={styles.mainCost}>{simulacion ? simulacion.costeTotalEuros : '0.00'} €</Text>

            {simulacion && (
              <View style={styles.detailsContainer}>
                <View style={styles.editRow}>
                  <View style={styles.editInputGroup}>
                    <Text style={styles.editLabel}>Potencia (kW)</Text>
                    <TextInput
                      style={[styles.editInput, excedePotencia && { borderColor: 'red', color: 'red' }]}
                      keyboardType="numeric"
                      value={editedPotencia}
                      onChangeText={setEditedPotencia}
                    />
                    {excedePotencia && (
                      <Text style={{ color: 'red', fontSize: 10, marginTop: 4, textAlign: 'center' }}>
                        Máximo {MAX_POTENCIA} kW
                      </Text>
                    )}
                  </View>

                  <View style={styles.editInputGroup}>
                    <Text style={styles.editLabel}>Duración (h)</Text>
                    <TextInput
                      style={[styles.editInput, { backgroundColor: '#f1f2f6', color: '#95a5a6' }]}
                      editable={false}
                      value={editedDuracion}
                    />
                  </View>
                </View>

                {simulacion.recomendacion && (
                  <View
                    style={[
                      styles.alertBox,
                      esCara ? styles.alertRed : esBarata ? styles.alertGreen : styles.alertYellow,
                    ]}
                  >
                    {esBarata && (
                      <>
                        <Text style={styles.alertTitle}>✅ Estás en una hora barata</Text>
                        <Text style={styles.alertSub}>Buen momento para usar este electrodoméstico.</Text>
                      </>
                    )}

                    {esIntermedia && (
                      <>
                        <Text style={styles.alertTitle}>🟡 Estás en una hora intermedia</Text>
                        {diferenciaVsBarata > 0.001 ? (
                          <Text style={styles.alertSub}>
                            Comparado con la media de las horas más baratas, podrías pagar aproximadamente{' '}
                            <Text style={{ fontWeight: 'bold' }}>{diferenciaVsBarata.toFixed(3)} € menos</Text> si lo
                            mueves.
                          </Text>
                        ) : (
                          <Text style={styles.alertSub}>
                            Hay franjas algo mejores, pero esta hora tampoco es mala.
                          </Text>
                        )}

                        {horaBarataReferencia !== undefined && horaBarataReferencia !== null && (
                          <Text style={styles.alertSub}>
                            💡 Prueba una franja barata alrededor de las{' '}
                            {String(horaBarataReferencia).padStart(2, '0')}:00h.
                          </Text>
                        )}
                      </>
                    )}

                    {esCara && (
                      <>
                        <Text style={styles.alertTitle}>🔴 Estás en una hora cara</Text>
                        {diferenciaVsBarata > 0.001 ? (
                          <Text style={styles.alertSub}>
                            Comparado con la media de las horas más baratas, podrías pagar aproximadamente{' '}
                            <Text style={{ fontWeight: 'bold' }}>{diferenciaVsBarata.toFixed(3)} € menos</Text> si lo
                            mueves a una franja barata.
                          </Text>
                        ) : (
                          <Text style={styles.alertSub}>
                            Te conviene moverlo a una franja barata del día.
                          </Text>
                        )}
                      </>
                    )}

                    {simulacion.recomendacion.avisoManana && (
                      <Text style={styles.alertWait}>⏳ {simulacion.recomendacion.avisoManana}</Text>
                    )}
                  </View>
                )}
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.button,
                (devices.length === 0 || excedePotencia) && { backgroundColor: '#bdc3c7' },
              ]}
              onPress={handleProgramar}
              disabled={saving || devices.length === 0 || excedePotencia}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>AÑADIR A MI PROGRAMACIÓN</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Lista con indicador lateral personalizado */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Usos Programados para Hoy</Text>
            {programaciones.length === 0 ? (
              <Text style={styles.emptyText}>
                No has programado nada aún. Añade tu primer electrodoméstico arriba.
              </Text>
            ) : (
              <ScrollWithIndicator maxHeight={220}>
                {programaciones.map((prog) => (
                  <View key={prog.id} style={styles.progItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.progName}>
                        {prog.nombre}{' '}
                        <Text style={{ fontWeight: 'normal', fontSize: 12 }}>({prog.potencia} kW)</Text>
                      </Text>
                      <Text style={styles.progTime}>
                        🕒 {prog.horaInicio}:00h - {prog.duracion}h {'  |  '}
                        <Text style={{ fontWeight: 'bold', color: '#e74c3c' }}>{prog.coste} €</Text>
                      </Text>
                    </View>
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => eliminarProgramacion(prog.id)}>
                      <Text style={{ fontSize: 20 }}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollWithIndicator>
            )}
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}



const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa' },
  scrollContainer: { padding: 16, flexGrow: 1 },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#2c3e50',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12, color: '#34495e' },
  carousel: { flexDirection: 'row', paddingBottom: 8 },
  deviceCard: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    padding: 12,
    marginRight: 10,
    alignItems: 'center',
    width: 100,
  },
  deviceCardSelected: { backgroundColor: '#ebf5fb', borderColor: '#3498db' },
  deviceIcon: { fontSize: 28, marginBottom: 8 },
  deviceName: { fontSize: 12, textAlign: 'center', color: '#7f8c8d' },
  deviceNameSelected: { color: '#2980b9', fontWeight: '600' },
  chart: { marginVertical: 8, borderRadius: 16, alignSelf: 'center' },
  sliderContainer: { marginTop: 10, paddingHorizontal: 5 },
  sliderLabel: { fontSize: 14, color: '#34495e', textAlign: 'center', marginBottom: 5 },
  hourValue: { fontWeight: 'bold', color: '#3498db', fontSize: 16 },
  pastWarning: {
    color: '#e74c3c',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 10,
    fontStyle: 'italic',
  },
  multiSliderWrapper: { alignItems: 'center' },
  sliderTicks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
    marginTop: 5,
  },
  tickText: { fontSize: 10, color: '#bdc3c7', fontWeight: 'bold' },
  mainCost: {
    fontSize: 32,
    fontWeight: '800',
    color: '#2c3e50',
    textAlign: 'center',
    marginVertical: 10,
  },
  detailsContainer: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
    paddingTop: 10,
  },
  editRow: { flexDirection: 'row', justifyContent: 'space-between' },
  editInputGroup: { flex: 1, marginHorizontal: 4 },
  editLabel: { fontSize: 11, color: '#7f8c8d', marginBottom: 4, fontWeight: '600' },
  editInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#bdc3c7',
    borderRadius: 8,
    padding: 10,
    color: '#2c3e50',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  button: {
    marginTop: 16,
    backgroundColor: '#3498db',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  alertBox: { marginTop: 16, padding: 12, borderRadius: 8, borderWidth: 1 },
  alertRed: { backgroundColor: '#fadbd8', borderColor: '#e74c3c' },
  alertGreen: { backgroundColor: '#d5f5e3', borderColor: '#2ecc71' },
  alertYellow: { backgroundColor: '#fcf3cf', borderColor: '#f1c40f' },
  alertTitle: { fontWeight: 'bold', fontSize: 14, color: '#2c3e50' },
  alertSub: { fontSize: 13, marginTop: 6, color: '#34495e', fontStyle: 'italic' },
  alertWait: {
    fontSize: 12,
    marginTop: 8,
    color: '#d35400',
    fontWeight: 'bold',
    fontStyle: 'italic',
  },
  progItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  progName: { fontWeight: 'bold', color: '#2c3e50', fontSize: 15 },
  progTime: { color: '#7f8c8d', fontSize: 13, marginTop: 4 },
  emptyText: { fontStyle: 'italic', color: '#95a5a6', textAlign: 'center', marginTop: 10 },
  deleteBtn: { padding: 10, backgroundColor: '#fdf2e9', borderRadius: 8 },
});