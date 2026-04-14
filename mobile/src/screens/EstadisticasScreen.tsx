import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../api/client';

export default function EstadisticasScreen() {
  const [periodo, setPeriodo] = useState('Diario');
  const [unidad, setUnidad] = useState('Euros');
  
  const [programaciones, setProgramaciones] = useState<any[]>([]); 
  const [precioMedio, setPrecioMedio] = useState(0.15); 
  const [precioMinimo, setPrecioMinimo] = useState(0.10); 
  const [loading, setLoading] = useState(true);
  
  const [mostrarDetalles, setMostrarDetalles] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const fetchData = async () => {
        try {
          setLoading(true);
          
          const savedProgs = await AsyncStorage.getItem('programaciones_hoy');
          if (savedProgs) {
            setProgramaciones(JSON.parse(savedProgs));
          } else {
            setProgramaciones([]);
          }

          const resDash = await apiClient.get('/dashboard/today');
          if (resDash.data && resDash.data.today) {
            setPrecioMedio(resDash.data.today.avg);
            setPrecioMinimo(resDash.data.today.min);
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

  // ELIMINAMOS los multiplicadores por 7 o por 30.
  // Ahora el sistema es ESTRICTO: Suma única y exclusivamente lo que hay programado.
  const consumoTotalKwh = programaciones.reduce((acc, prog) => acc + parseFloat(prog.kwh), 0);
  const costeTotalEuros = programaciones.reduce((acc, prog) => acc + parseFloat(prog.coste), 0);
  
  const costeOptimoEuros = consumoTotalKwh * precioMinimo;
  
  let ahorroPotencial = costeTotalEuros - costeOptimoEuros;
  if (ahorroPotencial < 0) ahorroPotencial = 0; 

  const co2Evitado = consumoTotalKwh * 0.25; 

  const valorPrincipal = unidad === 'Euros' ? costeTotalEuros : consumoTotalKwh;
  const valorSecundario = unidad === 'Euros' ? consumoTotalKwh : costeTotalEuros;
  const textoUnidadPrincipal = unidad === 'Euros' ? '€' : 'kWh';
  const textoUnidadSecundaria = unidad === 'Euros' ? 'kWh' : '€';

  if (loading && programaciones.length === 0) {
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
        </View>

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

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Horas Pico de Uso de la Red</Text>
            <Text style={styles.smallNote}>Franjas más caras hoy</Text>
          </View>
          <Text style={styles.peakText}>1. 19:00h - 21:00h (Evitar 👕)</Text>
          <Text style={styles.peakText}>2. 12:00h - 13:00h (Evitar 🍱)</Text>
          <Text style={styles.peakText}>3. 08:00h - 09:00h (Evitar ☕)</Text>
        </View>

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

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Huella de Carbono y Sostenibilidad</Text>
          <View style={styles.ecoRow}>
            <Text style={styles.treeIcon}>🌳</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.ecoTitle}>{co2Evitado.toFixed(1)} kg CO2e</Text>
              <Text style={styles.ecoDescription}>
                Asociados a tu consumo programado. Usar energía en horas valle reduce este impacto al usar renovables.
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={() => setMostrarDetalles(!mostrarDetalles)}>
          <Text style={styles.buttonText}>{mostrarDetalles ? 'OCULTAR DESGLOSE' : 'VER DESGLOSE POR APARATO'}</Text>
        </TouchableOpacity>

        {mostrarDetalles && (
          <View style={styles.detallesContainer}>
            <Text style={styles.sectionTitleOutside}>Desglose de la Lista</Text>
            
            {programaciones.length === 0 ? (
              <Text style={styles.smallNote}>No tienes usos programados. Ve al Simulador para empezar.</Text>
            ) : (
              programaciones.map(prog => (
                <View key={prog.id} style={styles.detalleCard}>
                  <Text style={styles.detalleName}>{prog.nombre} <Text style={{fontWeight: 'normal', fontSize: 13}}>({prog.horaInicio}:00h)</Text></Text>
                  <View style={styles.rowBetween}>
                    <Text style={styles.detalleInfo}>{parseFloat(prog.kwh).toFixed(2)} kWh</Text>
                    <Text style={styles.detalleCoste}>{parseFloat(prog.coste).toFixed(2)} €</Text>
                  </View>
                </View>
              ))
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
});