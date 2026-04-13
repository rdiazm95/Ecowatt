import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useRoute } from '@react-navigation/native'; // <-- 1. Importamos el lector de rutas

import DashboardScreen from '../screens/DashboardScreen';
import SimuladorScreen from '../screens/SimuladorScreen';
import ProfileScreen from '../screens/ProfileScreen';
import EstadisticasScreen from '../screens/EstadisticasScreen';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  // 2. Leemos los parámetros que nos llegan desde WelcomeScreen o Login
  const route = useRoute<any>(); 
  const isGuest = route.params?.isGuest || false; 

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#3498db',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      }}
    >
      {/* 3. La pantalla principal (Dashboard) es SIEMPRE pública */}
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen} 
        options={{ tabBarLabel: 'Hoy', tabBarIcon: () => <></> /* Si usas iconos, ponlos aquí */ }}
      />

      {/* 4. Las pantallas Premium SOLO se muestran si NO es invitado (!isGuest) */}
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