import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Tu nueva URL de Render (PRODUCCIÓN)
const API_URL = 'https://ecowatt-sgim.onrender.com';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor: Antes de que salga cualquier petición de la app, añade el token
apiClient.interceptors.request.use(
  async (config) => {
    // 1. Buscamos el token en SecureStore
    const token = await SecureStore.getItemAsync('userToken');
    
    // 2. Si hay token, lo pegamos en la cabecera de la petición
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);