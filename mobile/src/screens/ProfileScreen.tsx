import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Iconos mockeados para el selector de tipo
const TIPOS_ELECTRODOMESTICOS = [
  { id: 'lavadora', icon: '👕' },
  { id: 'lavavajillas', icon: '🍽️' },
  { id: 'horno', icon: '🍳' },
  { id: 'microondas', icon: '🍱' },
  { id: 'frigorifico', icon: '❄️' },
  { id: 'tv', icon: '📺' },
];

export default function ProfileScreen() {
  // Estados para las Alertas
  const [alertasActivas, setAlertasActivas] = useState(true);
  const [umbralPrecio, setUmbralPrecio] = useState('0.15');

  // Estados para el Formulario de Nuevo Electrodoméstico
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [nuevoDispositivo, setNuevoDispositivo] = useState({
    nombre: '',
    tipo: 'lavadora',
    potencia: '',
    duracion: '',
  });

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* Cabecera del Perfil */}
        <View style={styles.header}>
          <View style={styles.avatarMock}>
            <Text style={styles.avatarText}>RD</Text>
          </View>
          <Text style={styles.userName}>Rubén Díaz</Text>
          <Text style={styles.userEmail}>ruben@ecowatt.com</Text>
        </View>

        {/* 1. SECCIÓN: Configuración de Alertas */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Alertas de Precio de la Energía</Text>
          <Text style={styles.description}>
            Recibe una notificación cuando el precio de la luz baje del umbral establecido.
          </Text>

          <View style={styles.row}>
            <Text style={styles.label}>Activar Notificaciones Automáticas</Text>
            <Switch
              value={alertasActivas}
              onValueChange={setAlertasActivas}
              trackColor={{ false: '#bdc3c7', true: '#3498db' }}
              thumbColor={'#fff'}
            />
          </View>

          {alertasActivas && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Umbral de Precio (€/kWh)</Text>
              <View style={styles.stepperContainer}>
                <TouchableOpacity 
                  style={styles.stepperButton}
                  onPress={() => setUmbralPrecio((prev) => (parseFloat(prev) - 0.01).toFixed(2))}
                >
                  <Text style={styles.stepperButtonText}>-</Text>
                </TouchableOpacity>
                <TextInput
                  style={styles.stepperInput}
                  value={umbralPrecio}
                  onChangeText={setUmbralPrecio}
                  keyboardType="numeric"
                />
                <TouchableOpacity 
                  style={styles.stepperButton}
                  onPress={() => setUmbralPrecio((prev) => (parseFloat(prev) + 0.01).toFixed(2))}
                >
                  <Text style={styles.stepperButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <TouchableOpacity style={styles.primaryButton}>
            <Text style={styles.buttonText}>GUARDAR CONFIGURACIÓN</Text>
          </TouchableOpacity>
        </View>

        {/* 2. SECCIÓN: Gestión de Electrodomésticos */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Mis Electrodomésticos</Text>
            <TouchableOpacity onPress={() => setMostrarFormulario(!mostrarFormulario)}>
              <Text style={styles.linkText}>{mostrarFormulario ? 'Cancelar' : '+ Añadir Nuevo'}</Text>
            </TouchableOpacity>
          </View>

          {/* Formulario Desplegable */}
          {mostrarFormulario && (
            <View style={styles.formContainer}>
              <Text style={styles.label}>Nombre del Electrodoméstico</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ej: Lavavajillas Sótano"
                value={nuevoDispositivo.nombre}
                onChangeText={(t) => setNuevoDispositivo({...nuevoDispositivo, nombre: t})}
              />

              <Text style={styles.label}>Tipo de Electrodoméstico</Text>
              <View style={styles.iconGrid}>
                {TIPOS_ELECTRODOMESTICOS.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.iconButton,
                      nuevoDispositivo.tipo === item.id && styles.iconButtonActive
                    ]}
                    onPress={() => setNuevoDispositivo({...nuevoDispositivo, tipo: item.id})}
                  >
                    <Text style={styles.iconText}>{item.icon}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Potencia Máxima (kW)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ej: 2.5"
                keyboardType="numeric"
                value={nuevoDispositivo.potencia}
                onChangeText={(t) => setNuevoDispositivo({...nuevoDispositivo, potencia: t})}
              />

              <Text style={styles.label}>Duración Típica (horas)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ej: 2"
                keyboardType="numeric"
                value={nuevoDispositivo.duracion}
                onChangeText={(t) => setNuevoDispositivo({...nuevoDispositivo, duracion: t})}
              />

              <TouchableOpacity style={styles.primaryButton}>
                <Text style={styles.buttonText}>CREAR ELECTRODOMÉSTICO</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa' },
  scrollContainer: { padding: 16 },
  header: { alignItems: 'center', marginBottom: 24, marginTop: 10 },
  avatarMock: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#3498db',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  userName: { fontSize: 22, fontWeight: 'bold', color: '#2c3e50' },
  userEmail: { fontSize: 14, color: '#7f8c8d', marginTop: 4 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 3,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8, color: '#2c3e50' },
  description: { fontSize: 13, color: '#7f8c8d', marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 14, fontWeight: '600', color: '#34495e', marginBottom: 8, marginTop: 8 },
  inputContainer: { marginBottom: 16 },
  stepperContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#bdc3c7', borderRadius: 8 },
  stepperButton: { padding: 12, backgroundColor: '#f8f9fa', alignItems: 'center', justifyContent: 'center', width: 50 },
  stepperButtonText: { fontSize: 20, color: '#2c3e50', fontWeight: 'bold' },
  stepperInput: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: 'bold', color: '#2c3e50' },
  primaryButton: { backgroundColor: '#2c3e50', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 16 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  linkText: { color: '#3498db', fontWeight: '600', fontSize: 14 },
  formContainer: { marginTop: 16, borderTopWidth: 1, borderTopColor: '#ecf0f1', paddingTop: 16 },
  textInput: { borderWidth: 1, borderColor: '#bdc3c7', borderRadius: 8, padding: 12, fontSize: 14, backgroundColor: '#fff' },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  iconButton: { borderWidth: 1, borderColor: '#bdc3c7', borderRadius: 8, padding: 12, width: '30%', alignItems: 'center', backgroundColor: '#f8f9fa' },
  iconButtonActive: { borderColor: '#3498db', backgroundColor: '#ebf5fb' },
  iconText: { fontSize: 24 },
});