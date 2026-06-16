import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import socketService from '../services/socket/socketService';

interface User {
  id: string;
  email: string;
  role: string;
  fullName?: string;
  avatarUrl?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (accessToken: string, refreshToken: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (accessToken, refreshToken, user) => {
    await SecureStore.setItemAsync('access_token', accessToken);
    await SecureStore.setItemAsync('refresh_token', refreshToken);
    await SecureStore.setItemAsync('user_id', user.id);
    await SecureStore.setItemAsync('user_data', JSON.stringify(user));
    socketService.disconnect();
    socketService.connect();
    set({ user, isAuthenticated: true });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('refresh_token');
    await SecureStore.deleteItemAsync('user_id');
    await SecureStore.deleteItemAsync('user_data');
    socketService.disconnect();
    set({ user: null, isAuthenticated: false });
  },

  initialize: async () => {
    set({ isLoading: true });
    try {
      const token = await SecureStore.getItemAsync('access_token');
      const userData = await SecureStore.getItemAsync('user_data');
      if (token && userData) {
        const userId = JSON.parse(userData).id;
        try {
          const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'https://47-130-20-137.sslip.io/api'}/users/${userId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (!response.ok && (response.status === 500 || response.status === 401)) {
            throw new Error("Token validation failed on server");
          }
          socketService.disconnect();
          socketService.connect();
          set({ user: JSON.parse(userData), isAuthenticated: true });
        } catch (apiError) {
          await SecureStore.deleteItemAsync('access_token');
          await SecureStore.deleteItemAsync('refresh_token');
          await SecureStore.deleteItemAsync('user_id');
          await SecureStore.deleteItemAsync('user_data');
          set({ user: null, isAuthenticated: false });
          console.error("Forced logout due to invalid token on current server", apiError);
        }
      }
    } catch (error) {
      console.error('Auth initialization failed', error);
    } finally {
      set({ isLoading: false });
    }
  },
}));
