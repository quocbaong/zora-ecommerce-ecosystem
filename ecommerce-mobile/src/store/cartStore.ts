import { create } from 'zustand';
import apiClient from '../api/client';
import { Product, ProductVariant } from '../types';

export interface CartItem {
  id: string; // CartItem ID in DB
  productId: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  variantId?: string;
  variantName?: string;
  sellerId: string;
  shopName?: string;
}

interface CartState {
  items: CartItem[];
  loading: boolean;
  fetchCart: () => Promise<void>;
  addItem: (product: Product, variant?: ProductVariant, quantity?: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  getItemCount: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  loading: false,

  fetchCart: async () => {
    set({ loading: true });
    try {
      const response = await apiClient.get('/cart');
      const data = response.data?.data || response.data;
      if (data && data.items) {
        set({ items: data.items, loading: false });
      } else {
        set({ items: [], loading: false });
      }
    } catch (error) {
      console.error('Lỗi khi lấy giỏ hàng:', error);
      set({ loading: false });
    }
  },

  addItem: async (product, variant, quantity = 1) => {
    try {
      await apiClient.post('/cart/items', {
        productId: product.id,
        quantity,
        price: product.price + (variant?.additionalPrice || 0),
        name: product.name,
        image: product.images?.[0] || '',
        variantId: variant?.id,
        variantName: variant ? `${variant.color || ''} ${variant.size || ''}` : undefined,
        sellerId: product.sellerId,
      });
      await get().fetchCart();
    } catch (error) {
      console.error('Lỗi thêm giỏ hàng:', error);
    }
  },

  removeItem: async (itemId) => {
    try {
      await apiClient.delete(`/cart/items/${itemId}`);
      await get().fetchCart();
    } catch (error) {
      console.error('Lỗi xoá sản phẩm:', error);
    }
  },

  updateQuantity: async (itemId, quantity) => {
    if (quantity <= 0) {
      return get().removeItem(itemId);
    }
    try {
      // Optimistic update for smooth UI
      const items = [...get().items];
      const idx = items.findIndex(i => i.id === itemId);
      if (idx > -1) {
        items[idx].quantity = quantity;
        set({ items });
      }
      
      await apiClient.put(`/cart/items/${itemId}?quantity=${quantity}`);
      await get().fetchCart(); // Ensure sync
    } catch (error) {
      console.error('Lỗi cập nhật số lượng:', error);
      await get().fetchCart(); // Revert on error
    }
  },

  clearCart: async () => {
    try {
      await apiClient.delete('/cart');
      set({ items: [] });
    } catch (error) {
      console.error('Lỗi xoá giỏ hàng:', error);
    }
  },

  getItemCount: () => {
    const { items } = get();
    return items.reduce((total, item) => total + item.quantity, 0);
  },
}));
