import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native'; // ← CAMBIO
import * as SecureStore from 'expo-secure-store';

export default function AuthLoadingScreen() { // ← sin props
  const navigation = useNavigation<any>(); // ← hook en lugar de prop

  useEffect(() => {
    const checkSession = async () => {
      try {
        // Pequeño delay para asegurar que el navigator está montado
        await new Promise(resolve => setTimeout(resolve, 100));

        const token = await SecureStore.getItemAsync('userToken');
        if (token) {
          navigation.replace('MainApp');
        } else {
          navigation.replace('Welcome');
        }
      } catch {
        navigation.replace('Welcome');
      }
    };

    checkSession();
  }, [navigation]);

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