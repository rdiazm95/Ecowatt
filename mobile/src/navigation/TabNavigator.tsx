import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import DashboardScreen from '../screens/DashboardScreen';
import SimuladorScreen from '../screens/SimuladorScreen';
import ProfileScreen from '../screens/ProfileScreen';
import EstadisticasScreen from '../screens/EstadisticasScreen'; // <-- 1. Importamos la nueva pantalla

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#3498db',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      }}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen} 
        options={{ tabBarLabel: 'Hoy' }}
      />
      <Tab.Screen 
        name="Simulador" 
        component={SimuladorScreen} 
        options={{ tabBarLabel: 'Simulador' }}
      />
      <Tab.Screen 
        name="Estadisticas" // <-- 2. Añadimos la pestaña de Estadísticas
        component={EstadisticasScreen} 
        options={{ tabBarLabel: 'Estadísticas' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ tabBarLabel: 'Perfil' }}
      />
    </Tab.Navigator>
  );
}