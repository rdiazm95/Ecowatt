import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { loginAndSaveToken } from '../api/auth';

const { width } = Dimensions.get('window');

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Espera', 'Por favor, rellena todos los campos.');
      return;
    }

    setLoading(true);

    const success = await loginAndSaveToken(email, password);
    
    setLoading(false);

    if (success) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainApp' }],
      });
    } else {
      Alert.alert('Error', 'Credenciales incorrectas o problema de conexión.');
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
          contentContainerStyle={styles.scrollContent} 
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ── Cabecera con icono ── */}
          <View style={styles.header}>
            <View style={styles.iconRingOuter}>
              <View style={styles.iconRingInner}>
                <View style={styles.iconCircle}>
                  <Text style={styles.logoIcon}>⚡</Text>
                </View>
              </View>
            </View>
            <Text style={styles.title}>¡Hola de nuevo!</Text>
            <Text style={styles.subtitle}>Gestiona tu energía de forma inteligente</Text>
          </View>

          {/* ── Formulario ── */}
          <View style={styles.formCard}>

            <Text style={styles.label}>Correo Electrónico</Text>
            <TextInput 
              style={styles.input}
              placeholder="ejemplo@correo.com"
              placeholderTextColor="#adb5bd"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />

            <Text style={styles.label}>Contraseña</Text>
            <TextInput 
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#adb5bd"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <TouchableOpacity 
              style={styles.forgotPassword}
              onPress={() => navigation.navigate('ForgotPassword')}
            >
              <Text style={styles.forgotPasswordText}>¿Olvidaste tu contraseña?</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.loginButton, loading && styles.loginButtonDisabled]} 
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginButtonText}>Entrar</Text>
              )}
            </TouchableOpacity>

          </View>

          {/* ── Footer ── */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>¿No tienes cuenta? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerText}>Regístrate aquí</Text>
            </TouchableOpacity>
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

  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },

  // ── Cabecera ──
  header: {
    alignItems: 'center',
    marginBottom: 32,
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
    fontSize: 32,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#2c3e50',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 20,
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
    marginBottom: 24,
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
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: -12,
    marginBottom: 24,
    padding: 4,
  },
  forgotPasswordText: {
    color: '#3498db',
    fontSize: 13,
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: '#27ae60',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#27ae60',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },

  // ── Footer ──
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    color: '#7f8c8d',
    fontSize: 15,
  },
  registerText: {
    color: '#27ae60',
    fontSize: 15,
    fontWeight: 'bold',
  },
});