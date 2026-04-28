import axios from 'axios';
import Config from '@/constants/Config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DeliveryAssignment, DeliveryStatus, LoginResponse, User } from '@/types';

// ── Axios Instance ──

const api = axios.create({
  baseURL: Config.API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request Interceptor: Attach JWT ──

api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('access');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response Interceptor: Auto-refresh on 401 ──

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const refreshToken = await AsyncStorage.getItem('refresh');

      if (!refreshToken) {
        await AsyncStorage.multiRemove(['access', 'refresh']);
        return Promise.reject(new Error('SESSION_EXPIRED'));
      }

      const { data } = await axios.post(
        `${Config.API_URL}/auth/jwt/refresh/`,
        { refresh: refreshToken }
      );

      if (data.access) {
        await AsyncStorage.setItem('access', data.access);
        originalRequest.headers.Authorization = `Bearer ${data.access}`;
        return api(originalRequest);
      } else {
        throw new Error('No access token in response');
      }
    } catch (refreshError) {
      await AsyncStorage.multiRemove(['access', 'refresh']);
      return Promise.reject(new Error('SESSION_EXPIRED'));
    }
  }
);

// ── Authentication ──

export const login = async (username: string, password: string) => {
  return api.post<LoginResponse>('/auth/jwt/create/', { username, password });
};

export const getMe = async () => {
  return api.get<User>('/auth/users/me/');
};

// ── Deliveries ──

export const getDeliveries = async (status?: DeliveryStatus) => {
  const params = status ? { status } : {};
  return api.get<DeliveryAssignment[]>('/deliveries/', { params });
};

export const getDeliveryDetail = async (id: number) => {
  return api.get<DeliveryAssignment>(`/deliveries/${id}/`);
};

export const updateDeliveryStatus = async (id: number, status: DeliveryStatus) => {
  return api.patch<DeliveryAssignment>(`/deliveries/${id}/status/`, { status });
};

export default api;
