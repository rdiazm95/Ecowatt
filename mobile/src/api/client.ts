import axios from 'axios';

// Ajusta si usas otro puerto o IP
const API_BASE_URL = 'http://10.0.2.2:3000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000,
});
