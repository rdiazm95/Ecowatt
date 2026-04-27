import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Notifications from 'expo-notifications'; // ← DESCOMENTADO: Necesario para manejar las notificaciones

import WelcomeScreen from './src/screens/WelcomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import TabNavigator from './src/navigation/TabNavigator';
import AuthLoadingScreen from './src/screens/AuthLoadingScreen';

// ← DESCOMENTADO: Configura cómo se comportan las notificaciones cuando la app está abierta
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const Stack = createNativeStackNavigator();

// Mantenemos esto comentado porque ya pides los permisos y el token directamente en ProfileScreen.tsx
// async function registerForPushNotifications() {
//   const { status } = await Notifications.requestPermissionsAsync();
//   if (status !== 'granted') {
//     alert('¡Necesitamos permiso para enviarte alertas de precio!');
//     return;
//   }
//   const token = await Notifications.getExpoPushTokenAsync({
//     projectId: '33844626-f91a-423e-b5a3-d725f3081327',
//   });
//   console.log('Token Push:', token.data);
//   return token.data;
// }

export default function App() {
  useEffect(() => {
    // registerForPushNotifications();
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="AuthLoading" // Arranca en el check de sesión
        screenOptions={{ headerShown: false }}
      >
        {/* Check de sesión al arrancar */}
        <Stack.Screen name="AuthLoading" component={AuthLoadingScreen} />

        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />

        {/* Recuperar Contraseña */}
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />

        <Stack.Screen name="MainApp" component={TabNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}