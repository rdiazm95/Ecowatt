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
import { apiClient } from '../api/client';

export default function EstadisticasScreen() {
  const [periodo, setPeriodo] = useState('Diario');
  const [unidad, setUnidad] = useState('Euros');
  
  const [devices, setDevices] = useState<any[]>([]);
  const [precioMedio, setPrecioMedio] = useState(0.15); // Valor por defecto en €/kWh
  const [precioMinimo, setPrecioMinimo] = useState(0.10); // Valor por defecto en €/kWh
  const [loading, setLoading] = useState(true);
  
  const [mostrarDetalles, setMostrarDetalles] = useState(false);

  // Cargar datos cada vez que entramos a la pestaña
  useFocusEffect(
    useCallback(() => {
      const fetchData = async () => {
        try {
          setLoading(true);
          // 1. Obtener dispositivos del usuario
          const resDevices = await apiClient.get('/devices');
          setDevices(resDevices.data);

          // 2. Obtener precios de hoy para cálculos realistas
          const resDash = await apiClient.get('/dashboard/today');
          if (resDash.data && resDash.data.today) {
            // Convertimos de €/MWh a €/kWh
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

  // Lógica de Multiplicador según el Período
  let multiplicadorDias = 1;
  if (periodo === 'Semanal') multiplicadorDias = 7;
  if (periodo === 'Mensual') multiplicadorDias = 30;

  // Cálculos Totales
  // KWh = potencia * duracion
  const consumoDiarioKwh = devices.reduce((acc, dev) => acc + (parseFloat(dev.potencia) * parseFloat(dev.duracion)), 0);
  const consumoTotalKwh = consumoDiarioKwh * multiplicadorDias;
  
  const costeTotalEuros = consumoTotalKwh * precioMedio;
  const costeOptimoEuros = consumoTotalKwh * precioMinimo;
  
  const ahorroPotencial = costeTotalEuros - costeOptimoEuros;
  const co2Evitado = consumoTotalKwh * 0.25; // Estimación: 0.25 kg de CO2 por kWh ahorrado

  // Valores a mostrar en la UI principal
  const valorPrincipal = unidad === 'Euros' ? costeTotalEuros : consumoTotalKwh;
  const valorSecundario = unidad === 'Euros' ? consumoTotalKwh : costeTotalEuros;
  const textoUnidadPrincipal = unidad === 'Euros' ? '€' : 'kWh';
  const textoUnidadSecundaria = unidad === 'Euros' ? 'kWh' : '€';

  if (loading && devices.length === 0) {
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
                    <Text style={[styles.segmentText, unidad === u && styles.segmentTextActive]}>
                      {u === 'Euros' ? 'Euros €' : u}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* 2. SECCIÓN: Resumen de Consumo Medio */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Resumen de Consumo Estimado</Text>
          <Text style={styles.subtitle}>
            Consumo {periodo} ({unidad === 'Euros' ? 'Euros €' : 'kWh'})
          </Text>
          <Text style={styles.mainValue}>
            {valorPrincipal.toFixed(2)} {textoUnidadPrincipal}
          </Text>
          <Text style={styles.subValue}>
            (Equivalente a {valorSecundario.toFixed(2)} {textoUnidadSecundaria})
          </Text>
        </View>

        {/* 3. SECCIÓN: Horas Pico (Mocks estáticos por ahora) */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Horas Pico de Uso de la Red</Text>
            <Text style={styles.smallNote}>Franjas más caras</Text>
          </View>
          <Text style={styles.peakText}>1. 19:00h - 21:00h (Evitar 👕)</Text>
          <Text style={styles.peakText}>2. 12:00h - 13:00h (Evitar 🍱)</Text>
          <Text style={styles.peakText}>3. 08:00h - 09:00h (Evitar ☕)</Text>
        </View>

        {/* 4. SECCIÓN: Comparación de Ahorro */}
        <Text style={styles.sectionTitleOutside}>Comparación de Ahorro (Euros €)</Text>
        <View style={styles.rowBetween}>
          <View style={[styles.card, styles.halfCard]}>
            <Text style={styles.cardHeader}>Coste Promedio</Text>
            <Text style={[styles.mainValue, { color: '#e74c3c', fontSize: 24 }]}>
              {costeTotalEuros.toFixed(2)} €
            </Text>
            <Text style={styles.cardDescription}>Coste usando los aparatos sin mirar la hora.</Text>
          </View>

          <View style={[styles.card, styles.halfCard]}>
            <Text style={styles.cardHeader}>Ahorro Potencial</Text>
            <Text style={[styles.mainValue, { color: '#2ecc71', fontSize: 24 }]}>
              + {ahorroPotencial.toFixed(2)} €
            </Text>
            <Text style={styles.cardDescription}>Si usaras todo siempre en la hora más barata.</Text>
          </View>
        </View>

        {/* 5. SECCIÓN: Huella de Carbono */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Huella de Carbono y Sostenibilidad</Text>
          <View style={styles.ecoRow}>
            <Text style={styles.treeIcon}>🌳</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.ecoTitle}>{co2Evitado.toFixed(1)} kg CO2e</Text>
              <Text style={styles.ecoDescription}>
                Asociados a tu consumo estimado. Usar energía en horas valle reduce este impacto porque proviene de renovables.
              </Text>
            </View>
          </View>
        </View>

        {/* 6. BOTÓN DE ACCIÓN Y DETALLES */}
        <TouchableOpacity 
          style={styles.primaryButton}
          onPress={() => setMostrarDetalles(!mostrarDetalles)}
        >
          <Text style={styles.buttonText}>
            {mostrarDetalles ? 'OCULTAR DETALLES' : 'VER DETALLES AVANZADOS'}
          </Text>
        </TouchableOpacity>

        {/* 7. DESGLOSE POR ELECTRODOMÉSTICO (Oculto por defecto) */}
        {mostrarDetalles && (
          <View style={styles.detallesContainer}>
            <Text style={styles.sectionTitleOutside}>Desglose {periodo}</Text>
            
            {devices.length === 0 ? (
              <Text style={styles.smallNote}>No tienes dispositivos registrados.</Text>
            ) : (
              devices.map(device => {
                const devKwhDiario = parseFloat(device.potencia) * parseFloat(device.duracion);
                const devKwhTotal = devKwhDiario * multiplicadorDias;
                const devCosteEuros = devKwhTotal * precioMedio;

                return (
                  <View key={device.id} style={styles.detalleCard}>
                    <Text style={styles.detalleName}>{device.nombre}</Text>
                    <View style={styles.rowBetween}>
                      <Text style={styles.detalleInfo}>{devKwhTotal.toFixed(2)} kWh</Text>
                      <Text style={styles.detalleCoste}>{devCosteEuros.toFixed(2)} €</Text>
                    </View>
                  </View>
                );
              })
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
  
  // Estilos para los Detalles Avanzados
  detallesContainer: { marginTop: 10 },
  detalleCard: { backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 8, borderLeftWidth: 4, borderLeftColor: '#3498db', elevation: 1 },
  detalleName: { fontSize: 15, fontWeight: 'bold', color: '#2c3e50', marginBottom: 4 },
  detalleInfo: { fontSize: 14, color: '#7f8c8d' },
  detalleCoste: { fontSize: 15, fontWeight: 'bold', color: '#e74c3c' },
});