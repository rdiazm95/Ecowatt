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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { forgotPassword, resetPassword } from '../api/auth';

export default function ForgotPasswordScreen({ navigation }: any) {
  const [step, setStep] = useState(1); // 1: Email, 2: Código, 3: Nueva Pass
  const [loading, setLoading] = useState(false);
  
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Lógica para enviar el email
  const handleRequestCode = async () => {
    if (!email.includes('@')) {
      Alert.alert('Error', 'Introduce un email válido');
      return;
    }
    setLoading(true);
    try {
      await forgotPassword(email);
      Alert.alert('Enviado', 'Revisa tu bandeja de entrada (Mailtrap).');
      setStep(2);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Error al enviar el código');
    } finally {
      setLoading(false);
    }
  };

  // Lógica para cambiar la contraseña
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
      navigation.navigate('Login');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Código incorrecto o caducado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Volver</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Recuperar Contraseña</Text>
        
        {step === 1 ? (
          <View>
            <Text style={styles.subtitle}>Introduce tu email y te enviaremos un código de 6 dígitos.</Text>
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.button} onPress={handleRequestCode} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>ENVIAR CÓDIGO</Text>}
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <Text style={styles.subtitle}>Introduce el código enviado a {email} y tu nueva contraseña.</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Código de 6 dígitos"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={6}
            />

            <TextInput
              style={styles.input}
              placeholder="Nueva Contraseña"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />

            <TextInput
              style={styles.input}
              placeholder="Confirmar Nueva Contraseña"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />

            <TouchableOpacity style={styles.button} onPress={handleResetPassword} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>ACTUALIZAR CONTRASEÑA</Text>}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 30, flex: 1, justifyContent: 'center' },
  backBtn: { position: 'absolute', top: 20, left: 20 },
  backText: { color: '#3498db', fontWeight: '600' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#2c3e50', marginBottom: 10, textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#7f8c8d', marginBottom: 30, textAlign: 'center', lineHeight: 22 },
  input: { backgroundColor: '#f9f9f9', padding: 15, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#eee' },
  button: { backgroundColor: '#2c3e50', padding: 18, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});