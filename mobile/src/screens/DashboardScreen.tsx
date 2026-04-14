import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LineChart } from 'react-native-chart-kit';
import { fetchTodayDashboard, TodayDashboard } from '../api/dashboard';

const screenWidth = Dimensions.get('window').width;

function getPriceLevelColor(priceKwh: number, avg: number): string {
  if (priceKwh <= avg * 0.9) return '#2ecc71';
  if (priceKwh <= avg * 1.1) return '#f1c40f';
  return '#e74c3c';
}

const App = () => {
  const [data, setData] = useState<TodayDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const dashboard = await fetchTodayDashboard();
        setData(dashboard);
      } catch (e) {
        console.error(e);
        setError('No se pudo cargar el dashboard');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Cargando datos de la luz...</Text>
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.error}>{error ?? 'Error desconocido'}</Text>
      </SafeAreaView>
    );
  }

  const current = data.current;
  const prices = data.today.prices;
  const avg = data.today.avg;

  const chartData = {
    // MODIFICACIÓN AQUÍ: Mostramos el texto solo cada 4 horas. 
    // Las demás horas devuelven un string vacío para no solaparse.
    labels: prices.map((p) => 
      p.hour % 4 === 0 ? `${p.hour.toString().padStart(2, '0')}h` : ''
    ),
    datasets: [
      {
        data: prices.map((p) => p.priceKwh),
        color: (opacity = 1) => `rgba(52, 152, 219, ${opacity})`,
        strokeWidth: 3,
      },
    ],
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>EcoWatt - Hoy</Text>

        {/* Precio actual */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Precio actual</Text>
          {current ? (
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
                  { backgroundColor: getPriceLevelColor(current.priceKwh, avg) },
                ]}
              />
            </>
          ) : (
            <Text>No hay precio actual disponible</Text>
          )}
        </View>

        {/* Gráfica */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Curva de precios de hoy</Text>
          <LineChart
            data={chartData}
            width={screenWidth - 64}
            height={250}
            yAxisLabel="€"
            yAxisSuffix=""
            withInnerLines={false} // Opcional: Quita las líneas de fondo para que se vea aún más limpio
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#ffffff',
              decimalPlaces: 4,
              color: (opacity = 1) => `rgba(52, 152, 219, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(44, 62, 80, ${opacity})`,
              style: {
                borderRadius: 16,
              },
              propsForDots: {
                r: '3', // Hacemos los puntitos un poco más visibles
                strokeWidth: '2',
                stroke: '#3498db',
              },
            }}
            bezier
            style={styles.chart}
            // Eliminados verticalLabelRotation y xLabelsOffset para que se alinee natural
          />
        </View>

        {/* Resumen */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Resumen del día</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Mínimo:</Text>
            <Text style={[styles.summaryValue, { color: '#2ecc71' }]}>{data.today.min.toFixed(4)} €/kWh</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Medio:</Text>
            <Text style={[styles.summaryValue, { color: '#f1c40f' }]}>{data.today.avg.toFixed(4)} €/kWh</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Máximo:</Text>
            <Text style={[styles.summaryValue, { color: '#e74c3c' }]}>{data.today.max.toFixed(4)} €/kWh</Text>
          </View>
          
          <Text style={styles.tomorrowText}>
            {data.tomorrow.message}
          </Text>
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
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, color: '#2c3e50' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12, color: '#34495e' },
  currentPrice: { fontSize: 32, fontWeight: '800', marginBottom: 4, color: '#2c3e50', textAlign: 'center' },
  currentMwh: { fontSize: 14, color: '#7f8c8d', marginBottom: 16, textAlign: 'center' },
  semaphore: { width: 40, height: 40, borderRadius: 20, alignSelf: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 2 },
  chart: { marginVertical: 8, borderRadius: 16, alignSelf: 'center' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#7f8c8d' },
  error: { color: '#e74c3c', fontSize: 16, textAlign: 'center' },
  tomorrowText: { marginTop: 16, fontStyle: 'italic', color: '#3498db', textAlign: 'center', fontWeight: '500' },
  
  // Estilos añadidos para que el Resumen quede mejor alineado
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#ecf0f1' },
  summaryLabel: { fontSize: 16, color: '#7f8c8d', fontWeight: '500' },
  summaryValue: { fontSize: 16, fontWeight: 'bold' }
});

export default App;