import { apiClient } from './client';
import * as SecureStore from 'expo-secure-store';

// ==========================================
// LOGIN
// ==========================================
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
// LOGOUT
// ==========================================
export async function logout() {
  await SecureStore.deleteItemAsync('userToken');
  console.log('Token eliminado. Sesión cerrada.');
}

// ==========================================
// COMPROBAR SESIÓN ACTIVA (para el splash)
// ==========================================
export async function getStoredToken(): Promise<string | null> {
  return await SecureStore.getItemAsync('userToken');
}

// ==========================================
// CONFIGURACIÓN DE ALERTAS
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
    throw error;
  }
}

// ==========================================
// RECUPERACIÓN DE CONTRASEÑA
// ==========================================

// Paso 1: Solicitar código al correo
export async function forgotPassword(email: string) {
  try {
    const response = await apiClient.post('/auth/forgot-password', { email });
    return response.data;
  } catch (error) {
    console.error('Error al solicitar recuperación de contraseña:', error);
    throw error; 
  }
}

// Paso 2: Validar código y crear nueva contraseña
export async function resetPassword(email: string, code: string, newPassword: string) {
  try {
    const response = await apiClient.post('/auth/reset-password', { 
      email, 
      code, 
      newPassword 
    });
    return response.data;
  } catch (error) {
    console.error('Error al restablecer la contraseña:', error);
    throw error;
  }
}