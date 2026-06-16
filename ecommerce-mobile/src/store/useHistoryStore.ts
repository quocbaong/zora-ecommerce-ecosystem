import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product } from '../types';

interface HistoryState {
  recentlyViewed: Product[];
  addProductToHistory: (product: Product) => void;
  clearHistory: () => void;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set) => ({
      recentlyViewed: [],
      addProductToHistory: (product: Product) => set((state) => {
        const filtered = state.recentlyViewed.filter((p) => p.id !== product.id);
        const updated = [product, ...filtered].slice(0, 10); // Keep last 10
        return { recentlyViewed: updated };
      }),
      clearHistory: () => set({ recentlyViewed: [] }),
    }),
    {
      name: 'zora-history-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
