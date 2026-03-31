import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function EstadisticasScreen() {
  const [periodo, setPeriodo] = useState('Diario');
  const [unidad, setUnidad] = useState('Euros');

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>EcoWatt - Estadísticas</Text>

        {/* 1. SECCIÓN: Selectores de Período y Unidad */}
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
                    <Text style={[styles.segmentText, unidad === u && styles.segmentTextActive]}>{u === 'Euros' ? 'Euros €' : u}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* 2. SECCIÓN: Resumen de Consumo Medio */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Resumen de Consumo Medio</Text>
          <Text style={styles.subtitle}>Consumo Medio {periodo} ({unidad === 'Euros' ? 'Euros €' : 'kWh'})</Text>
          <Text style={styles.mainValue}>1.45 €</Text>
          <Text style={styles.subValue}>(Equivalente a 7.25 KWh)</Text>
        </View>

        {/* 3. SECCIÓN: Horas Pico */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Horas Pico de Uso</Text>
            <Text style={styles.smallNote}>3 horas más de uso</Text>
          </View>
          <Text style={styles.peakText}>1. 19:00h - 21:00h (👕 💡)</Text>
          <Text style={styles.peakText}>2. 12:00h - 13:00h (🍱 ⚡)</Text>
          <Text style={styles.peakText}>3. 08:00h - 09:00h (☕ 🍞)</Text>
        </View>

        {/* 4. SECCIÓN: Comparación de Ahorro */}
        <Text style={styles.sectionTitleOutside}>Comparación de Ahorro (Euros €)</Text>
        <View style={styles.rowBetween}>
          <View style={[styles.card, styles.halfCard]}>
            <Text style={styles.cardHeader}>Ahorro Realizado</Text>
            <Text style={[styles.mainValue, { color: '#2ecc71', fontSize: 24 }]}>+ 2.30 €</Text>
            <Text style={styles.cardDescription}>Por usar electrodomésticos en horas de tarifa baja.</Text>
          </View>

          <View style={[styles.card, styles.halfCard]}>
            <Text style={styles.cardHeader}>Ahorro Potencial</Text>
            <Text style={[styles.mainValue, { color: '#e67e22', fontSize: 24 }]}>+ 1.80 €</Text>
            <Text style={styles.cardDescription}>Podrías haber ahorrado esto si hubieses optimizado el uso.</Text>
          </View>
        </View>

        {/* 5. SECCIÓN: Huella de Carbono */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Huella de Carbono y Sostenibilidad</Text>
          <View style={styles.ecoRow}>
            <Text style={styles.treeIcon}>🌳</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.ecoTitle}>2.1 kg CO2e Evitados</Text>
              <Text style={styles.ecoDescription}>
                Tu uso optimizado ha reducido tu impacto ambiental (Equivalente a plantar un árbol).
              </Text>
            </View>
          </View>
        </View>

        {/* 6. BOTÓN DE ACCIÓN */}
        <TouchableOpacity style={styles.primaryButton}>
          <Text style={styles.buttonText}>VER DETALLES AVANZADOS</Text>
        </TouchableOpacity>

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
  sectionTitleOutside: { fontSize: 16, fontWeight: '700', marginBottom: 12, color: '#2c3e50', marginLeft: 4 },
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
});