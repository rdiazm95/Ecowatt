import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function WelcomeScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.container}>
      
      {/* SECCIÓN SUPERIOR: Logo y Eslogan */}
      <View style={styles.logoContainer}>
        {/* Aquí en el futuro puedes usar un <Image source={require('...')} /> */}
        <View style={styles.iconCircle}>
          <Text style={styles.logoIcon}>🌱⚡</Text>
        </View>
        <Text style={styles.logoText}>EcoWatt</Text>
        <Text style={styles.subtitle}>Tu energía, inteligente y sostenible</Text>
      </View>

      {/* SECCIÓN INFERIOR: Botones de Acción */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.primaryButton}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.primaryButtonText}>Iniciar Sesión</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.secondaryButton}
         onPress={() => navigation.navigate('Register')}
        >
          <Text style={styles.secondaryButtonText}>Crear una Cuenta</Text>
        </TouchableOpacity>

        <View style={styles.dividerContainer}>
          <View style={styles.line} />
          <Text style={styles.dividerText}>o</Text>
          <View style={styles.line} />
        </View>

        <TouchableOpacity 
            style={styles.guestButton}
             onPress={() => navigation.navigate('MainApp', { isGuest: true })} 
    >
        <Text style={styles.guestButtonText}>Continuar como Invitado</Text>
        </TouchableOpacity>
        </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'space-between',
  },
  logoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#ebf5fb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoIcon: {
    fontSize: 45,
  },
  logoText: {
    fontSize: 36,
    fontWeight: '800',
    color: '#2c3e50',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    marginTop: 8,
    textAlign: 'center',
  },
  buttonContainer: {
    padding: 24,
    paddingBottom: 40,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: '#f8f9fa',
  },
  primaryButton: {
    backgroundColor: '#27ae60', // Verde Eco
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#27ae60',
    marginBottom: 20,
  },
  secondaryButtonText: {
    color: '#27ae60',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#bdc3c7',
  },
  dividerText: {
    marginHorizontal: 10,
    color: '#7f8c8d',
    fontWeight: '600',
  },
  guestButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  guestButtonText: {
    color: '#3498db', // Azul
    fontSize: 15,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});