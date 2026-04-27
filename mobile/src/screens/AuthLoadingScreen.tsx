import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export default function AuthLoadingScreen({ navigation }: any) {
  useEffect(() => {
    const checkToken = async () => {
      const token = await SecureStore.getItemAsync('userToken');
      if (token) {
        // Ya tiene sesión → va directo a la app
        navigation.replace('MainApp');
      } else {
        // Sin sesión → pantalla de bienvenida
        navigation.replace('Welcome');
      }
    };
    checkToken();
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#27ae60" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' },
});