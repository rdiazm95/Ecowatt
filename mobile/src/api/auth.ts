import { apiClient } from './client';
import * as SecureStore from 'expo-secure-store';

export async function loginAndSaveToken(email: string, pass: string) {
  try {
    console.log('Intentando hacer login...');
    const response = await apiClient.post('/auth/login', {
      email: email,
      password: pass,
    });

    const token = response.data.access_token;
    
    // Guardamos el token en el baúl del móvil
    await SecureStore.setItemAsync('userToken', token);
    console.log('¡Login exitoso y Token guardado en el móvil!');
    
    return true;
  } catch (error) {
    console.error('Error en el login:', error);
    return false;
  }
}

// ==========================================
// NUEVA FUNCIÓN: Guardar configuración de Alertas
// ==========================================
export async function updateAlertSettings(alertaActiva: boolean, precioObjetivo: number, pushToken?: string) {
  try {
    const response = await apiClient.patch('/users/alert-settings', {
      alertaActiva,
      precioObjetivo,
      pushToken,
    });
    return response.data;
  } catch (error) {
    console.error('Error al guardar la configuración de alertas en la API:', error);
    throw error; // Lanzamos el error para que la pantalla pueda mostrar un mensaje si falla
  }
}