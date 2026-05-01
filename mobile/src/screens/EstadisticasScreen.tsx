import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
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


const formatFechaDisplay = (isoDate: string): string => {
  const [year, month, day] = isoDate.split('-');
  return `${day}-${month}-${year}`;
};

const formatDuracion = (horas: number): string => {
  const h = Math.floor(horas);
  const min = Math.round((horas - h) * 60);
  if (min === 0) return `${h}h`;
  return `${h}h ${min}min`;
};

const formatDateToISO = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

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

const getMinDate = (): Date => {
  const d = new Date();
  d.setDate(d.getDate() - 29);
  d.setHours(0, 0, 0, 0);
  return d;
};


interface PrecioHora {
  horaLocal: number;
  priceKwh: number;
}

interface DatosDia {
  precios: PrecioHora[];
  avg: number;
}

interface TramosCaro {
  horaInicio: number;
  horaFin: number;
  precioMax: number;
}

const calcularTramos = (precios: PrecioHora[], umbral: number): TramosCaro[] => {
  if (precios.length === 0) return [];
  const caras = precios
    .filter((p) => p.priceKwh > umbral)
    .sort((a, b) => a.horaLocal - b.horaLocal);
  if (caras.length === 0) return [];
  const tramos: TramosCaro[] = [];
  let tramoActual: TramosCaro = {
    horaInicio: caras[0].horaLocal,
    horaFin: caras[0].horaLocal + 1,
    precioMax: caras[0].priceKwh,
  };
  for (let i = 1; i < caras.length; i++) {
    const h = caras[i].horaLocal;
    if (h === tramoActual.horaFin) {
      tramoActual.horaFin = h + 1;
      tramoActual.precioMax = Math.max(tramoActual.precioMax, caras[i].priceKwh);
    } else {
      tramos.push({ ...tramoActual });
      tramoActual = { horaInicio: h, horaFin: h + 1, precioMax: caras[i].priceKwh };
    }
  }
  tramos.push(tramoActual);
  return tramos;
};

const cargarDatosDia = async (fecha: string): Promise<DatosDia | null> => {
  try {
    const res = await apiClient.get(`/prices/date/${fecha}`);
    const arr: any[] = res.data?.data ?? res.data ?? [];
    if (!Array.isArray(arr) || arr.length === 0) return null;
    const precios: PrecioHora[] = arr.map((p: any) => ({
      horaLocal: new Date(p.datetime).getUTCHours(),
      priceKwh: Number(p.valueKwh ?? p.priceKwh ?? 0),
    }));
    const avg = precios.reduce((s, p) => s + p.priceKwh, 0) / precios.length;
    return { precios, avg };
  } catch {
    return null;
  }
};


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
            style={[indicatorStyles.thumb, { height: thumbHeight, transform: [{ translateY: thumbTop }] }]}
          />
        </View>
      )}
    </View>
  );
};

const indicatorStyles = StyleSheet.create({
  track: { width: 4, backgroundColor: '#ecf0f1', borderRadius: 4, marginLeft: 6, marginVertical: 2, overflow: 'hidden' },
  thumb: { width: 4, backgroundColor: '#3498db', borderRadius: 4 },
});


