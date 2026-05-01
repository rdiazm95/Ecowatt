import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { forgotPassword, resetPassword } from '../api/auth';

const { width } = Dimensions.get('window');

export default function ForgotPasswordScreen({ navigation }: any) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleRequestCode = async () => {
    if (!email.includes('@')) {
      Alert.alert('Error', 'Introduce un email válido');
      return;
    }

    setLoading(true);
    try {
      await forgotPassword(email);
      Alert.alert(
        '📧 Código enviado',
        `Te hemos enviado un código de 6 dígitos a ${email}.\n\nRevisa también la carpeta de spam.\n\nEl código caduca en 15 minutos.`
      );
      setStep(2);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Error al enviar el código');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (code.length !== 6) {
      Alert.alert('Error', 'El código debe ser de 6 dígitos');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email, code, newPassword);
      Alert.alert('¡Éxito!', 'Contraseña actualizada. Ya puedes iniciar sesión.');
      navigation.replace('Login');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Código incorrecto o caducado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>

      {/* ── Decoración de fondo ── */}
      <View style={styles.bgCircleLarge} />
      <View style={styles.bgCircleSmall} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* ── Botón volver ── */}
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>← Volver</Text>
          </TouchableOpacity>

          {/* ── Cabecera con icono ── */}
          <View style={styles.header}>
            <View style={styles.iconRingOuter}>
              <View style={styles.iconRingInner}>
                <View style={styles.iconCircle}>
                  <Text style={styles.logoIcon}>{step === 1 ? '📧' : '🔑'}</Text>
                </View>
              </View>
            </View>
            <Text style={styles.title}>
              {step === 1 ? 'Recuperar Contraseña' : 'Nueva Contraseña'}
            </Text>
            <Text style={styles.subtitle}>
              {step === 1
                ? 'Introduce tu email y te enviaremos un código de 6 dígitos.'
                : `Introduce el código enviado a ${email} y tu nueva contraseña.`}
            </Text>

            {/* Indicador de pasos */}
            <View style={styles.stepsRow}>
              <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]} />
              <View style={styles.stepLine} />
              <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]} />
            </View>
          </View>

          {/* ── Formulario ── */}
          <View style={styles.formCard}>
            {step === 1 ? (
              <>
                <Text style={styles.label}>Correo Electrónico</Text>
                <TextInput
                  style={styles.input}
                  placeholder="ejemplo@correo.com"
                  placeholderTextColor="#adb5bd"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                <TouchableOpacity
                  style={[styles.button, loading && styles.buttonDisabled]}
                  onPress={handleRequestCode}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Enviar Código</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.label}>Código de verificación</Text>
                <TextInput
                  style={[styles.input, styles.inputCode]}
                  placeholder="● ● ● ● ● ●"
                  placeholderTextColor="#adb5bd"
                  value={code}
                  onChangeText={setCode}
                  keyboardType="number-pad"
                  maxLength={6}
                />

                <Text style={styles.label}>Nueva Contraseña</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="#adb5bd"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                />

                <Text style={styles.label}>Confirmar Nueva Contraseña</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="#adb5bd"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                />

                <TouchableOpacity
                  style={[styles.button, loading && styles.buttonDisabled]}
                  onPress={handleResetPassword}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Actualizar Contraseña</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0faf4',
    overflow: 'hidden',
  },

  // ── Fondo decorativo ──
  bgCircleLarge: {
    position: 'absolute',
    width: width * 1.1,
    height: width * 1.1,
    borderRadius: width * 0.55,
    backgroundColor: '#27ae60',
    opacity: 0.07,
    top: -width * 0.5,
    left: -width * 0.05,
  },
  bgCircleSmall: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#27ae60',
    opacity: 0.06,
    bottom: 80,
    right: -50,
  },

  content: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },

  // ── Botón volver ──
  backBtn: {
    alignSelf: 'flex-start',
    marginBottom: 24,
    padding: 4,
  },
  backText: {
    color: '#3498db',
    fontWeight: '600',
    fontSize: 15,
  },

  // ── Cabecera ──
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  iconRingOuter: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2,
    borderColor: 'rgba(39, 174, 96, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconRingInner: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: 'rgba(39, 174, 96, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#27ae60',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#27ae60',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  logoIcon: {
    fontSize: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2c3e50',
    letterSpacing: 0.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 21,
    paddingHorizontal: 8,
    marginBottom: 20,
  },

  // ── Indicador de pasos ──
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#dee2e6',
  },
  stepDotActive: {
    backgroundColor: '#27ae60',
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: '#dee2e6',
    borderRadius: 1,
  },

  // ── Tarjeta del formulario ──
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#34495e',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    marginBottom: 20,
    color: '#2c3e50',
  },
  inputCode: {
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 8,
    color: '#27ae60',
  },
  button: {
    backgroundColor: '#27ae60',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: '#27ae60',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 0.3,
  },
});