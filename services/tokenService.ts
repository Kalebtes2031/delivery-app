import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Config from '@/constants/Config';

export const tokenService = {
  async getAccessToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('access');
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  },

  async getRefreshToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('refresh');
    } catch (error) {
      console.error('Error getting refresh token:', error);
      return null;
    }
  },

  async setTokens(access: string, refresh: string): Promise<void> {
    try {
      await AsyncStorage.setItem('access', access);
      await AsyncStorage.setItem('refresh', refresh);
    } catch (error) {
      console.error('Error saving tokens:', error);
    }
  },

  async clearTokens(): Promise<void> {
    try {
      await AsyncStorage.multiRemove(['access', 'refresh']);
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  },

  async refreshToken(): Promise<string | null> {
    try {
      const refreshToken = await this.getRefreshToken();
      if (!refreshToken) return null;

      const response = await axios.post(
        `${Config.API_URL}/auth/jwt/refresh/`,
        { refresh: refreshToken }
      );

      if (response.data.access) {
        await this.setTokens(response.data.access, refreshToken);
        return response.data.access;
      }
      return null;
    } catch (error) {
      console.error('Token refresh failed:', error);
      await this.clearTokens();
      return null;
    }
  },
};
