import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function SimuladorScreen() {
  return (
    <View style={styles.center}>
      <Text style={styles.title}>Simulador de Dispositivos</Text>
      <Text>Próximamente: Cálculos en tiempo real</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
});