import React, { useState, useCallback } from 'react';
import {
  View, Text, ActivityIndicator, StyleSheet,
  Dimensions, ScrollView, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LineChart } from 'react-native-chart-kit';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { fetchHistory, HistoryDayPoint } from '../api/history';
import Ionicons from '@expo/vector-icons/Ionicons';

const screenWidth = Dimensions.get('window').width;

export default function HistoryScreen() {
  const navigation = useNavigation();
  const [data, setData] = useState<HistoryDayPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metric, setMetric] = useState<'avg' | 'min' | 'max'>('avg');

  // SOLUCIÓN: Refresca el histórico automáticamente al entrar a la pantalla
  useFocusEffect(
    useCallback(() => {
      fetchHistory()
        .then((res) => {
          setData(res);
          setError(null);
        })
        .catch(() => setError('No se pudo cargar el histórico'))
        .finally(() => setLoading(false));
    }, [])
  );

  // Muestra el spinner de carga SOLO la primera vez (cuando no hay datos)
  if (loading && data.length === 0) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Cargando histórico...</Text>
      </SafeAreaView>
    );
  }

  // Muestra el error SOLO si no hay datos previamente cargados
  if (error && data.length === 0) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.error}>{error ?? 'Sin datos disponibles'}</Text>
      </SafeAreaView>
    );
  }

  // Prevenir crasheos si por algún motivo la data sigue vacía al renderizar
  if (data.length === 0) return null;

  // Etiquetas: solo mostramos 1 de cada 5 días para no saturar
  const labels = data.map((d, i) => {
    if (i % 5 === 0) return d.date.substring(5); // "04-27"
    return '';
  });

  const values = data.map((d) => d[metric]);

  const chartData = {
    labels,
    datasets: [
      {
        data: values,
        color: (opacity = 1) =>
          metric === 'min'
            ? `rgba(46, 204, 113, ${opacity})`
            : metric === 'max'
            ? `rgba(231, 76, 60, ${opacity})`
            : `rgba(52, 152, 219, ${opacity})`,
        strokeWidth: 2,
      },
    ],
  };

  const metricLabel = metric === 'avg' ? 'Medio' : metric === 'min' ? 'Mínimo' : 'Máximo';
  const globalAvg = (data.reduce((a, b) => a + b.avg, 0) / data.length).toFixed(4);
  const globalMin = Math.min(...data.map((d) => d.min)).toFixed(4);
  const globalMax = Math.max(...data.map((d) => d.max)).toFixed(4);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#2c3e50" />
          </TouchableOpacity>
          <Text style={styles.title}>Histórico 30 días</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Selector de métrica */}
        <View style={styles.segment}>
          {(['avg', 'min', 'max'] as const).map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.segBtn, metric === m && styles.segBtnActive]}
              onPress={() => setMetric(m)}
            >
              <Text style={[styles.segText, metric === m && styles.segTextActive]}>
                {m === 'avg' ? 'Medio' : m === 'min' ? 'Mínimo' : 'Máximo'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Gráfica */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Precio {metricLabel} €/kWh</Text>
          <LineChart
            data={chartData}
            width={screenWidth - 48}
            height={220}
            yAxisLabel="€"
            withInnerLines={false}
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#ffffff',
              decimalPlaces: 4,
              color: (opacity = 1) => `rgba(52, 152, 219, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(44, 62, 80, ${opacity})`,
              propsForDots: { r: '2', strokeWidth: '1', stroke: '#3498db' },
            }}
            bezier
            style={styles.chart}
          />
        </View>

        {/* Resumen global */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Resumen del período</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Media global:</Text>
            <Text style={[styles.summaryValue, { color: '#3498db' }]}>{globalAvg} €/kWh</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Mínimo absoluto:</Text>
            <Text style={[styles.summaryValue, { color: '#2ecc71' }]}>{globalMin} €/kWh</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Máximo absoluto:</Text>
            <Text style={[styles.summaryValue, { color: '#e74c3c' }]}>{globalMax} €/kWh</Text>
          </View>
        </View>

        {/* Lista de días */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Detalle por día</Text>
          {[...data].reverse().map((d) => (
            <View key={d.date} style={styles.dayRow}>
              <Text style={styles.dayDate}>{d.date}</Text>
              <View style={styles.dayValues}>
                <Text style={[styles.dayVal, { color: '#2ecc71' }]}>{d.min.toFixed(4)}</Text>
                <Text style={[styles.dayVal, { color: '#3498db' }]}>{d.avg.toFixed(4)}</Text>
                <Text style={[styles.dayVal, { color: '#e74c3c' }]}>{d.max.toFixed(4)}</Text>
              </View>
            </View>
          ))}
          <View style={styles.dayLegend}>
            <Text style={[styles.legendItem, { color: '#2ecc71' }]}>● Min</Text>
            <Text style={[styles.legendItem, { color: '#3498db' }]}>● Med</Text>
            <Text style={[styles.legendItem, { color: '#e74c3c' }]}>● Max</Text>
          </View>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa' },
  scroll: { padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  backBtn: { padding: 8 },
  title: { fontSize: 20, fontWeight: '800', color: '#2c3e50' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#7f8c8d' },
  error: { color: '#e74c3c', fontSize: 16, textAlign: 'center' },
  segment: { flexDirection: 'row', backgroundColor: '#eaf1f7', borderRadius: 12, padding: 4, marginBottom: 16 },
  segBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  segBtnActive: { backgroundColor: '#3498db' },
  segText: { color: '#5d6d7e', fontWeight: '700' },
  segTextActive: { color: '#fff' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3 },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12, color: '#34495e' },
  chart: { marginVertical: 4, borderRadius: 12, alignSelf: 'center' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#ecf0f1' },
  summaryLabel: { fontSize: 15, color: '#7f8c8d', fontWeight: '500' },
  summaryValue: { fontSize: 15, fontWeight: '700' },
  dayRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#ecf0f1' },
  dayDate: { fontSize: 13, color: '#2c3e50', fontWeight: '600', flex: 1 },
  dayValues: { flexDirection: 'row', gap: 10 },
  dayVal: { fontSize: 12, fontWeight: '700', minWidth: 52, textAlign: 'right' },
  dayLegend: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, marginTop: 10 },
  legendItem: { fontSize: 12, fontWeight: '600' },
});