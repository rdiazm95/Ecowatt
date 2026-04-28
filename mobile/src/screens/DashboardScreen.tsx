import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  BackHandler,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LineChart } from 'react-native-chart-kit';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { fetchTodayDashboard, TodayDashboard } from '../api/dashboard';
import { logout } from '../api/auth';

const screenWidth = Dimensions.get('window').width;

function getPriceLevelColor(priceKwh: number, avg: number): string {
  if (priceKwh <= avg * 0.9) return '#2ecc71';
  if (priceKwh <= avg * 1.1) return '#f1c40f';
  return '#e74c3c';
}

const App = () => {
  const navigation = useNavigation<any>();
  const [data, setData] = useState<TodayDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedDay, setSelectedDay] = useState<'today' | 'tomorrow'>('today');
  const [viewMode, setViewMode] = useState<'chart' | 'hours'>('chart');

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        try {
          const dashboard = await fetchTodayDashboard();
          setData(dashboard);
          setError(null);
        } catch (e) {
          console.error(e);
          setError('No se pudo cargar el dashboard');
        } finally {
          setLoading(false);
        }
      };
      load();
    }, [])
  );

  // NUEVO: Solución para BackHandler en versiones modernas de React Native
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        Alert.alert(
          'Cerrar sesión',
          '¿Estás seguro de que quieres volver a la pantalla de inicio y cerrar sesión?',
          [
            { text: 'Cancelar', style: 'cancel', onPress: () => {} },
            { 
              text: 'Sí, salir', 
              style: 'destructive',
              onPress: async () => {
                await logout(); 
                navigation.replace('Welcome'); 
              } 
            }
          ]
        );
        return true; 
      };

      // Guardamos la suscripción
      const backHandlerSubscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      
      // Y usamos .remove() en lugar de removeEventListener
      return () => backHandlerSubscription.remove();
    }, [navigation])
  );

  if (loading && !data) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Cargando datos de la luz...</Text>
      </SafeAreaView>
    );
  }

  if (error && !data) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.error}>{error ?? 'Error desconocido'}</Text>
      </SafeAreaView>
    );
  }

  const now = new Date();
  const currentHour = now.getHours();

  if (!data) return null;

  const todayData = data.today;
  const tomorrowData = data.tomorrow;

  const tomorrowAvailable = tomorrowData.hasPrices && tomorrowData.prices.length > 0;
  const tomorrowUnlockedByTime = currentHour >= 21;

  const showingTomorrow = selectedDay === 'tomorrow';

  const selectedPrices = showingTomorrow && tomorrowAvailable
    ? tomorrowData.prices
    : todayData.prices;

  const selectedAvg = showingTomorrow && tomorrowAvailable
    ? Number(tomorrowData.avg ?? 0)
    : todayData.avg;

  const selectedMin = showingTomorrow && tomorrowAvailable
    ? Number(tomorrowData.min ?? 0)
    : todayData.min;

  const selectedMax = showingTomorrow && tomorrowAvailable
    ? Number(tomorrowData.max ?? 0)
    : todayData.max;

  const current = data.current;

  const chartData = {
    labels: selectedPrices.map((p) =>
      p.hour % 4 === 0 ? `${p.hour.toString().padStart(2, '0')}h` : ''
    ),
    datasets: [
      {
        data: selectedPrices.map((p) => p.priceKwh),
        color: (opacity = 1) => `rgba(52, 152, 219, ${opacity})`,
        strokeWidth: 3,
      },
    ],
  };

  const noTomorrowDataMessage = tomorrowUnlockedByTime
    ? 'Los precios de mañana todavía no están disponibles.'
    : 'Los precios de mañana no estarán disponibles hasta las 21:00.';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>

        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerDate}>
              {now.toLocaleDateString('es-ES', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </Text>
            <Text style={styles.headerSub}>Precio de la electricidad</Text>
          </View>
          <View style={[
            styles.headerBadge,
            showingTomorrow ? styles.headerBadgeTomorrow : styles.headerBadgeToday,
          ]}>
            <Text style={[
              styles.headerBadgeText,
              showingTomorrow ? styles.headerBadgeTextTomorrow : styles.headerBadgeTextToday,
            ]}>
              {showingTomorrow ? 'Mañana' : 'Hoy'}
            </Text>
          </View>
        </View>

        <View style={styles.segmentWrapper}>
          <View style={styles.segment}>
            <TouchableOpacity
              style={[
                styles.segmentButton,
                selectedDay === 'today' && styles.segmentButtonActive,
              ]}
              onPress={() => setSelectedDay('today')}
            >
              <Text
                style={[
                  styles.segmentButtonText,
                  selectedDay === 'today' && styles.segmentButtonTextActive,
                ]}
              >
                Hoy
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.segmentButton,
                selectedDay === 'tomorrow' && styles.segmentButtonActive,
              ]}
              onPress={() => setSelectedDay('tomorrow')}
            >
              <Text
                style={[
                  styles.segmentButtonText,
                  selectedDay === 'tomorrow' && styles.segmentButtonTextActive,
                ]}
              >
                Mañana
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            {showingTomorrow ? 'Estado de mañana' : 'Precio actual'}
          </Text>

          {!showingTomorrow ? (
            current ? (
              <>
                <Text style={styles.currentPrice}>
                  {current.priceKwh.toFixed(4)} €/kWh
                </Text>
                <Text style={styles.currentMwh}>
                  ({current.priceMwh.toFixed(2)} €/MWh)
                </Text>
                <View
                  style={[
                    styles.semaphore,
                    { backgroundColor: getPriceLevelColor(current.priceKwh, todayData.avg) },
                  ]}
                />
              </>
            ) : (
              <Text style={styles.infoText}>No hay precio actual disponible.</Text>
            )
          ) : tomorrowAvailable ? (
            <>
              <Text style={styles.currentPrice}>
                {selectedAvg.toFixed(4)} €/kWh
              </Text>
              <Text style={styles.currentMwh}>
                Media prevista para mañana
              </Text>
              <View
                style={[
                  styles.semaphore,
                  { backgroundColor: getPriceLevelColor(selectedAvg, selectedAvg) },
                ]}
              />
            </>
          ) : (
            <>
              <Text style={styles.infoText}>{noTomorrowDataMessage}</Text>
              <Text style={styles.tomorrowText}>{tomorrowData.message}</Text>
            </>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.sectionTitle}>
              {showingTomorrow ? 'Precios de mañana' : 'Precios de hoy'}
            </Text>

            <View style={styles.headerControls}>
              <View style={styles.smallSegment}>
                <TouchableOpacity
                  style={[
                    styles.smallSegmentButton,
                    viewMode === 'chart' && styles.smallSegmentButtonActive,
                  ]}
                  onPress={() => setViewMode('chart')}
                >
                  <Text
                    style={[
                      styles.smallSegmentText,
                      viewMode === 'chart' && styles.smallSegmentTextActive,
                    ]}
                  >
                    Gráfica
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.smallSegmentButton,
                    viewMode === 'hours' && styles.smallSegmentButtonActive,
                  ]}
                  onPress={() => setViewMode('hours')}
                >
                  <Text
                    style={[
                      styles.smallSegmentText,
                      viewMode === 'hours' && styles.smallSegmentTextActive,
                    ]}
                  >
                    Precios hora
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.historyBtn}
                onPress={() => navigation.navigate('History')}
              >
                <Ionicons name="bar-chart-outline" size={14} color="#3498db" />
                <Text style={styles.historyBtnText}>Histórico</Text>
              </TouchableOpacity>
            </View>
          </View>

          {showingTomorrow && !tomorrowAvailable ? (
            <View style={styles.noticeBox}>
              <Text style={styles.noticeText}>{noTomorrowDataMessage}</Text>
            </View>
          ) : viewMode === 'chart' ? (
            <LineChart
              data={chartData}
              width={screenWidth - 64}
              height={250}
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
                propsForDots: {
                  r: '3',
                  strokeWidth: '2',
                  stroke: '#3498db',
                },
              }}
              bezier
              style={styles.chart}
            />
          ) : (
            <View>
              {selectedPrices.map((p) => (
                <View key={p.hour} style={styles.hourRow}>
                  <View style={styles.hourLeft}>
                    <View
                      style={[
                        styles.hourDot,
                        { backgroundColor: getPriceLevelColor(p.priceKwh, selectedAvg) },
                      ]}
                    />
                    <Text style={styles.hourLabel}>
                      {String(p.hour).padStart(2, '0')}:00 -{' '}
                      {String((p.hour + 1) % 24).padStart(2, '0')}:00
                    </Text>
                  </View>
                  <Text style={styles.hourPrice}>{p.priceKwh.toFixed(4)} €/kWh</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Resumen {showingTomorrow ? 'de mañana' : 'del día'}
          </Text>

          {showingTomorrow && !tomorrowAvailable ? (
            <Text style={styles.infoText}>{noTomorrowDataMessage}</Text>
          ) : (
            <>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Mínimo:</Text>
                <Text style={[styles.summaryValue, { color: '#2ecc71' }]}>
                  {selectedMin.toFixed(4)} €/kWh
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Medio:</Text>
                <Text style={[styles.summaryValue, { color: '#f1c40f' }]}>
                  {selectedAvg.toFixed(4)} €/kWh
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Máximo:</Text>
                <Text style={[styles.summaryValue, { color: '#e74c3c' }]}>
                  {selectedMax.toFixed(4)} €/kWh
                </Text>
              </View>
            </>
          )}

          <Text style={styles.tomorrowText}>{tomorrowData.message}</Text>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa' },
  scrollContainer: { padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },

  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerDate: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2c3e50',
    textTransform: 'capitalize',
  },
  headerSub: {
    fontSize: 13,
    color: '#95a5a6',
    marginTop: 2,
    fontWeight: '500',
  },
  headerBadge: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  headerBadgeToday: {
    backgroundColor: '#eaf4fb',
  },
  headerBadgeTomorrow: {
    backgroundColor: '#fef9e7',
  },
  headerBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  headerBadgeTextToday: {
    color: '#3498db',
  },
  headerBadgeTextTomorrow: {
    color: '#d4a017',
  },

  segmentWrapper: { marginBottom: 16 },
  segment: {
    flexDirection: 'row',
    backgroundColor: '#eaf1f7',
    borderRadius: 12,
    padding: 4,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  segmentButtonActive: { backgroundColor: '#3498db' },
  segmentButtonText: { color: '#5d6d7e', fontWeight: '700' },
  segmentButtonTextActive: { color: '#fff' },
  smallSegment: {
    flexDirection: 'row',
    backgroundColor: '#eef3f7',
    borderRadius: 10,
    padding: 4,
  },
  smallSegmentButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  smallSegmentButtonActive: { backgroundColor: '#3498db' },
  smallSegmentText: { color: '#5d6d7e', fontWeight: '600', fontSize: 12 },
  smallSegmentTextActive: { color: '#fff' },
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
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12, color: '#34495e' },
  headerRow: { gap: 8, marginBottom: 8 },
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  historyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3498db',
    backgroundColor: '#eaf4fb',
  },
  historyBtnText: {
    color: '#3498db',
    fontSize: 12,
    fontWeight: '700',
  },
  currentPrice: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 4,
    color: '#2c3e50',
    textAlign: 'center',
  },
  currentMwh: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 16,
    textAlign: 'center',
  },
  semaphore: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignSelf: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  chart: { marginVertical: 8, borderRadius: 16, alignSelf: 'center' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#7f8c8d' },
  error: { color: '#e74c3c', fontSize: 16, textAlign: 'center' },
  tomorrowText: {
    marginTop: 16,
    fontStyle: 'italic',
    color: '#3498db',
    textAlign: 'center',
    fontWeight: '500',
  },
  infoText: { textAlign: 'center', color: '#7f8c8d', fontSize: 15, lineHeight: 22 },
  noticeBox: {
    backgroundColor: '#f8f9fb',
    borderColor: '#dfe6ec',
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginTop: 6,
  },
  noticeText: { textAlign: 'center', color: '#5d6d7e', fontSize: 14, lineHeight: 20 },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  summaryLabel: { fontSize: 16, color: '#7f8c8d', fontWeight: '500' },
  summaryValue: { fontSize: 16, fontWeight: 'bold' },
  hourRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  hourLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 12,
  },
  hourDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  hourLabel: { fontSize: 14, color: '#2c3e50', fontWeight: '500' },
  hourPrice: { fontSize: 14, color: '#2c3e50', fontWeight: '700' },
});

export default App;