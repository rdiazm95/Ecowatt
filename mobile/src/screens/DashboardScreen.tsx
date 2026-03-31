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
    labels: prices.map((p) => p.hour.toString().padStart(2, '0') + 'h'),
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
      <ScrollView style={styles.scrollContainer}>
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
                r: '2',
                strokeWidth: '2',
                stroke: '#3498db',
              },
            }}
            bezier
            style={styles.chart}
            verticalLabelRotation={-45}
            xLabelsOffset={10}
          />
        </View>

        {/* Resumen */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Resumen del día</Text>
          <Text>Mínimo: {data.today.min.toFixed(4)} €/kWh</Text>
          <Text>Máximo: {data.today.max.toFixed(4)} €/kWh</Text>
          <Text>Medio: {data.today.avg.toFixed(4)} €/kWh</Text>
          <Text style={styles.tomorrowText}>
            {data.tomorrow.message}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f5f6fa',
  },
  scrollContainer: {
    padding: 16,
  },
  center: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center',
    padding: 16,
  },
  title: { 
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
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: '600', 
    marginBottom: 12,
    color: '#34495e',
  },
  currentPrice: { 
    fontSize: 28, 
    fontWeight: '800', 
    marginBottom: 4,
    color: '#2c3e50',
    textAlign: 'center',
  },
  currentMwh: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 12,
    textAlign: 'center',
  },
  semaphore: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignSelf: 'center',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
    alignSelf: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#7f8c8d',
  },
  error: { 
    color: '#e74c3c', 
    fontSize: 16,
    textAlign: 'center',
  },
  tomorrowText: {
    marginTop: 12,
    fontStyle: 'italic',
    color: '#3498db',
    textAlign: 'center',
  },
});

export default App;
