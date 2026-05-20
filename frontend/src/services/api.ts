import axios from 'axios';
import { env } from '../config/env';
//import { getSocket } from '../utils/socket';

const api = axios.create({
  baseURL: env.apiUrl,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('parking_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('parking_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
