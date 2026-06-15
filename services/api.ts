import axios from 'axios';
import Config from '@/constants/Config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DeliveryAssignment, DeliveryStatus, LoginResponse, User, DeliveryReviewsResponse } from '@/types';

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

export const getDriverStats = async () => {
  return api.get<{ earnings: string; cash_on_hand: string; assigned_orders: number; pending_orders: number; total_orders: number }>('/deliveries/stats/');
};

// COD orders the driver has delivered but not yet remitted to admin (cash on hand)
export const getCashOnHandOrders = async () => {
  return api.get<DeliveryAssignment[]>('/deliveries/cash-on-hand/');
};

export const getDeliveryDetail = async (id: number) => {
  return api.get<DeliveryAssignment>(`/deliveries/${id}/`);
};

export const updateDeliveryStatus = async (id: number, status: DeliveryStatus) => {
  return api.patch<DeliveryAssignment>(`/deliveries/${id}/status/`, { status });
};

export const toggleDeliveryStatus = async () => {
  return api.post<{ is_online: boolean; message: string }>('/deliveries/toggle-status/');
};

// ── User Profile & Security ──

export const updateProfile = async (data: any) => {
  // If data contains an image, we should ideally use FormData
  // but if it's just text fields, JSON is fine.
  // Djoser /auth/users/me/ handles both.
  const headers = data instanceof FormData 
    ? { 'Content-Type': 'multipart/form-data' } 
    : {};
    
  return api.patch<User>('/auth/users/me/', data, { headers });
};

// ── Ratings & Reviews ──

// Ratings & reviews the authenticated driver received from customers
export const getMyDeliveryReviews = async () => {
  return api.get<DeliveryReviewsResponse>('/reviews/my-delivery-reviews/');
};

export const changePassword = async (currentPassword: string, newPassword: string) => {
  return api.post('/auth/users/set_password/', {
    current_password: currentPassword,
    new_password: newPassword,
  });
};

// ── Notifications (FCM) ──
export const registerDevice = (
  fcm_token: string,
  platform: 'android' | 'ios' | 'web',
  app: 'customer' | 'delivery' | 'admin',
) => api.post('/notifications/devices/', { fcm_token, platform, app });

export const unregisterDevice = (fcm_token: string) =>
  api.delete('/notifications/devices/', { data: { fcm_token } });

export const getNotifications = () => api.get('/notifications/');

export const getUnreadCount = () =>
  api.get<{ unread: number }>('/notifications/unread-count/');

export const markNotificationsRead = (ids?: number[]) =>
  api.post('/notifications/mark-read/', ids ? { ids } : {});

export default api;