export default function EstadisticasScreen() {
  const [periodo, setPeriodo] = useState('Diario');
  const [unidad, setUnidad] = useState('Euros');
  const [todasLasProgramaciones, setTodasLasProgramaciones] = useState<any[]>([]);
  const [precioMinimo, setPrecioMinimo] = useState(0.10);

  const [datosPorFecha, setDatosPorFecha] = useState<Map<string, DatosDia>>(new Map());
  const datosPorFechaRef = useRef<Map<string, DatosDia>>(new Map());

  const actualizarDatosFecha = useCallback((fecha: string, datos: DatosDia) => {
    datosPorFechaRef.current = new Map(datosPorFechaRef.current).set(fecha, datos);
    setDatosPorFecha(new Map(datosPorFechaRef.current));
  }, []);

  const [co2PorHora, setCo2PorHora] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [cargandoTramos, setCargandoTramos] = useState(false);
  const [mostrarDetalles, setMostrarDetalles] = useState(false);

  const [devices, setDevices] = useState<any[]>([]);
  const [filtroDispositivoId, setFiltroDispositivoId] = useState<number | null>(null);
  const [filtroFecha, setFiltroFecha] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [fechaFueraDeRango, setFechaFueraDeRango] = useState(false);

  const minDate = useMemo(() => getMinDate(), []);


  useFocusEffect(
    useCallback(() => {
      const fetchData = async () => {
        try {
          setLoading(true);

          // 1. Dispositivos
          const resDevices = await apiClient.get('/devices');
          setDevices(resDevices.data);

          // 2. Programaciones
          const resProg = await getProgramaciones();
          const todas = resProg.data.map((p: any) => ({
            id: p.id,
            nombre: p.dispositivo?.nombre ?? '—',
            dispositivoId: p.dispositivo?.id ?? null,
            horaInicio: Number(p.horaInicio),
            duracion: Number(p.duracionHoras) || 0,
            fecha: p.fecha,
            coste: parseFloat(p.costeEstimado).toFixed(4),
            kwh: (parseFloat(p.potenciaW) * parseFloat(p.duracionHoras)).toFixed(4),
          }));
          setTodasLasProgramaciones(todas);

          // 3. Dashboard de hoy
          const resDash = await apiClient.get('/dashboard/today');
          const todayISO = formatDateToISO(new Date());

          if (resDash.data?.today) {
            setPrecioMinimo(resDash.data.today.min);
            const avgServidor: number = resDash.data.today.avg;
            const todayPrices: { hour: number; priceKwh: number }[] =
              resDash.data.today.prices ?? [];
            const preciosHoy: PrecioHora[] = todayPrices.map((p) => ({
              horaLocal: p.hour,
              priceKwh: p.priceKwh,
            }));
            actualizarDatosFecha(todayISO, { precios: preciosHoy, avg: avgServidor });
          }

          // 5. Huella de carbono
          try {
            const resPrecios = await apiClient.get('/prices/today');
            const preciosArray: any[] = resPrecios.data?.data ?? [];
            const preciosConCo2 = preciosArray.filter((p: any) => p.carbonFootprint != null);
            if (preciosConCo2.length > 0) {
              const mapa: Record<number, number> = {};
              preciosConCo2.forEach((p: any) => {
                const hora = new Date(p.datetime).getUTCHours();
                mapa[hora] = Number(p.carbonFootprint);
              });
              setCo2PorHora(mapa);
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


  // ---------------------------------------------------------------------------
  // Carga todos los días del rango activo al cambiar período
  // (sin requerir programaciones — los tramos caros son independientes)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (loading) return;

    const cargarRangoPeriodo = async () => {
      const { desde, hasta } = getDateRange(periodo);
      const todayISO = formatDateToISO(new Date());

      const fechasPendientes: string[] = [];
      const cur = new Date(desde + 'T00:00:00');
      const end = new Date(hasta + 'T00:00:00');

      while (cur <= end) {
        const iso = formatDateToISO(cur);
        if (iso !== todayISO && !datosPorFechaRef.current.has(iso)) {
          fechasPendientes.push(iso);
        }
        cur.setDate(cur.getDate() + 1);
      }

      if (fechasPendientes.length === 0) return;

      setCargandoTramos(true);
      const resultados = await Promise.allSettled(
        fechasPendientes.map((f) => cargarDatosDia(f))
      );
      resultados.forEach((res, i) => {
        if (res.status === 'fulfilled' && res.value) {
          actualizarDatosFecha(fechasPendientes[i], res.value);
        }
      });
      setCargandoTramos(false);
    };

    cargarRangoPeriodo();
  }, [periodo, loading, actualizarDatosFecha]);


  // ---------------------------------------------------------------------------
  // FIX 2+3: Carga lazy al seleccionar fecha — normaliza a medianoche local
  // ---------------------------------------------------------------------------
  const handleFiltroFechaChange = useCallback(async (fecha: Date | null) => {
    if (!fecha) {
      setFiltroFecha(null);
      setFechaFueraDeRango(false);
      return;
    }
    const fechaNormalizada = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
    const iso = formatDateToISO(fechaNormalizada);
    const minISO = formatDateToISO(minDate);
    const todayISO = formatDateToISO(new Date());

    if (iso < minISO) {
      setFiltroFecha(fechaNormalizada);
      setFechaFueraDeRango(true);
      return;
    }

    setFechaFueraDeRango(false);
    setFiltroFecha(fechaNormalizada);

    if (iso === todayISO) return;
    if (datosPorFechaRef.current.has(iso)) return;

    setCargandoTramos(true);
    const datos = await cargarDatosDia(iso);
    if (datos) actualizarDatosFecha(iso, datos);
    setCargandoTramos(false);
  }, [actualizarDatosFecha, minDate]);


  // ---------------------------------------------------------------------------
  // Filtrado en memoria
  // ---------------------------------------------------------------------------
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


  // ---------------------------------------------------------------------------
  // Tramos caros
  // ---------------------------------------------------------------------------
  const tramosCaros: TramosCaro[] = useMemo(() => {
    let fechasActivas: string[];
    if (filtroFecha) {
      fechasActivas = [formatDateToISO(filtroFecha)];
    } else if (periodo === 'Diario') {
      fechasActivas = [formatDateToISO(new Date())];
    } else {
      const { desde: d, hasta: h } = getDateRange(periodo);
      fechasActivas = [...datosPorFecha.keys()].filter((f) => f >= d && f <= h);
      if (fechasActivas.length === 0) return [];
    }

    if (fechasActivas.length === 1) {
      const datos = datosPorFecha.get(fechasActivas[0]);
      if (!datos) return [];
      return calcularTramos(datos.precios, datos.avg);
    }

    const acumPrecios: Record<number, { sum: number; count: number }> = {};
    let sumAvg = 0;
    let countAvg = 0;

    fechasActivas.forEach((fecha) => {
      const datos = datosPorFecha.get(fecha);
      if (!datos) return;
      sumAvg += datos.avg;
      countAvg += 1;
      datos.precios.forEach(({ horaLocal, priceKwh }) => {
        if (!acumPrecios[horaLocal]) acumPrecios[horaLocal] = { sum: 0, count: 0 };
        acumPrecios[horaLocal].sum += priceKwh;
        acumPrecios[horaLocal].count += 1;
      });
    });

    if (countAvg === 0) return [];

    const preciosPromedio: PrecioHora[] = Object.entries(acumPrecios).map(([h, v]) => ({
      horaLocal: Number(h),
      priceKwh: v.sum / v.count,
    }));
    const avgPromedio = sumAvg / countAvg;

    return calcularTramos(preciosPromedio, avgPromedio);
  }, [filtroFecha, periodo, datosPorFecha]);


  // ---------------------------------------------------------------------------
  // Métricas
  // ---------------------------------------------------------------------------
  const consumoTotalKwh = programaciones.reduce((acc, prog) => acc + parseFloat(prog.kwh), 0);
  const costeTotalEuros = programaciones.reduce((acc, prog) => acc + parseFloat(prog.coste), 0);
  const costeOptimoEuros = consumoTotalKwh * precioMinimo;
  let ahorroPotencial = costeTotalEuros - costeOptimoEuros;
  if (ahorroPotencial < 0) ahorroPotencial = 0;

  const co2Evitado = programaciones.reduce((acc, prog) => {
    const hora = Math.floor(prog.horaInicio) % 24;
    const factorCo2 = co2PorHora[hora] ?? 0;
    const kwhProg = parseFloat(prog.kwh);
    return acc + (kwhProg * factorCo2) / 1000;
  }, 0);

  const valorPrincipal = unidad === 'Euros' ? costeTotalEuros : consumoTotalKwh;
  const valorSecundario = unidad === 'Euros' ? consumoTotalKwh : costeTotalEuros;
  const textoUnidadPrincipal = unidad === 'Euros' ? '€' : 'kWh';
  const textoUnidadSecundaria = unidad === 'Euros' ? 'kWh' : '€';

  const etiquetaTramos = filtroFecha
    ? filtroFecha.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
    : periodo === 'Diario' ? 'hoy'
    : periodo === 'Semanal' ? 'esta semana'
    : 'este mes';

  const onDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (event.type === 'set' && date) handleFiltroFechaChange(date);
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
              <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
                <Text style={styles.dateButtonIcon}>📅</Text>
                <Text style={[styles.dateButtonText, filtroFecha && styles.dateButtonTextActive]}>
                  {filtroFecha
                    ? filtroFecha.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
                    : 'Seleccionar día'}
                </Text>
              </TouchableOpacity>
              {filtroFecha && (
                <TouchableOpacity style={styles.clearBtn} onPress={() => handleFiltroFechaChange(null)}>
                  <Text style={styles.clearBtnText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {fechaFueraDeRango && (
              <View style={styles.warningBanner}>
                <Text style={styles.warningText}>
                  ⚠️ Solo hay datos disponibles para los últimos 30 días. No hay precios para esta fecha.
                </Text>
              </View>
            )}

            {showDatePicker && (
              <View>
                <DateTimePicker
                  value={filtroFecha ?? new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'calendar'}
                  minimumDate={minDate}
                  maximumDate={new Date()}
                  locale="es-ES"
                  onChange={onDateChange}
                  style={{ marginTop: 8 }}
                />
                {Platform.OS === 'ios' && (
                  <TouchableOpacity style={styles.iosCloseBtn} onPress={() => setShowDatePicker(false)}>
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

        {/* ── Tramos más caros ── */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Tramos más caros</Text>
            <Text style={styles.smallNote}>Precio alto {etiquetaTramos}</Text>
          </View>
          {fechaFueraDeRango ? (
            <Text style={styles.smallNote}>Sin datos para esta fecha (fuera de los 30 días disponibles)</Text>
          ) : cargandoTramos ? (
            <View style={styles.tramosLoadingRow}>
              <ActivityIndicator size="small" color="#3498db" />
              <Text style={[styles.smallNote, { marginLeft: 8 }]}>Cargando precios del período...</Text>
            </View>
          ) : tramosCaros.length > 0 ? (
            tramosCaros.map((tramo, index) => {
              const hi = String(tramo.horaInicio).padStart(2, '0');
              const hf = String(tramo.horaFin % 24).padStart(2, '0');
              return (
                <View key={index} style={styles.tramoRow}>
                  <View style={styles.tramoBadge}>
                    <Text style={styles.tramoBadgeText}>{hi}:00 – {hf}:00</Text>
                  </View>
                  <Text style={styles.tramoPrecio}>hasta {tramo.precioMax.toFixed(3)} €/kWh</Text>
                </View>
              );
            })
          ) : (
            <Text style={styles.smallNote}>No hay datos de precios para este período.</Text>
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
                  const startH = Math.floor(prog.horaInicio);
                  const startMin = Math.round((prog.horaInicio - startH) * 60);
                  const startStr = `${String(startH).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`;
                  const endDecimal = prog.horaInicio + prog.duracion;
                  const endH = Math.floor(endDecimal) % 24;
                  const endMin = Math.round((endDecimal % 1) * 60);
                  const endStr = `${String(endH).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;
                  const duracionStr = formatDuracion(prog.duracion);
                  const fechaDisplay = formatFechaDisplay(prog.fecha);
                  return (
                    <View key={prog.id} style={styles.detalleCard}>
                      <Text style={styles.detalleName}>{prog.nombre}</Text>
                      <Text style={styles.detalleFecha}>{fechaDisplay}</Text>
                      <View style={styles.detalleHorarioRow}>
                        <Text style={styles.detalleHorario}>🕐 {startStr} – {endStr}</Text>
                        <Text style={styles.detalleDuracion}>⏱ {duracionStr}</Text>
                      </View>
                      <View style={[styles.rowBetween, { marginTop: 6 }]}>
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
  tramosLoadingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  tramoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  tramoBadge: { backgroundColor: '#fdecea', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20, borderWidth: 1, borderColor: '#f5c6c6' },
  tramoBadgeText: { fontSize: 13, fontWeight: '700', color: '#e74c3c' },
  tramoPrecio: { fontSize: 13, color: '#7f8c8d', fontWeight: '500' },
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
  detalleName: { fontSize: 15, fontWeight: 'bold', color: '#2c3e50', marginBottom: 2 },
  detalleFecha: { fontSize: 12, color: '#95a5a6', marginBottom: 6 },
  detalleHorarioRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  detalleHorario: { fontSize: 13, color: '#34495e', fontWeight: '600' },
  detalleDuracion: { fontSize: 12, color: '#7f8c8d' },
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
  warningBanner: { marginTop: 8, backgroundColor: '#fff3cd', borderRadius: 8, padding: 10, borderLeftWidth: 3, borderLeftColor: '#f39c12' },
  warningText: { fontSize: 12, color: '#856404', lineHeight: 18 },
});