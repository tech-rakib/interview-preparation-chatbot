import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

let onUnauthorizedCallback = null;

export const setUnauthorizedCallback = (callback) => {
  onUnauthorizedCallback = callback;
};

const getBaseURL = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  try {
    const ConstantsModule = require('expo-constants');
    const Constants = ConstantsModule.default || ConstantsModule;
    const uri =
      Constants?.expoConfig?.hostUri ||
      Constants?.manifest?.debuggerHost ||
      Constants?.manifest2?.extra?.expoGo?.developer?.tool;

    if (uri && typeof uri === 'string') {
      const cleanUri = uri.replace(/^[a-zA-Z]+:\/\//, '');
      const ip = cleanUri.split(':')[0];
      const isIPv4 = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip);
      if (isIPv4 && ip !== '127.0.0.1' && ip !== '0.0.0.0') {
        return `http://${ip}:8000`;
      }
    }
  } catch (e) {
    // fallback if expo-constants is unavailable
  }

  return 'https://interview-preparation-chatbot-wq1z.onrender.com';
};

const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.error('Error fetching auth token from AsyncStorage:', error);
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      if (onUnauthorizedCallback) {
        onUnauthorizedCallback();
      }
    }
    return Promise.reject(error);
  }
);

export default api;

