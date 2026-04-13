import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LineChart } from 'react-native-chart-kit';
import { apiClient } from '../api/client';

const screenWidth = Dimensions.get('window').width;

export default function SimuladorScreen() {
  const [devices, setDevices] = useState<any[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<any>(null);
  const [selectedHour, setSelectedHour] = useState(14);
  const [simulacion, setSimulacion] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 1. CARGAR DISPOSITIVOS (Ya no hacemos login invisible, usamos el token real)
  useEffect(() => {
    const fetchDevices = async () => {
      setLoading(true);
      try {
        const resDevices = await apiClient.get('/devices');
        setDevices(resDevices.data);
        
        if (resDevices.data.length > 0) {
          setSelectedDevice(resDevices.data[0]);
        }
      } catch (error) {
        console.error('Error cargando dispositivos:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDevices();
  }, []);

  // 2. LLAMAR AL ALGORITMO
  useEffect(() => {
    const calcular = async () => {
      if (!selectedDevice) return;
      try {
        const resSimulador = await apiClient.post('/simulator/calculate', {
          deviceId: selectedDevice.id,
          startHour: selectedHour
        });
        setSimulacion(resSimulador.data);
      } catch (error) {
        console.error('Error calculando coste:', error);
      }
    };

    calcular();
  }, [selectedDevice, selectedHour]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={{ marginTop: 10 }}>Cargando datos...</Text>
      </SafeAreaView>
    );
  }

  if (devices.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ fontSize: 18, fontWeight: 'bold' }}>No tienes electrodomésticos.</Text>
        <Text style={{ marginTop: 10 }}>Ve a Perfil para añadir uno.</Text>
      </SafeAreaView>
    );
  }

  const chartLabels = simulacion && simulacion.desglose.length > 0 
    ? simulacion.desglose.map((d: any) => d.hora) 
    : ['--'];
  
  const chartData = simulacion && simulacion.desglose.length > 0 
    ? simulacion.desglose.map((d: any) => parseFloat(d.costeFranja)) 
    : [0];

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>EcoWatt - Simulador</Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Mis Electrodomésticos</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.carousel}>
            {devices.map((device) => {
              const isSelected = selectedDevice?.id === device.id;
              
              let icon = '⚡';
              if (device.tipo === 'lavadora') icon = '👕';
              if (device.tipo === 'lavavajillas') icon = '🍽️';
              if (device.tipo === 'horno') icon = '🍳';
              if (device.tipo === 'frigorifico') icon = '❄️';

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

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Precios de Hoy vs. Uso Previsto</Text>
          <LineChart
            data={{
              labels: chartLabels,
              datasets: [{ data: chartData }],
            }}
            width={screenWidth - 64}
            height={180}
            yAxisLabel="€"
            yAxisSuffix=""
            withDots={true}
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#ffffff',
              decimalPlaces: 4,
              color: (opacity = 1) => `rgba(52, 152, 219, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(44, 62, 80, ${opacity})`,
              style: { borderRadius: 16 },
            }}
            bezier
            style={styles.chart}
          />
          
          <View style={styles.stepperContainer}>
            <TouchableOpacity 
              style={styles.stepperButton} 
              onPress={() => setSelectedHour(prev => Math.max(0, prev - 1))}
            >
              <Text style={styles.stepperText}>- 1h</Text>
            </TouchableOpacity>
            
            <Text style={styles.sliderText}>Hora de inicio: {selectedHour}:00h</Text>
            
            <TouchableOpacity 
              style={styles.stepperButton} 
              onPress={() => setSelectedHour(prev => Math.min(23, prev + 1))}
            >
              <Text style={styles.stepperText}>+ 1h</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Coste Estimado de Uso</Text>
          <Text style={styles.mainCost}>{simulacion ? simulacion.costeTotalEuros : '0.00'} €</Text>
          
          {simulacion && (
            <View style={styles.detailsContainer}>
              <Text style={styles.detailText}>Dispositivo: {simulacion.dispositivo}</Text>
              <Text style={styles.detailText}>Duración prevista: {simulacion.duracionTotal}</Text>
              <Text style={styles.detailText}>Consumo total: {simulacion.consumoTotalKwh} kWh</Text>
            </View>
          )}

          <TouchableOpacity style={styles.button}>
            <Text style={styles.buttonText}>Confirmar y programar uso</Text>
          </TouchableOpacity>
        </View>
        
        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa' },
  scrollContainer: { padding: 16 },
  pageTitle: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, color: '#2c3e50' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12, color: '#34495e' },
  carousel: { flexDirection: 'row', paddingBottom: 8 },
  deviceCard: { backgroundColor: '#f8f9fa', borderWidth: 1, borderColor: '#e9ecef', borderRadius: 8, padding: 12, marginRight: 10, alignItems: 'center', width: 100 },
  deviceCardSelected: { backgroundColor: '#ebf5fb', borderColor: '#3498db' },
  deviceIcon: { fontSize: 28, marginBottom: 8 },
  deviceName: { fontSize: 12, textAlign: 'center', color: '#7f8c8d' },
  deviceNameSelected: { color: '#2980b9', fontWeight: '600' },
  chart: { marginVertical: 8, borderRadius: 16, alignSelf: 'center' },
  stepperContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingHorizontal: 10, backgroundColor: '#f1f2f6', borderRadius: 8, paddingVertical: 10 },
  stepperButton: { backgroundColor: '#3498db', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  stepperText: { color: '#fff', fontWeight: 'bold' },
  sliderText: { color: '#2c3e50', fontWeight: '500' },
  mainCost: { fontSize: 32, fontWeight: '800', color: '#2c3e50', textAlign: 'center', marginVertical: 10 },
  detailsContainer: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#ecf0f1', paddingTop: 10 },
  detailText: { fontSize: 13, color: '#7f8c8d', marginBottom: 4 },
  button: { marginTop: 16, backgroundColor: '#3498db', padding: 14, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 14 }
});