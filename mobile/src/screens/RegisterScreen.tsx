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
import { apiClient } from '../api/client';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert('Error', 'Rellena todos los campos');
      return;
    }

    if (!EMAIL_REGEX.test(email)) {
      Alert.alert('Error', 'Introduce un email con formato válido (ejemplo@dominio.com)');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/auth/register', { email, password });
      Alert.alert('¡Éxito!', 'Cuenta creada. Ahora puedes iniciar sesión.', [
        { text: 'Ir al Login', onPress: () => navigation.replace('Login') }
      ]);
    } catch (error) {
      Alert.alert('Error', 'No se pudo crear la cuenta. ¿Quizás el email ya existe?');
    } finally {
      setLoading(false);
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
          contentContainerStyle={styles.content} 
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Únete a EcoWatt 🌱</Text>
          <Text style={styles.subtitle}>Empieza a ahorrar energía hoy mismo</Text>
          
          <View style={styles.form}>
            <Text style={styles.label}>Email</Text>
            <TextInput 
              style={styles.input} 
              value={email} 
              onChangeText={setEmail} 
              keyboardType="email-address" 
              autoCapitalize="none"
              placeholder="ejemplo@dominio.com"
              placeholderTextColor="#adb5bd"
            />
            <Text style={styles.hint}>
              📧 A este correo recibirás el código de recuperación si alguna vez olvidas tu contraseña.
            </Text>

            <Text style={styles.label}>Contraseña</Text>
            <TextInput 
              style={styles.input} 
              value={password} 
              onChangeText={setPassword} 
              secureTextEntry 
            />

            <Text style={styles.label}>Repetir contraseña</Text>
            <TextInput 
              style={styles.input} 
              value={confirmPassword} 
              onChangeText={setConfirmPassword} 
              secureTextEntry 
            />

            <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Crear Cuenta</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backLink}>
              <Text style={styles.backLinkText}>¿Ya tienes cuenta? Volver al Login</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#2c3e50', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#7f8c8d', marginBottom: 32 },
  form: { width: '100%' },
  label: { fontSize: 14, fontWeight: '600', color: '#34495e', marginBottom: 8 },
  input: { backgroundColor: '#f8f9fa', borderWidth: 1, borderColor: '#e9ecef', borderRadius: 10, padding: 14, marginBottom: 8 },
  hint: { fontSize: 12, color: '#7f8c8d', marginBottom: 20, lineHeight: 18 },
  button: { backgroundColor: '#27ae60', padding: 16, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  backLink: { marginTop: 20, alignItems: 'center', padding: 10 },
  backLinkText: { color: '#3498db', fontWeight: 'bold', fontSize: 14 },
});