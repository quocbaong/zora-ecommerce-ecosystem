import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import apiClient from '../api/client';

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
  updateUser: (partial: Partial<User>) => Promise<void>;
  fetchProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (accessToken, refreshToken, user) => {
    await SecureStore.setItemAsync('access_token', accessToken);
    await SecureStore.setItemAsync('refresh_token', refreshToken);
    await SecureStore.setItemAsync('user_id', user.id);
    await SecureStore.setItemAsync('user_data', JSON.stringify(user));
    set({ user, isAuthenticated: true });
    get().fetchProfile();
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('refresh_token');
    await SecureStore.deleteItemAsync('user_id');
    await SecureStore.deleteItemAsync('user_data');
    set({ user: null, isAuthenticated: false });
  },

  updateUser: async (partial: Partial<User>) => {
    const currentUser = get().user;
    if (currentUser) {
      const updatedUser = { ...currentUser, ...partial };
      await SecureStore.setItemAsync('user_data', JSON.stringify(updatedUser));
      set({ user: updatedUser });
    }
  },

  fetchProfile: async () => {
    try {
      const response = await apiClient.get<any>('/users/me');
      const data = response.data?.data || response.data;
      if (data) {
        const patch: Partial<User> = {};
        if (data.fullName) patch.fullName = data.fullName;
        if (data.avatarUrl) patch.avatarUrl = data.avatarUrl;
        if (Object.keys(patch).length > 0) {
          await get().updateUser(patch);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch user profile in authStore', err);
    }
  },

  initialize: async () => {
    set({ isLoading: true });
    try {
      const token = await SecureStore.getItemAsync('access_token');
      const userData = await SecureStore.getItemAsync('user_data');
      if (token && userData) {
        set({ user: JSON.parse(userData), isAuthenticated: true });
        get().fetchProfile();
      }
    } catch (error) {
      console.error('Auth initialization failed', error);
    } finally {
      set({ isLoading: false });
    }
  },
}));
