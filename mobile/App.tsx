import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export default function AuthLoadingScreen({ navigation }: any) {
  useEffect(() => {
    const checkSession = async () => {
      try {
        const token = await SecureStore.getItemAsync('userToken');
        if (token) {
          // Sesión activa → va directo a la app sin pasar por login
          navigation.replace('MainApp');
        } else {
          // Sin sesión → pantalla de bienvenida
          navigation.replace('Welcome');
        }
      } catch {
        // Si falla SecureStore por cualquier razón, mandamos al Welcome
        navigation.replace('Welcome');
      }
    };

    checkSession();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>🌱⚡</Text>
      <Text style={styles.title}>EcoWatt</Text>
      <ActivityIndicator size="large" color="#27ae60" style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    gap: 12,
  },
  logo: {
    fontSize: 52,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#2c3e50',
    letterSpacing: 1,
  },
  spinner: {
    marginTop: 24,
  },
});