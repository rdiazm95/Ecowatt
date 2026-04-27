import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
// import * as Notifications from 'expo-notifications'; // DESHABILITADO: no compatible con emulador
// import Constants from 'expo-constants'; // DESHABILITADO: no compatible con emulador
import { apiClient } from '../api/client';
import { updateAlertSettings } from '../api/auth';

// Iconos para el selector de tipo
const TIPOS_ELECTRODOMESTICOS = [
  { id: 'lavadora', icon: '👕' },
  { id: 'lavavajillas', icon: '🍽️' },
  { id: 'horno', icon: '🍳' },
  { id: 'microondas', icon: '🍱' },
  { id: 'frigorifico', icon: '❄️' },
  { id: 'tv', icon: '📺' },
];

export default function ProfileScreen({ navigation }: any) {
  // --- ESTADOS DEL BACKEND ---
  const [user, setUser] = useState<any>(null);
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  // --- ESTADOS DE LA UI DE ALERTAS ---
  const [alertasActivas, setAlertasActivas] = useState(false);
  const [umbralPrecio, setUmbralPrecio] = useState('0.15');
  const [isSavingAlert, setIsSavingAlert] = useState(false);

  // --- ESTADOS DE DISPOSITIVOS ---
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [nuevoDispositivo, setNuevoDispositivo] = useState({
    nombre: '',
    tipo: 'lavadora',
    potencia: '',
  });

  // 1. Cargar Datos al inicio
  useEffect(() => {
    fetchProfileAndDevices();
  }, []);

  const fetchProfileAndDevices = async () => {
    try {
      setLoading(true);
      const resUser = await apiClient.get('/auth/perfil');
      const userData = resUser.data.usuario;
      setUser(userData);

      setAlertasActivas(userData.alertaPrecioActiva || false);
      if (userData.alertaPrecioObjetivo) {
        setUmbralPrecio(userData.alertaPrecioObjetivo.toString());
      }

      const resDevices = await apiClient.get('/devices');
      setDevices(resDevices.data);
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  // 2. Función para guardar la configuración de la alerta
  const handleSaveAlert = async () => {
    try {
      setIsSavingAlert(true);

      // DESHABILITADO: bloque de notificaciones no compatible con emulador
      // if (alertasActivas) {
      //   const { status: existingStatus } = await Notifications.getPermissionsAsync();
      //   let finalStatus = existingStatus;
      //   if (existingStatus !== 'granted') {
      //     const { status } = await Notifications.requestPermissionsAsync();
      //     finalStatus = status;
      //   }
      //   if (finalStatus !== 'granted') {
      //     Alert.alert('Permiso denegado', 'Necesitamos permisos para enviarte las alertas.');
      //     setIsSavingAlert(false);
      //     return;
      //   }
      //   const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      //   if (!projectId) {
      //     Alert.alert('Error', 'No se encontró el Project ID. Revisa tu app.json y reinicia el servidor.');
      //     setIsSavingAlert(false);
      //     return;
      //   }
      //   const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
      //   pushToken = tokenData.data;
      // }

      const pushToken = undefined; // DESHABILITADO: no compatible con emulador

      // Enviamos al servidor sin token de notificación
      const precioNum = parseFloat(umbralPrecio.replace(',', '.')) || 0;
      await updateAlertSettings(alertasActivas, precioNum, pushToken);

      Alert.alert('¡Éxito!', 'Configuración de alertas guardada correctamente.');
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo guardar la configuración.');
    } finally {
      setIsSavingAlert(false);
    }
  };

  // 3. Función para añadir electrodoméstico
  const handleAddDevice = async () => {
    if (!nuevoDispositivo.nombre || !nuevoDispositivo.potencia) {
      Alert.alert('Error', 'Por favor, rellena todos los campos.');
      return;
    }

    setAdding(true);
    try {
      await apiClient.post('/devices', {
        nombre: nuevoDispositivo.nombre,
        tipo: nuevoDispositivo.tipo,
        potencia: parseFloat(nuevoDispositivo.potencia),
        duracion: 1,
      });

      setNuevoDispositivo({ nombre: '', tipo: 'lavadora', potencia: '' });
      setMostrarFormulario(false);
      fetchProfileAndDevices();

      Alert.alert('Éxito', 'Electrodoméstico creado correctamente.');
    } catch (error) {
      Alert.alert('Error', 'No se pudo añadir el dispositivo.');
    } finally {
      setAdding(false);
    }
  };

  // 4. Función para borrar electrodoméstico
  const handleDeleteDevice = async (id: number) => {
    Alert.alert(
      'Eliminar',
      '¿Borrar este electrodoméstico?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.delete(`/devices/${id}`);
              fetchProfileAndDevices();
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar.');
            }
          },
        },
      ]
    );
  };

  // 5. Función para cerrar sesión
  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('userToken');
    navigation.replace('Welcome');
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={{ marginTop: 10, color: '#7f8c8d' }}>Cargando tu perfil...</Text>
      </SafeAreaView>
    );
  }

  const iniciales = user?.email ? user.email.substring(0, 2).toUpperCase() : 'US';

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>

        {/* Cabecera del Perfil Real */}
        <View style={styles.header}>
          <View style={styles.avatarMock}>
            <Text style={styles.avatarText}>{iniciales}</Text>
          </View>
          <Text style={styles.userName}>{user?.email.split('@')[0]}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>

          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Cerrar Sesión</Text>
          </TouchableOpacity>
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

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleSaveAlert}
            disabled={isSavingAlert}
          >
            {isSavingAlert ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>GUARDAR CONFIGURACIÓN</Text>
            )}
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

              <TouchableOpacity style={styles.primaryButton} onPress={handleAddDevice} disabled={adding}>
                {adding ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>CREAR ELECTRODOMÉSTICO</Text>}
              </TouchableOpacity>
            </View>
          )}

          {/* Lista de Dispositivos Reales */}
          {!mostrarFormulario && (
            <View style={styles.deviceListContainer}>
              {devices.length === 0 ? (
                <Text style={styles.emptyText}>No tienes electrodomésticos guardados.</Text>
              ) : (
                devices.map((device) => {
                  const iconObj = TIPOS_ELECTRODOMESTICOS.find(t => t.id === device.tipo);
                  const icon = iconObj ? iconObj.icon : '⚡';

                  return (
                    <View key={device.id} style={styles.deviceItem}>
                      <Text style={styles.deviceItemIcon}>{icon}</Text>
                      <View style={styles.deviceItemInfo}>
                        <Text style={styles.deviceItemName}>{device.nombre}</Text>
                        <Text style={styles.deviceItemDetails}>{device.potencia} kW</Text>
                      </View>
                      <TouchableOpacity onPress={() => handleDeleteDevice(device.id)} style={styles.deleteBtn}>
                        <Text style={styles.deleteIcon}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })
              )}
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
  avatarMock: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#3498db', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  userName: { fontSize: 22, fontWeight: 'bold', color: '#2c3e50', textTransform: 'capitalize' },
  userEmail: { fontSize: 14, color: '#7f8c8d', marginTop: 4 },
  logoutButton: { marginTop: 12, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, backgroundColor: '#ffeaa7' },
  logoutText: { color: '#d35400', fontWeight: 'bold', fontSize: 12 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3 },
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
  deviceListContainer: { marginTop: 16, borderTopWidth: 1, borderTopColor: '#ecf0f1', paddingTop: 16 },
  emptyText: { textAlign: 'center', color: '#7f8c8d', fontStyle: 'italic', marginTop: 10 },
  deviceItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f9fa', padding: 12, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: '#e9ecef' },
  deviceItemIcon: { fontSize: 28, marginRight: 12 },
  deviceItemInfo: { flex: 1 },
  deviceItemName: { fontSize: 15, fontWeight: 'bold', color: '#2c3e50' },
  deviceItemDetails: { fontSize: 13, color: '#7f8c8d', marginTop: 2 },
  deleteBtn: { padding: 8 },
  deleteIcon: { fontSize: 18 },
});