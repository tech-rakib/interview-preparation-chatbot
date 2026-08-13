import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const CLOUD_API_URL = 'https://interview-preparation-chatbot-wq1z.onrender.com';
export const STORAGE_KEY_SERVER = 'user_server_url';

let onUnauthorizedCallback = null;

export const setUnauthorizedCallback = (callback) => {
  onUnauthorizedCallback = callback;
};

export const getLocalDevURL = () => {
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
  return 'http://10.0.2.2:8000';
};

export const getActiveBaseURL = async () => {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY_SERVER);
    if (saved && saved.trim()) {
      return saved.trim();
    }
  } catch (e) {
    // fallback
  }
  // Always default to Cloud Server (Render) so app works when PC is OFF!
  return CLOUD_API_URL;
};

export const setServerUrl = async (url) => {
  if (!url || !url.trim()) {
    await AsyncStorage.removeItem(STORAGE_KEY_SERVER);
  } else {
    let formatted = url.trim();
    if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
      formatted = 'http://' + formatted;
    }
    formatted = formatted.replace(/\/+$/, '');
    await AsyncStorage.setItem(STORAGE_KEY_SERVER, formatted);
  }
};

export const resetServerUrl = async () => {
  await AsyncStorage.removeItem(STORAGE_KEY_SERVER);
};

const api = axios.create({
  baseURL: CLOUD_API_URL,
  timeout: 60000, // 60 seconds to allow Render cold start
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  try {
    const activeUrl = await getActiveBaseURL();
    config.baseURL = activeUrl;

    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.error('Error in request interceptor:', error);
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


