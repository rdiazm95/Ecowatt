import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// SUSTITUYE ESTA IP POR LA DE TU ORDENADOR (ej: 192.168.1.33)
// Mantén el :3000 al final
const API_URL = 'http://10.0.2.2:3000';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// "Interceptor": Antes de que salga cualquier petición de la app, haz esto:
apiClient.interceptors.request.use(
  async (config) => {
    // 1. Busca el token en la caja fuerte del móvil
    const token = await SecureStore.getItemAsync('userToken');
    
    // 2. Si hay token, pégalo en la cabecera (Authorization: Bearer <token>)
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);