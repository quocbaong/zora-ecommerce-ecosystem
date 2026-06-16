import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types/api.types';
import { useCartStore } from './cartStore';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User) => void;
  updateUser: (partial: Partial<User>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: true }),
      updateUser: (partial) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...partial } : state.user,
        })),
      logout: () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        useCartStore.getState().clearCart();
        set({ user: null, isAuthenticated: false });
      },
    }),
    { name: 'auth-storage' }
  )
);
