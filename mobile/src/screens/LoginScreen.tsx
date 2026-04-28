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
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { loginAndSaveToken } from '../api/auth';

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
      // SOLUCIÓN DEFINITIVA: Reseteamos el estado de la navegación.
      // Esto elimina las pantallas de 'Welcome' y 'Login' del historial.
      // Al deslizar hacia atrás en el Dashboard, la app se minimizará.
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
          <View style={styles.header}>
            <Text style={styles.title}>¡Hola de nuevo! 👋</Text>
            <Text style={styles.subtitle}>Inicia sesión para gestionar tu energía</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Correo Electrónico</Text>
            <TextInput 
              style={styles.input}
              placeholder="ejemplo@correo.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />

            <Text style={styles.label}>Contraseña</Text>
            <TextInput 
              style={styles.input}
              placeholder="••••••••"
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
              style={styles.loginButton} 
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginButtonText}>Entrar</Text>
              )}
            </TouchableOpacity>
          </View>

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
  container: { flex: 1, backgroundColor: '#ffffff' },
  scrollContent: { flexGrow: 1, padding: 24, justifyContent: 'center' }, 
  header: { marginBottom: 40 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#2c3e50', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#7f8c8d' },
  form: { marginBottom: 30 },
  label: { fontSize: 14, fontWeight: '600', color: '#34495e', marginBottom: 8 },
  input: { backgroundColor: '#f8f9fa', borderWidth: 1, borderColor: '#e9ecef', borderRadius: 10, padding: 14, fontSize: 16, marginBottom: 20, color: '#2c3e50' },
  forgotPassword: { alignSelf: 'flex-end', marginBottom: 24 },
  forgotPasswordText: { color: '#3498db', fontSize: 14, fontWeight: '600' },
  loginButton: { backgroundColor: '#27ae60', padding: 16, borderRadius: 12, alignItems: 'center' },
  loginButtonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  footerText: { color: '#7f8c8d', fontSize: 15 },
  registerText: { color: '#27ae60', fontSize: 15, fontWeight: 'bold' }
});