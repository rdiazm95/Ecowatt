import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LineChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

// Datos simulados (Mocks) para la UI hasta que tengamos el backend
const MOCK_DEVICES = [
  { id: 1, name: 'Lavadora Bosch', icon: '👕', power: 1.5, duration: 2 },
  { id: 2, name: 'Lavavajillas', icon: '🍽️', power: 2.0, duration: 1.5 },
  { id: 3, name: 'Horno', icon: '🍳', power: 2.5, duration: 1 },
  { id: 4, name: 'Frigorífico', icon: '❄️', power: 0.3, duration: 24 },
];

const MOCK_CHART_DATA = {
  labels: ['00h', '04h', '08h', '12h', '16h', '20h'],
  datasets: [
    {
      data: [0.08, 0.07, 0.12, 0.15, 0.11, 0.26, 0.22],
      color: (opacity = 1) => `rgba(52, 152, 219, ${opacity})`,
      strokeWidth: 3,
    },
  ],
};

export default function SimuladorScreen() {
  const [selectedDevice, setSelectedDevice] = useState(MOCK_DEVICES[0]);
  const [selectedHour, setSelectedHour] = useState(14); // Hora de inicio simulada

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>EcoWatt - Simulador</Text>

        {/* 1. SECCIÓN: Mis Electrodomésticos */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Mis Electrodomésticos</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.carousel}>
            {MOCK_DEVICES.map((device) => {
              const isSelected = selectedDevice.id === device.id;
              return (
                <TouchableOpacity
                  key={device.id}
                  style={[styles.deviceCard, isSelected && styles.deviceCardSelected]}
                  onPress={() => setSelectedDevice(device)}
                >
                  <Text style={styles.deviceIcon}>{device.icon}</Text>
                  <Text style={[styles.deviceName, isSelected && styles.deviceNameSelected]}>
                    {device.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* 2. SECCIÓN: Gráfica y Selector de Uso */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Precios de Hoy vs. Uso Previsto</Text>
          <LineChart
            data={MOCK_CHART_DATA}
            width={screenWidth - 64}
            height={180}
            yAxisLabel="€"
            yAxisSuffix=""
            withDots={true}
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#ffffff',
              decimalPlaces: 2,
              color: (opacity = 1) => `rgba(52, 152, 219, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(44, 62, 80, ${opacity})`,
              style: { borderRadius: 16 },
            }}
            bezier
            style={styles.chart}
          />
          {/* Aquí en el futuro meteremos un Slider real (ej. @react-native-community/slider) */}
          <View style={styles.sliderMock}>
            <Text style={styles.sliderText}>Hora seleccionada: {selectedHour}:00h</Text>
          </View>
        </View>

        {/* 3. SECCIÓN: Coste Estimado */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Coste Estimado de Uso</Text>
          <Text style={styles.mainCost}>0.85 €</Text>
          
          <View style={styles.detailsContainer}>
            <Text style={styles.detailText}>Duración prevista: {selectedDevice.duration} horas</Text>
            <Text style={styles.detailText}>Consumo: {(selectedDevice.power * selectedDevice.duration).toFixed(1)} kWh</Text>
            <Text style={styles.detailText}>Precio medio franja: 0.236 €/kWh</Text>
            <Text style={styles.detailText}>Precio referencia valle: 0.13 €/kWh</Text>
          </View>

          <TouchableOpacity style={styles.button}>
            <Text style={styles.buttonText}>Confirmar y programar uso</Text>
          </TouchableOpacity>
        </View>
        
        <View style={{ height: 30 }} /> {/* Espaciado inferior */}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f5f6fa',
  },
  scrollContainer: {
    padding: 16,
  },
  pageTitle: { 
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
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  sectionTitle: { 
    fontSize: 16, 
    fontWeight: '700', 
    marginBottom: 12,
    color: '#34495e',
  },
  carousel: {
    flexDirection: 'row',
    paddingBottom: 8,
  },
  deviceCard: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    padding: 12,
    marginRight: 10,
    alignItems: 'center',
    width: 100,
  },
  deviceCardSelected: {
    backgroundColor: '#ebf5fb',
    borderColor: '#3498db',
  },
  deviceIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  deviceName: {
    fontSize: 12,
    textAlign: 'center',
    color: '#7f8c8d',
  },
  deviceNameSelected: {
    color: '#2980b9',
    fontWeight: '600',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
    alignSelf: 'center',
  },
  sliderMock: {
    marginTop: 10,
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#f1f2f6',
    borderRadius: 8,
  },
  sliderText: {
    color: '#2c3e50',
    fontWeight: '500',
  },
  mainCost: {
    fontSize: 32,
    fontWeight: '800',
    color: '#2c3e50',
    textAlign: 'center',
    marginVertical: 10,
  },
  detailsContainer: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
    paddingTop: 10,
  },
  detailText: {
    fontSize: 13,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  button: {
    marginTop: 16,
    backgroundColor: '#3498db',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});