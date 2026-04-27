import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useRoute } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';

import DashboardScreen from '../screens/DashboardScreen';
import SimuladorScreen from '../screens/SimuladorScreen';
import ProfileScreen from '../screens/ProfileScreen';
import EstadisticasScreen from '../screens/EstadisticasScreen';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  const route = useRoute<any>();
  const isGuest = route.params?.isGuest || false;

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
        tabBarIcon: ({ focused, color, size }) => {
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
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ tabBarLabel: 'Hoy' }}
      />

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