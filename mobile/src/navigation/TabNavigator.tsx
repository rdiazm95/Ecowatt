import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Ionicons from '@expo/vector-icons/Ionicons';

import DashboardScreen from '../screens/DashboardScreen';
import SimuladorScreen from '../screens/SimuladorScreen';
import ProfileScreen from '../screens/ProfileScreen';
import EstadisticasScreen from '../screens/EstadisticasScreen';
import HistoryScreen from '../screens/HistoryScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// ─── Tab con las pestañas normales ───────────────────────────────────────────
// Recibe isGuest como prop desde el Stack exterior (no con useRoute)
function TabScreens({ route }: any) {
  const isGuest = route?.params?.isGuest || false;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#3498db',
        tabBarInactiveTintColor: '#95a5a6',
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          height: 68,
          paddingTop: 8,
          paddingBottom: 8,
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e8eef3',
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        tabBarIcon: ({ focused, color }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'ellipse';

          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Simulador') {
            iconName = focused ? 'flash' : 'flash-outline';
          } else if (route.name === 'Estadisticas') {
            iconName = focused ? 'stats-chart' : 'stats-chart-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={22} color={color} />;
        },
      })}
    >
      {/* Dashboard siempre visible, también para invitados */}
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ tabBarLabel: 'Hoy' }}
      />

      {/* El resto solo para usuarios registrados */}
      {!isGuest && (
        <>
          <Tab.Screen
            name="Simulador"
            component={SimuladorScreen}
            options={{ tabBarLabel: 'Simulador' }}
          />
          <Tab.Screen
            name="Estadisticas"
            component={EstadisticasScreen}
            options={{ tabBarLabel: 'Estadísticas' }}
          />
          <Tab.Screen
            name="Profile"
            component={ProfileScreen}
            options={{ tabBarLabel: 'Perfil' }}
          />
        </>
      )}
    </Tab.Navigator>
  );
}

// ─── Stack que envuelve el Tab + pantallas de detalle sin tab bar ─────────────
export default function TabNavigator({ route }: any) {
  // Leemos isGuest aquí y lo propagamos a TabScreens via initialParams
  const isGuest = route?.params?.isGuest || false;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="Tabs"
        component={TabScreens}
        initialParams={{ isGuest }}
      />
      <Stack.Screen
        name="History"
        component={HistoryScreen}
        options={{ animation: 'slide_from_right' }}
      />
    </Stack.Navigator>
  );
}