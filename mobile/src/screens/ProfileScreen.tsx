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
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { apiClient } from '../api/client';
import { updateAlertSettings, logout } from '../api/auth';

const MAX_POTENCIA = 999.99;

const TIPOS_ELECTRODOMESTICOS = [
  { id: 'lavadora', icon: '👕' },
  { id: 'lavavajillas', icon: '🍽️' },
  { id: 'horno', icon: '🍳' },
  { id: 'microondas', icon: '🍱' },
  { id: 'frigorifico', icon: '❄️' },
  { id: 'tv', icon: '📺' },
];

// ─── Avatares preestablecidos ────────────────────────────────────────────────
const AVATARES = [
  { id: 'bolt',  emoji: '⚡', label: 'Rayo' },
  { id: 'leaf',  emoji: '🌿', label: 'Hoja' },
  { id: 'sun',   emoji: '☀️', label: 'Sol' },
  { id: 'wind',  emoji: '💨', label: 'Viento' },
  { id: 'drop',  emoji: '💧', label: 'Agua' },
  { id: 'fire',  emoji: '🔥', label: 'Fuego' },
  { id: 'robot', emoji: '🤖', label: 'Robot' },
  { id: 'house', emoji: '🏠', label: 'Casa' },
  { id: 'bear',  emoji: '🐻', label: 'Oso' },
  { id: 'cat',   emoji: '🐱', label: 'Gato' },
  { id: 'fox',   emoji: '🦊', label: 'Zorro' },
  { id: 'panda', emoji: '🐼', label: 'Panda' },
];

const STORAGE_KEY_NAME   = '@ecowatt_display_name';
const STORAGE_KEY_AVATAR = '@ecowatt_avatar_id';

