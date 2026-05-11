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
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LineChart } from 'react-native-chart-kit';
import { apiClient } from '../api/client';
import { getProgramaciones, crearProgramacion, eliminarProgramacion as eliminarProgramacionApi } from '../api/programaciones';



const screenWidth = Dimensions.get('window').width;
const MAX_POTENCIA = 999.99;



// ---------------------------------------------------------------------------
// Helpers de tiempo
// ---------------------------------------------------------------------------
const timeToDecimal = (date: Date): number =>
  date.getHours() + date.getMinutes() / 60;


const getDuracion = (start: Date, end: Date): number => {
  let diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  if (diff <= 0) diff += 24;
  return parseFloat(diff.toFixed(4));
};


const formatTime = (date: Date): string =>
  `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}h`;


const decimalToTimeStr = (decimal: number): string => {
  const normalized = decimal >= 24 ? decimal - 24 : decimal;
  const h = Math.floor(normalized);
  const m = Math.round((normalized - h) * 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}h`;
};


const formatDuracion = (horas: number): string => {
  const h = Math.floor(horas);
  const min = Math.round((horas - h) * 60);
  if (min === 0) return `${h}h`;
  return `${h}h ${min}min`;
};



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
  duracion: parseFloat(p.duracionHoras),
  horaInicio: parseFloat(p.horaInicio),
  horaFin: parseFloat(p.horaInicio) + parseFloat(p.duracionHoras),
  coste: parseFloat(p.costeEstimado).toFixed(2),
  kwh: (parseFloat(p.potenciaW) * parseFloat(p.duracionHoras)).toFixed(2),
});



export default function SimuladorScreen() {
  const currentRealHour = new Date().getHours() + new Date().getMinutes() / 60;


  const [devices, setDevices] = useState<any[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<any>(null);
  const [programaciones, setProgramaciones] = useState<any[]>([]);


  const [startTime, setStartTime] = useState<Date>(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    return d;
  });
  const [endTime, setEndTime] = useState<Date>(() => {
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return d;
  });
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);


  const [editedPotencia, setEditedPotencia] = useState('');


  const [simulacion, setSimulacion] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);


  const toNumber = (value: any) => parseFloat(String(value).replace(',', '.')) || 0;


  const potenciaIngresada = toNumber(editedPotencia);
  const excedePotencia = potenciaIngresada > MAX_POTENCIA;
  const duracionActual = getDuracion(startTime, endTime);


  const cruzaMedianoche = timeToDecimal(endTime) < timeToDecimal(startTime);


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


      const hoyStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' });


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
      if (selectedDevice.duracion) {
        const dur = parseFloat(selectedDevice.duracion);
        const newEnd = new Date(startTime.getTime() + dur * 60 * 60 * 1000);
        setEndTime(newEnd);
      }
    }
  }, [selectedDevice]);


  const calcular = async (
    disp = selectedDevice,
    start = startTime,
    end = endTime,
    pot = editedPotencia
  ) => {
    if (!disp) return;


    try {
      const duracionNum = getDuracion(start, end);
      const potenciaNum = toNumber(pot) || 0;


      if (potenciaNum === 0 || potenciaNum > MAX_POTENCIA) return;


      const resSimulador = await apiClient.post('/simulator/calculate', {
        deviceId: disp.id,
        startHour: parseFloat(timeToDecimal(start).toFixed(4)),  // ✅ FIX: redondeado
        duracion: parseFloat(duracionNum.toFixed(4)),             // ✅ FIX: redondeado
        potencia: parseFloat(potenciaNum.toFixed(2)),             // ✅ FIX: redondeado
      });


      setSimulacion(resSimulador.data);
    } catch (error) {
      console.error('Error calculando coste:', error);
    }
  };


  useEffect(() => {
    const timeoutId = setTimeout(() => {
      calcular(selectedDevice, startTime, endTime, editedPotencia);
    }, 300);


    return () => clearTimeout(timeoutId);
  }, [selectedDevice, startTime, endTime, editedPotencia]);


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

      // ✅ FIX: redondeos seguros — evitan fallos de validación por floating point de JS
      // Ejemplo: parseFloat("1.55") puede ser 1.5500000000000001 internamente.
      // toFixed(N) + parseFloat garantiza exactamente N decimales antes de enviar al backend.
      const horaInicioDecimal = parseFloat(timeToDecimal(startTime).toFixed(4));
      const horaFinDecimal    = parseFloat(timeToDecimal(endTime).toFixed(4));
      const duracionNum       = parseFloat(duracionActual.toFixed(4));
      const potenciaRed       = parseFloat(potenciaIngresada.toFixed(2));
      const costeRed          = parseFloat(parseFloat(simulacion.costeTotalEuros).toFixed(4));

      const res = await crearProgramacion({
        horaInicio:     horaInicioDecimal,
        horaFin:        horaFinDecimal,
        duracionHoras:  duracionNum,
        potenciaW:      potenciaRed,
        costeEstimado:  costeRed,
        id_dispositivo: selectedDevice.id,
      });


      const nuevaProg = {
        id: res.data.id,
        nombre: selectedDevice.nombre,
        potencia: potenciaRed.toString(),
        duracion: duracionNum,
        horaInicio: horaInicioDecimal,
        horaFin: horaInicioDecimal + duracionNum,
        coste: costeRed.toFixed(2),
        kwh: (potenciaRed * duracionNum).toFixed(2),
      };


      setProgramaciones((prev) => [...prev, nuevaProg]);


      Alert.alert('¡Añadido! ✅', `${selectedDevice.nombre} programado a las ${formatTime(startTime)}.`);
    } catch (error: any) {
      // ✅ FIX: log del error real para ver exactamente qué campo falla en el backend
      console.error('Error guardando programación:', JSON.stringify(error?.response?.data ?? error));
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


  const isPastHour = timeToDecimal(startTime) < currentRealHour;


  const chartLabels =
    simulacion && simulacion.desglose.length > 0
      ? simulacion.desglose.map((d: any, index: number) => (index % 4 === 0 ? d.hora : ''))
      : ['--'];


  const chartData =
    simulacion && simulacion.desglose.length > 0
      ? simulacion.desglose.map((d: any) => toNumber(d.costeFranja))
      : [0];


  const franjaActual = simulacion?.recomendacion?.franja || '';
  const esCara = franjaActual.includes('CARA');
  const esBarata = franjaActual.includes('BARATA');
  const esIntermedia = !!simulacion?.recomendacion && !esCara && !esBarata;


  const etiquetaFranja = esCara ? 'cara' : esBarata ? 'barata' : 'intermedia';


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


          {/* ── Card 1: Selección de dispositivo ── */}
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


          {/* ── Card 2: Curva de precios + Time pickers ── */}
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


            {/* Time pickers */}
            <View style={styles.timePickerContainer}>
              <Text style={styles.sliderLabel}>
                Franja:{' '}
                <Text style={styles.hourValue}>{formatTime(startTime)}</Text>
                {' '}→{' '}
                <Text style={styles.hourValue}>{formatTime(endTime)}</Text>
                {'  '}
                <Text style={{ fontSize: 12, color: '#95a5a6' }}>({formatDuracion(duracionActual)})</Text>
              </Text>


              {isPastHour && (
                <View style={styles.pastWarningBox}>
                  <Text style={styles.pastWarning}>
                    🕰️ El periodo programado incluye horas que ya han pasado.
                  </Text>
                  <Text style={styles.pastWarningSub}>
                    Puedes continuar, y el sistema contabilizará el consumo de esas horas previas.
                  </Text>
                </View>
              )}


              {cruzaMedianoche && (
                <View style={styles.midnightWarningBox}>
                  <Text style={styles.midnightWarning}>
                    🌙 Esta programación cruza la medianoche.
                  </Text>
                  <Text style={styles.midnightWarningSub}>
                    Las horas tras las 00:00 se calculan con los precios de mañana.
                    {simulacion?.recomendacion?.avisoManana
                      ? ' ⏳ ' + simulacion.recomendacion.avisoManana
                      : ''}
                  </Text>
                </View>
              )}


              <View style={styles.timePickerRow}>
                <TouchableOpacity
                  style={styles.timePickerBtn}
                  onPress={() => setShowStartPicker(true)}
                >
                  <Text style={styles.timePickerLabel}>🕐 Inicio</Text>
                  <Text style={styles.timePickerValue}>{formatTime(startTime)}</Text>
                </TouchableOpacity>


                <TouchableOpacity
                  style={styles.timePickerBtn}
                  onPress={() => setShowEndPicker(true)}
                >
                  <Text style={styles.timePickerLabel}>🕑 Fin</Text>
                  <Text style={styles.timePickerValue}>{formatTime(endTime)}</Text>
                </TouchableOpacity>
              </View>


              {showStartPicker && (
                <DateTimePicker
                  value={startTime}
                  mode="time"
                  is24Hour={true}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  minuteInterval={5}
                  onChange={(_, selected) => {
                    setShowStartPicker(false);
                    if (selected) {
                      if (selected >= endTime) {
                        const newEnd = new Date(selected.getTime() + 60 * 60 * 1000);
                        setEndTime(newEnd);
                      }
                      setStartTime(selected);
                    }
                  }}
                />
              )}


              {showEndPicker && (
                <DateTimePicker
                  value={endTime}
                  mode="time"
                  is24Hour={true}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  minuteInterval={5}
                  onChange={(_, selected) => {
                    setShowEndPicker(false);
                    if (selected) {
                      setEndTime(selected);
                    }
                  }}
                />
              )}
            </View>
          </View>


          {/* ── Card 3: Ajustes y confirmación ── */}
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
                    <Text style={styles.editLabel}>Duración</Text>
                    <TextInput
                      style={[styles.editInput, { backgroundColor: '#f1f2f6', color: '#95a5a6' }]}
                      editable={false}
                      value={formatDuracion(duracionActual)}
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
                    {esBarata && <Text style={styles.alertTitle}>✅ Hora barata</Text>}
                    {esIntermedia && <Text style={styles.alertTitle}>🟡 Hora intermedia</Text>}
                    {esCara && <Text style={styles.alertTitle}>🔴 Hora cara</Text>}


                    {duracionActual > 1 && (
                      <Text style={styles.alertSub}>
                        La media del precio de esta franja es{' '}
                        <Text style={{ fontWeight: 'bold' }}>{etiquetaFranja}</Text>{' '}
                        comparada con el precio del día.
                      </Text>
                    )}


                    {simulacion.recomendacion.avisoManana && !cruzaMedianoche && (
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


          {/* ── Card 4: Lista de programaciones ── */}
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
                      <View style={styles.progHorarioRow}>
                        <Text style={styles.progTime}>
                          🕐 {decimalToTimeStr(prog.horaInicio)} – {decimalToTimeStr(prog.horaFin)}
                          {prog.horaFin >= 24 ? '  🌙' : ''}
                        </Text>
                        <Text style={styles.progDuracion}>⏱ {formatDuracion(prog.duracion)}</Text>
                      </View>
                      <Text style={[styles.progTime, { marginTop: 2 }]}>
                        <Text style={{ fontWeight: 'bold', color: '#e74c3c' }}>{prog.coste} €</Text>
                        {'  ·  '}{prog.kwh} kWh
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
  timePickerContainer: { marginTop: 12, paddingHorizontal: 5 },
  sliderLabel: { fontSize: 14, color: '#34495e', textAlign: 'center', marginBottom: 10 },
  hourValue: { fontWeight: 'bold', color: '#3498db', fontSize: 15 },
  pastWarningBox: {
    backgroundColor: '#fdf2e9',
    borderLeftWidth: 3,
    borderLeftColor: '#e67e22',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  pastWarning: {
    color: '#d35400',
    fontSize: 13,
    fontWeight: '600',
  },
  pastWarningSub: {
    color: '#e67e22',
    fontSize: 11,
    marginTop: 2,
    fontStyle: 'italic',
  },
  midnightWarningBox: {
    backgroundColor: '#eaf0fb',
    borderLeftWidth: 3,
    borderLeftColor: '#2980b9',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  midnightWarning: {
    color: '#1a5276',
    fontSize: 13,
    fontWeight: '600',
  },
  midnightWarningSub: {
    color: '#2980b9',
    fontSize: 11,
    marginTop: 2,
    fontStyle: 'italic',
  },
  timePickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 4,
  },
  timePickerBtn: {
    backgroundColor: '#ebf5fb',
    borderWidth: 1.5,
    borderColor: '#3498db',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    width: '44%',
  },
  timePickerLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    fontWeight: '600',
    marginBottom: 4,
  },
  timePickerValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2980b9',
  },
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
  progHorarioRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  progTime: { color: '#7f8c8d', fontSize: 13 },
  progDuracion: { fontSize: 12, color: '#7f8c8d' },
  emptyText: { fontStyle: 'italic', color: '#95a5a6', textAlign: 'center', marginTop: 10 },
  deleteBtn: { padding: 10, backgroundColor: '#fdf2e9', borderRadius: 8 },
});