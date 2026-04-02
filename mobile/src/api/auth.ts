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