import axios from 'axios';
import Config from 'react-native-config';
import {getToken} from './tokenRef';

export const API_BASE_URL = Config.API_BASE_URL ?? 'http://10.0.2.2:8080';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(config => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  response => response,
  error => Promise.reject(error),
);
