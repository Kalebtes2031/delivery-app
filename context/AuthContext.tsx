import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { login as loginApi, getMe, toggleDeliveryStatus } from '@/services/api';
import type { User } from '@/types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  toggleOnlineStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => { },
  logout: async () => { },
  refreshUser: async () => { },
  toggleOnlineStatus: async () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('access');
      if (token) {
        const { data } = await getMe();
        setUser(data);
      }
    } catch (error) {
      console.log('No valid session found');
      await AsyncStorage.multiRemove(['access', 'refresh']);
    } finally {
      setIsLoading(false);
    }
  };

  const login = useCallback(async (username: string, password: string) => {
    const { data: tokens } = await loginApi(username, password);
    await AsyncStorage.setItem('access', tokens.access);
    await AsyncStorage.setItem('refresh', tokens.refresh);

    const { data: userData } = await getMe();
    setUser(userData);
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.multiRemove(['access', 'refresh']);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await getMe();
      setUser(data);
    } catch (error) {
      console.log('Failed to refresh user');
    }
  }, []);

  const toggleOnlineStatus = useCallback(async () => {
    console.log("Toggle Status Triggered");
    if (!user) {
      console.log("Toggle Failed: No User");
      return;
    }
    try {
      console.log("Calling toggleDeliveryStatus API...");
      await toggleDeliveryStatus();
      console.log("API Success, refreshing user data...");
      await refreshUser();
      console.log("User data refreshed.");
    } catch (error) {
      console.error('Failed to toggle online status:', error);
      throw error;
    }
  }, [user, refreshUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshUser,
        toggleOnlineStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
