import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { apiClient } from '../api/client';
import { getProgramaciones } from '../api/programaciones';


// ---------------------------------------------------------------------------
// Componente: ScrollView con indicador lateral personalizado
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
    marginLeft: 6,
    marginVertical: 2,
    overflow: 'hidden',
  },
  thumb: {
    width: 4,
    backgroundColor: '#3498db',
    borderRadius: 4,
  },
});


// ---------------------------------------------------------------------------
// Helper: rango de fechas por período
// ---------------------------------------------------------------------------
const formatDateToISO = (date: Date): string => date.toISOString().split('T')[0];

const getDateRange = (periodo: string): { desde: string; hasta: string } => {
  const hoy = new Date();
  const hasta = formatDateToISO(hoy);

  if (periodo === 'Diario') {
    return { desde: hasta, hasta };
  } else if (periodo === 'Semanal') {
    const diaSemana = hoy.getDay();
    const diasDesdeElLunes = diaSemana === 0 ? 6 : diaSemana - 1;
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() - diasDesdeElLunes);
    return { desde: formatDateToISO(lunes), hasta };
  } else {
    const primero = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    return { desde: formatDateToISO(primero), hasta };
  }
};


// ---------------------------------------------------------------------------
// Pantalla principal
// ---------------------------------------------------------------------------
export default function EstadisticasScreen() {
  const [periodo, setPeriodo] = useState('Diario');
  const [unidad, setUnidad] = useState('Euros');
  const [todasLasProgramaciones, setTodasLasProgramaciones] = useState<any[]>([]);
  const [precioMedio, setPrecioMedio] = useState(0.15);
  const [precioMinimo, setPrecioMinimo] = useState(0.10);
  
  // NUEVOS ESTADOS PARA DATOS DINÁMICOS
  const [horasPico, setHorasPico] = useState<any[]>([]);
  const [huellaCarbonoMedia, setHuellaCarbonoMedia] = useState<number>(250); // 250 gCO2eq/kWh por defecto

  const [loading, setLoading] = useState(true);
  const [mostrarDetalles, setMostrarDetalles] = useState(false);

  // Filtros
  const [devices, setDevices] = useState<any[]>([]);
  const [filtroDispositivoId, setFiltroDispositivoId] = useState<number | null>(null);
  const [filtroFecha, setFiltroFecha] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);


  useFocusEffect(
    useCallback(() => {
      const fetchData = async () => {
        try {
          setLoading(true);

          // 1. Obtener dispositivos
          const resDevices = await apiClient.get('/devices');
          setDevices(resDevices.data);

          // 2. Obtener programaciones
          const resProg = await getProgramaciones();
          const todas = resProg.data.map((p: any) => ({
            id: p.id,
            nombre: p.dispositivo?.nombre ?? '—',
            dispositivoId: p.dispositivo?.id ?? null,
            horaInicio: Number(p.horaInicio),
            duracion: Number(p.duracionHoras) || 0, // Extraemos la duración para calcular el fin
            fecha: p.fecha,
            coste: parseFloat(p.costeEstimado).toFixed(4),
            kwh: (parseFloat(p.potenciaW) * parseFloat(p.duracionHoras)).toFixed(4),
          }));
          setTodasLasProgramaciones(todas);

          // 3. Obtener Dashboard general (precios)
          const resDash = await apiClient.get('/dashboard/today');
          if (resDash.data?.today) {
            setPrecioMedio(resDash.data.today.avg);
            setPrecioMinimo(resDash.data.today.min);
          }

          // 4. Obtener Horas Pico Dinámicas
          try {
            const resPico = await apiClient.get('/prices/horas-pico');
            if (resPico.data) {
              setHorasPico(resPico.data);
            }
          } catch (e) {
            console.warn('No se pudieron cargar las horas pico');
          }

          // 5. Obtener Huella de Carbono del día
          try {
            const resPrecios = await apiClient.get('/prices/today');
            if (resPrecios.data && resPrecios.data.length > 0) {
              const preciosConCo2 = resPrecios.data.filter((p: any) => p.carbonFootprint != null);
              if (preciosConCo2.length > 0) {
                const mediaCo2 = preciosConCo2.reduce((acc: number, p: any) => acc + Number(p.carbonFootprint), 0) / preciosConCo2.length;
                setHuellaCarbonoMedia(mediaCo2);
              }
            }
          } catch (e) {
            console.warn('No se pudo cargar la huella de carbono');
          }

        } catch (error) {
          console.error('Error cargando estadísticas:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchData();
    }, [])
  );


  // Filtrado en memoria
  const { desde, hasta } = getDateRange(periodo);
  let programaciones = todasLasProgramaciones.filter(
    (p) => p.fecha >= desde && p.fecha <= hasta
  );
  if (filtroFecha) {
    const iso = formatDateToISO(filtroFecha);
    programaciones = programaciones.filter((p) => p.fecha === iso);
  }
  if (filtroDispositivoId !== null) {
    programaciones = programaciones.filter((p) => p.dispositivoId === filtroDispositivoId);
  }


  const consumoTotalKwh = programaciones.reduce((acc, prog) => acc + parseFloat(prog.kwh), 0);
  const costeTotalEuros = programaciones.reduce((acc, prog) => acc + parseFloat(prog.coste), 0);
  const costeOptimoEuros = consumoTotalKwh * precioMinimo;
  
  let ahorroPotencial = costeTotalEuros - costeOptimoEuros;
  if (ahorroPotencial < 0) ahorroPotencial = 0;

  // CÁLCULO DE HUELLA DE CARBONO DINÁMICO (convertido de gramos a kg)
  const co2Evitado = (consumoTotalKwh * huellaCarbonoMedia) / 1000;

  const valorPrincipal = unidad === 'Euros' ? costeTotalEuros : consumoTotalKwh;
  const valorSecundario = unidad === 'Euros' ? consumoTotalKwh : costeTotalEuros;
  const textoUnidadPrincipal = unidad === 'Euros' ? '€' : 'kWh';
  const textoUnidadSecundaria = unidad === 'Euros' ? 'kWh' : '€';


  const onDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (event.type === 'set' && date) {
      setFiltroFecha(date);
    }
  };


  if (loading && todasLasProgramaciones.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={{ marginTop: 10, color: '#7f8c8d' }}>Calculando estadísticas...</Text>
      </SafeAreaView>
    );
  }


  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>EcoWatt - Estadísticas</Text>

        {/* ── Tarjeta de filtros ── */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.label}>Período</Text>
              <View style={styles.segmentedControl}>
                {['Diario', 'Semanal', 'Mensual'].map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.segmentButton, periodo === p && styles.segmentButtonActive]}
                    onPress={() => setPeriodo(p)}
                  >
                    <Text style={[styles.segmentText, periodo === p && styles.segmentTextActive]}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View>
              <Text style={styles.label}>Unidad</Text>
              <View style={styles.segmentedControl}>
                {['KWh', 'Euros'].map((u) => (
                  <TouchableOpacity
                    key={u}
                    style={[styles.segmentButton, unidad === u && styles.segmentButtonActive]}
                    onPress={() => setUnidad(u)}
                  >
                    <Text style={[styles.segmentText, unidad === u && styles.segmentTextActive]}>
                      {u === 'Euros' ? 'Euros €' : u}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {devices.length > 0 && (
            <View style={{ marginTop: 14 }}>
              <Text style={styles.label}>Electrodoméstico</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TouchableOpacity
                  style={[styles.filterChip, filtroDispositivoId === null && styles.filterChipActive]}
                  onPress={() => setFiltroDispositivoId(null)}
                >
                  <Text style={[styles.filterChipText, filtroDispositivoId === null && styles.filterChipTextActive]}>
                    Todos
                  </Text>
                </TouchableOpacity>
                {devices.map((d) => (
                  <TouchableOpacity
                    key={d.id}
                    style={[styles.filterChip, filtroDispositivoId === d.id && styles.filterChipActive]}
                    onPress={() => setFiltroDispositivoId(filtroDispositivoId === d.id ? null : d.id)}
                  >
                    <Text style={[styles.filterChipText, filtroDispositivoId === d.id && styles.filterChipTextActive]}>
                      {d.nombre}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={{ marginTop: 14 }}>
            <Text style={styles.label}>Fecha exacta (opcional)</Text>
            <View style={styles.dateRow}>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dateButtonIcon}>📅</Text>
                <Text style={[styles.dateButtonText, filtroFecha && styles.dateButtonTextActive]}>
                  {filtroFecha
                    ? filtroFecha.toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })
                    : 'Seleccionar día'}
                </Text>
              </TouchableOpacity>

              {filtroFecha && (
                <TouchableOpacity style={styles.clearBtn} onPress={() => setFiltroFecha(null)}>
                  <Text style={styles.clearBtnText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {showDatePicker && (
              <View>
                <DateTimePicker
                  value={filtroFecha ?? new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'calendar'}
                  maximumDate={new Date()}
                  locale="es-ES"
                  onChange={onDateChange}
                  style={{ marginTop: 8 }}
                />
                {Platform.OS === 'ios' && (
                  <TouchableOpacity
                    style={styles.iosCloseBtn}
                    onPress={() => setShowDatePicker(false)}
                  >
                    <Text style={styles.iosCloseBtnText}>Confirmar fecha</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>


        {/* ── Consumo total ── */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Consumo Total Programado</Text>
          <Text style={styles.subtitle}>
            Total en Período {periodo} ({unidad === 'Euros' ? 'Euros €' : 'kWh'})
          </Text>
          <Text style={styles.mainValue}>
            {valorPrincipal.toFixed(2)} {textoUnidadPrincipal}
          </Text>
          <Text style={styles.subValue}>
            (Equivalente a {valorSecundario.toFixed(2)} {textoUnidadSecundaria})
          </Text>
        </View>


        {/* ── Horas pico DINÁMICAS ── */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Horas Pico de Uso de la Red</Text>
            <Text style={styles.smallNote}>Franjas más caras hoy</Text>
          </View>
          
          {horasPico.length > 0 ? (
            horasPico.map((pico, index) => {
              const date = new Date(pico.datetime);
              const horaInicio = date.getHours().toString().padStart(2, '0');
              const horaFin = (date.getHours() + 1).toString().padStart(2, '0');
              return (
                <Text key={index} style={styles.peakText}>
                  {index + 1}. {horaInicio}:00h - {horaFin}:00h ({Number(pico.valueKwh).toFixed(3)} €/kWh)
                </Text>
              );
            })
          ) : (
            <Text style={styles.smallNote}>No se han podido cargar las horas pico.</Text>
          )}
        </View>


        {/* ── Comparación ahorro ── */}
        <Text style={styles.sectionTitleOutside}>Comparación de Ahorro (Euros €)</Text>
        <View style={styles.rowBetween}>
          <View style={[styles.card, styles.halfCard]}>
            <Text style={styles.cardHeader}>Coste Programado</Text>
            <Text style={[styles.mainValue, { color: '#e74c3c', fontSize: 24 }]}>
              {costeTotalEuros.toFixed(2)} €
            </Text>
            <Text style={styles.cardDescription}>Coste exacto de los electrodomésticos en tu lista.</Text>
          </View>
          <View style={[styles.card, styles.halfCard]}>
            <Text style={styles.cardHeader}>Ahorro Potencial</Text>
            <Text style={[styles.mainValue, { color: '#2ecc71', fontSize: 24 }]}>
              + {ahorroPotencial.toFixed(2)} €
            </Text>
            <Text style={styles.cardDescription}>Si usaras esta misma programación en la mejor hora posible.</Text>
          </View>
        </View>


        {/* ── Sostenibilidad ── */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Huella de Carbono y Sostenibilidad</Text>
          <View style={styles.ecoRow}>
            <Text style={styles.treeIcon}>🌳</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.ecoTitle}>{co2Evitado.toFixed(2)} kg CO2e</Text>
              <Text style={styles.ecoDescription}>
                Asociados a tu consumo programado (basado en datos reales de red). Usar energía en horas valle reduce este impacto al usar renovables.
              </Text>
            </View>
          </View>
        </View>


        {/* ── Desglose por aparato ── */}
        <TouchableOpacity style={styles.primaryButton} onPress={() => setMostrarDetalles(!mostrarDetalles)}>
          <Text style={styles.buttonText}>
            {mostrarDetalles ? 'OCULTAR DESGLOSE' : 'VER DESGLOSE POR APARATO'}
          </Text>
        </TouchableOpacity>

        {mostrarDetalles && (
          <View style={styles.detallesContainer}>
            <Text style={styles.sectionTitleOutside}>Desglose de la Lista</Text>

            {programaciones.length === 0 ? (
              <Text style={styles.smallNote}>
                {filtroDispositivoId !== null || filtroFecha
                  ? 'No hay programaciones con los filtros aplicados.'
                  : 'No tienes usos programados. Ve al Simulador para empezar.'}
              </Text>
            ) : (
              <ScrollWithIndicator maxHeight={320}>
                {programaciones.map((prog) => {
                  // CÁLCULO DE HORA DE FIN
                  const totalTime = prog.horaInicio + prog.duracion;
                  const endHour = Math.floor(totalTime) % 24; // Módulo 24 por si cruza la medianoche
                  const endMinutes = Math.round((totalTime % 1) * 60);

                  const startH = String(prog.horaInicio).padStart(2, '0');
                  const endH = String(endHour).padStart(2, '0');
                  const endM = String(endMinutes).padStart(2, '0');

                  return (
                    <View key={prog.id} style={styles.detalleCard}>
                      <Text style={styles.detalleName}>
                        {prog.nombre}{' '}
                        <Text style={{ fontWeight: 'normal', fontSize: 13 }}>
                          ({prog.fecha} · {startH}:00h - {endH}:{endM}h)
                        </Text>
                      </Text>
                      <View style={styles.rowBetween}>
                        <Text style={styles.detalleInfo}>{parseFloat(prog.kwh).toFixed(2)} kWh</Text>
                        <Text style={styles.detalleCoste}>{parseFloat(prog.coste).toFixed(2)} €</Text>
                      </View>
                    </View>
                  );
                })}
              </ScrollWithIndicator>
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa' },
  scrollContainer: { padding: 16 },
  pageTitle: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, color: '#2c3e50' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3 },
  halfCard: { width: '48%', padding: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8, color: '#2c3e50' },
  sectionTitleOutside: { fontSize: 16, fontWeight: '700', marginBottom: 12, color: '#2c3e50', marginLeft: 4, marginTop: 16 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  label: { fontSize: 12, fontWeight: '600', color: '#7f8c8d', marginBottom: 6 },
  segmentedControl: { flexDirection: 'row', backgroundColor: '#ecf0f1', borderRadius: 8, padding: 2 },
  segmentButton: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6 },
  segmentButtonActive: { backgroundColor: '#3498db' },
  segmentText: { fontSize: 12, color: '#7f8c8d', fontWeight: '600' },
  segmentTextActive: { color: '#fff' },
  subtitle: { fontSize: 14, color: '#7f8c8d', textAlign: 'center', marginBottom: 4 },
  mainValue: { fontSize: 32, fontWeight: '800', color: '#2c3e50', textAlign: 'center', marginVertical: 4 },
  subValue: { fontSize: 13, color: '#95a5a6', textAlign: 'center' },
  smallNote: { fontSize: 12, color: '#95a5a6' },
  peakText: { fontSize: 14, color: '#34495e', marginBottom: 6, fontWeight: '500' },
  cardHeader: { fontSize: 13, fontWeight: '600', color: '#7f8c8d', textAlign: 'center', marginBottom: 8 },
  cardDescription: { fontSize: 11, color: '#95a5a6', textAlign: 'center', marginTop: 8 },
  ecoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  treeIcon: { fontSize: 40, marginRight: 16 },
  ecoTitle: { fontSize: 18, fontWeight: 'bold', color: '#27ae60', marginBottom: 4 },
  ecoDescription: { fontSize: 12, color: '#7f8c8d', lineHeight: 18 },
  primaryButton: { backgroundColor: '#2c3e50', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  detallesContainer: { marginTop: 10 },
  detalleCard: { backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 8, borderLeftWidth: 4, borderLeftColor: '#3498db', elevation: 1 },
  detalleName: { fontSize: 15, fontWeight: 'bold', color: '#2c3e50', marginBottom: 4 },
  detalleInfo: { fontSize: 14, color: '#7f8c8d' },
  detalleCoste: { fontSize: 15, fontWeight: 'bold', color: '#e74c3c' },
  filterChip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, backgroundColor: '#ecf0f1', marginRight: 8, borderWidth: 1, borderColor: '#dde1e7' },
  filterChipActive: { backgroundColor: '#3498db', borderColor: '#2980b9' },
  filterChipText: { fontSize: 12, fontWeight: '600', color: '#7f8c8d' },
  filterChipTextActive: { color: '#fff' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateButton: { flex: 1, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#bdc3c7', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: '#fafafa', gap: 8 },
  dateButtonIcon: { fontSize: 16 },
  dateButtonText: { fontSize: 13, color: '#bdc3c7', fontWeight: '500' },
  dateButtonTextActive: { color: '#2c3e50' },
  clearBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#fdecea', justifyContent: 'center', alignItems: 'center' },
  clearBtnText: { color: '#e74c3c', fontWeight: '700', fontSize: 14 },
  iosCloseBtn: { marginTop: 10, backgroundColor: '#3498db', borderRadius: 8, padding: 12, alignItems: 'center' },
  iosCloseBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});