export default function ProfileScreen({ navigation }: any) {
  const [user, setUser] = useState<any>(null);
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const [alertasActivas, setAlertasActivas] = useState(false);
  const [umbralPrecio, setUmbralPrecio] = useState('0.15');
  const [isSavingAlert, setIsSavingAlert] = useState(false);

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [nuevoDispositivo, setNuevoDispositivo] = useState({
    nombre: '',
    tipo: 'lavadora',
    potencia: '',
  });

  // ─── Nombre personalizado ─────────────────────────────────────────────────
  const [displayName, setDisplayName] = useState('');
  const [editandoNombre, setEditandoNombre] = useState(false);
  const [nombreTemporal, setNombreTemporal] = useState('');

  // ─── Avatar ───────────────────────────────────────────────────────────────
  const [avatarId, setAvatarId] = useState('bolt');
  const [modalAvatarVisible, setModalAvatarVisible] = useState(false);

  const potenciaIngresada = parseFloat(nuevoDispositivo.potencia.replace(',', '.')) || 0;
  const excedePotencia = potenciaIngresada > MAX_POTENCIA;
  const avatarActual = AVATARES.find(a => a.id === avatarId) ?? AVATARES[0];

  useEffect(() => {
    fetchProfileAndDevices();
    loadLocalPrefs();
  }, []);

  const loadLocalPrefs = async () => {
    try {
      const savedName   = await AsyncStorage.getItem(STORAGE_KEY_NAME);
      const savedAvatar = await AsyncStorage.getItem(STORAGE_KEY_AVATAR);
      if (savedAvatar) setAvatarId(savedAvatar);
      if (savedName)   setDisplayName(savedName);
    } catch (_) {}
  };

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

  // ─── Guardar nombre local ─────────────────────────────────────────────────
  const handleGuardarNombre = async () => {
    const nombre = nombreTemporal.trim();
    if (!nombre) return;
    try {
      await AsyncStorage.setItem(STORAGE_KEY_NAME, nombre);
      setDisplayName(nombre);
    } catch (_) {}
    setEditandoNombre(false);
  };

  const handleCancelarEdicion = () => {
    setNombreTemporal('');
    setEditandoNombre(false);
  };

  // ─── Guardar avatar local ─────────────────────────────────────────────────
  const handleSeleccionarAvatar = async (id: string) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY_AVATAR, id);
      setAvatarId(id);
    } catch (_) {}
    setModalAvatarVisible(false);
  };

  const handleSaveAlert = async () => {
    try {
      setIsSavingAlert(true);
      let pushToken: string | undefined = undefined;

      if (alertasActivas) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== 'granted') {
          Alert.alert(
            'Permiso denegado',
            'Necesitamos permisos para enviarte las alertas de precio. Actívalos en los ajustes del móvil.',
          );
          setIsSavingAlert(false);
          return;
        }

        try {
          const tokenData = await Notifications.getDevicePushTokenAsync();
          pushToken = tokenData.data;
          console.log('✅ FCM token obtenido:', pushToken);
        } catch (tokenError) {
          console.warn('⚠️ No se pudo obtener FCM token:', tokenError);
        }
      }

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

  const handleAddDevice = async () => {
    if (!nuevoDispositivo.nombre || !nuevoDispositivo.potencia) {
      Alert.alert('Error', 'Por favor, rellena todos los campos.');
      return;
    }
    if (potenciaIngresada <= 0 || excedePotencia) {
      Alert.alert('Error', `La potencia debe estar entre 0.1 y ${MAX_POTENCIA} kW.`);
      return;
    }

    setAdding(true);
    try {
      await apiClient.post('/devices', {
        nombre: nuevoDispositivo.nombre,
        tipo: nuevoDispositivo.tipo,
        potencia: potenciaIngresada,
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

  const handleLogout = async () => {
    await logout();
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

  const nombreMostrado = displayName || (user?.email ? user.email.split('@')[0] : 'Usuario');

  return (
    <SafeAreaView edges={['top']} style={styles.container}>

      {/* ─── Modal selector de avatar ──────────────────────────────────────── */}
      <Modal
        visible={modalAvatarVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalAvatarVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalAvatarVisible(false)}
        >
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Elige tu avatar</Text>
            <View style={styles.avatarGrid}>
              {AVATARES.map(av => (
                <TouchableOpacity
                  key={av.id}
                  style={[
                    styles.avatarOption,
                    av.id === avatarId && styles.avatarOptionActive,
                  ]}
                  onPress={() => handleSeleccionarAvatar(av.id)}
                >
                  <Text style={styles.avatarOptionEmoji}>{av.emoji}</Text>
                  <Text style={styles.avatarOptionLabel}>{av.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ─── HEADER ──────────────────────────────────────────────────────── */}
          <View style={styles.header}>

            {/* Avatar pulsable → abre modal */}
            <TouchableOpacity
              style={styles.avatarMock}
              onPress={() => setModalAvatarVisible(true)}
            >
              <Text style={styles.avatarEmoji}>{avatarActual.emoji}</Text>
              <View style={styles.avatarEditBadge}>
                <Text style={styles.avatarEditBadgeText}>✏️</Text>
              </View>
            </TouchableOpacity>

            {/* Nombre + lápiz */}
            {editandoNombre ? (
              <View style={styles.editNameRow}>
                <TextInput
                  style={styles.editNameInput}
                  value={nombreTemporal}
                  onChangeText={setNombreTemporal}
                  placeholder={nombreMostrado}
                  placeholderTextColor="#bdc3c7"
                  autoFocus
                  maxLength={30}
                  returnKeyType="done"
                  onSubmitEditing={handleGuardarNombre}
                />
                <TouchableOpacity onPress={handleGuardarNombre} style={styles.editNameBtn}>
                  <Text style={styles.editNameBtnText}>✓</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleCancelarEdicion} style={[styles.editNameBtn, styles.editNameBtnCancel]}>
                  <Text style={styles.editNameBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.nameRow}
                onPress={() => {
                  setNombreTemporal(displayName);
                  setEditandoNombre(true);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.userName}>{nombreMostrado}</Text>
                <Text style={styles.pencilIcon}>✏️</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.userEmail}>{user?.email}</Text>

            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
              <Text style={styles.logoutText}>Cerrar Sesión</Text>
            </TouchableOpacity>
          </View>

          {/* ─── ALERTAS ─────────────────────────────────────────────────────── */}
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

          {/* ─── ELECTRODOMÉSTICOS ───────────────────────────────────────────── */}
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.sectionTitle}>Mis Electrodomésticos</Text>
              <TouchableOpacity onPress={() => setMostrarFormulario(!mostrarFormulario)}>
                <Text style={styles.linkText}>{mostrarFormulario ? 'Cancelar' : '+ Añadir Nuevo'}</Text>
              </TouchableOpacity>
            </View>

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
                  style={[styles.textInput, excedePotencia && { borderColor: 'red' }]}
                  placeholder="Ej: 2.5"
                  keyboardType="numeric"
                  value={nuevoDispositivo.potencia}
                  onChangeText={(t) => setNuevoDispositivo({...nuevoDispositivo, potencia: t})}
                />

                {excedePotencia && (
                  <Text style={{ color: 'red', fontSize: 12, marginTop: 4 }}>
                    Solo puedes introducir una potencia de hasta {MAX_POTENCIA} kW.
                  </Text>
                )}

                <TouchableOpacity
                  style={[styles.primaryButton, excedePotencia && { backgroundColor: '#bdc3c7' }]}
                  onPress={handleAddDevice}
                  disabled={adding || excedePotencia}
                >
                  {adding ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>CREAR ELECTRODOMÉSTICO</Text>}
                </TouchableOpacity>
              </View>
            )}

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

          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa' },
  scrollContainer: { padding: 16, flexGrow: 1 },

  // ─── Header ──────────────────────────────────────────────────────────────
  header: { alignItems: 'center', marginBottom: 24, marginTop: 10 },
  avatarMock: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: '#ebf5fb',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2, borderColor: '#3498db',
  },
  avatarEmoji: { fontSize: 44 },
  avatarEditBadge: {
    position: 'absolute', bottom: 0, right: 0,
    backgroundColor: '#fff', borderRadius: 12,
    width: 24, height: 24,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#dfe6e9',
    elevation: 2,
  },
  avatarEditBadgeText: { fontSize: 12 },

  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  userName: { fontSize: 22, fontWeight: 'bold', color: '#2c3e50', textTransform: 'capitalize' },
  pencilIcon: { fontSize: 16, marginLeft: 4 },

  editNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  editNameInput: {
    borderBottomWidth: 2, borderBottomColor: '#3498db',
    fontSize: 20, fontWeight: 'bold', color: '#2c3e50',
    minWidth: 120, paddingVertical: 2, paddingHorizontal: 4,
    textTransform: 'capitalize',
  },
  editNameBtn: {
    backgroundColor: '#3498db', borderRadius: 20,
    width: 30, height: 30, justifyContent: 'center', alignItems: 'center',
  },
  editNameBtnCancel: { backgroundColor: '#bdc3c7' },
  editNameBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },

  userEmail: { fontSize: 14, color: '#7f8c8d', marginTop: 4 },
  logoutButton: { marginTop: 12, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, backgroundColor: '#ffeaa7' },
  logoutText: { color: '#d35400', fontWeight: 'bold', fontSize: 12 },

  // ─── Modal avatar ─────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center',
  },
  modalBox: {
    backgroundColor: '#fff', borderRadius: 16,
    padding: 20, width: '85%',
    elevation: 8,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#2c3e50', marginBottom: 16, textAlign: 'center' },
  avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  avatarOption: {
    width: '22%', alignItems: 'center',
    paddingVertical: 10, borderRadius: 12,
    borderWidth: 2, borderColor: 'transparent',
    backgroundColor: '#f8f9fa',
  },
  avatarOptionActive: { borderColor: '#3498db', backgroundColor: '#ebf5fb' },
  avatarOptionEmoji: { fontSize: 32 },
  avatarOptionLabel: { fontSize: 11, color: '#7f8c8d', marginTop: 4 },

  // ─── Cards y resto ────────────────────────────────────────────────────────
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