import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.container}>

      {/* ── Decoración de fondo ── */}
      <View style={styles.bgCircleLarge} />
      <View style={styles.bgCircleMedium} />
      <View style={styles.bgCircleSmall} />

      {/* ── SECCIÓN SUPERIOR: Logo y Eslogan ── */}
      <View style={styles.logoContainer}>

        {/* Anillo exterior decorativo */}
        <View style={styles.iconRingOuter}>
          <View style={styles.iconRingInner}>
            <View style={styles.iconCircle}>
              <Text style={styles.logoIcon}>⚡</Text>
            </View>
          </View>
        </View>

        {/* Badge "ECO" encima del nombre */}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>🌱 ENERGÍA VERDE</Text>
        </View>

        <Text style={styles.logoText}>EcoWatt</Text>
        <Text style={styles.subtitle}>Tu energía, inteligente y sostenible</Text>

        {/* Tres pills de características */}
        <View style={styles.pillsRow}>
          <View style={styles.pill}>
            <Text style={styles.pillText}>📊 Monitoriza</Text>
          </View>
          <View style={styles.pill}>
            <Text style={styles.pillText}>💡 Ahorra</Text>
          </View>
          <View style={styles.pill}>
            <Text style={styles.pillText}>🌍 Cuida el planeta</Text>
          </View>
        </View>

      </View>

      {/* ── SECCIÓN INFERIOR: Botones de Acción ── */}
      <View style={styles.buttonContainer}>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('Login')}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>Iniciar Sesión</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('Register')}
          activeOpacity={0.85}
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
          activeOpacity={0.7}
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
    backgroundColor: '#f0faf4',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },

  // ── Círculos decorativos de fondo ──
  bgCircleLarge: {
    position: 'absolute',
    width: width * 1.1,
    height: width * 1.1,
    borderRadius: width * 0.55,
    backgroundColor: '#27ae60',
    opacity: 0.07,
    top: -width * 0.45,
    left: -width * 0.05,
  },
  bgCircleMedium: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#27ae60',
    opacity: 0.06,
    top: height * 0.15,
    right: -60,
  },
  bgCircleSmall: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#1a8a4a',
    opacity: 0.08,
    top: height * 0.3,
    left: -30,
  },

  // ── Logo ──
  logoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  iconRingOuter: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: 'rgba(39, 174, 96, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  iconRingInner: {
    width: 116,
    height: 116,
    borderRadius: 58,
    borderWidth: 2,
    borderColor: 'rgba(39, 174, 96, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#27ae60',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#27ae60',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 10,
  },
  logoIcon: {
    fontSize: 42,
  },

  // ── Badge ──
  badge: {
    backgroundColor: 'rgba(39, 174, 96, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(39, 174, 96, 0.3)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1e8449',
    letterSpacing: 1.2,
  },

  // ── Texto ──
  logoText: {
    fontSize: 42,
    fontWeight: '800',
    color: '#2c3e50',
    letterSpacing: 1.5,
    marginTop: 4,
  },
  subtitle: {
    fontSize: 15,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 22,
  },

  // ── Pills de características ──
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  pill: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  pillText: {
    fontSize: 12,
    color: '#2c3e50',
    fontWeight: '600',
  },

  // ── Panel de botones ──
  buttonContainer: {
    padding: 24,
    paddingBottom: 40,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryButton: {
    backgroundColor: '#27ae60',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#27ae60',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#27ae60',
    marginBottom: 20,
  },
  secondaryButtonText: {
    color: '#27ae60',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#e9ecef',
  },
  dividerText: {
    marginHorizontal: 12,
    color: '#adb5bd',
    fontWeight: '600',
    fontSize: 13,
  },
  guestButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  guestButtonText: {
    color: '#3498db',
    fontSize: 15,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});