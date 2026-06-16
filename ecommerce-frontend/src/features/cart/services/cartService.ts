import api from '@/lib/axios';

export interface CartResponse {
  success: boolean;
  data: {
    userId: string;
    items: CartItemResponse[];
    totalQuantity: number;
    totalPrice: number;
  };
  message: string;
}

export interface CartItemResponse {
  id: string;
  productId: string;
  variantId: string | null;
  variantName: string | null;
  name: string;
  image: string | null;
  sellerId: string | null;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface AddCartItemPayload {
  productId: string;
  quantity: number;
  price: number;
  name: string;
  image?: string | null;
  variantId?: string;
  variantName?: string;
  sellerId?: string | null;
}

export interface MergeCartItemPayload {
  productId: string;
  variantId?: string | null;
  variantName?: string | null;
  name: string;
  image?: string | null;
  sellerId?: string | null;
  quantity: number;
  price: number;
}

export const cartService = {
  getCart: () => api.get<CartResponse>('/api/cart').then((r) => r.data),

  mergeCart: (items: MergeCartItemPayload[]) =>
    api.post<{ success: boolean; message: string }>('/api/cart/merge', { items }).then((r) => r.data),

  addItem: (payload: AddCartItemPayload) =>
    api.post<{ success: boolean; message: string }>('/api/cart/items', payload).then((r) => r.data),

  updateItem: (itemId: string, quantity: number) =>
    api
      .put<{ success: boolean; message: string }>(`/api/cart/items/${itemId}`, null, {
        params: { quantity },
      })
      .then((r) => r.data),

  removeItem: (itemId: string) =>
    api.delete<{ success: boolean; message: string }>(`/api/cart/items/${itemId}`).then((r) => r.data),

  clearCart: () =>
    api.delete<{ success: boolean; message: string }>('/api/cart').then((r) => r.data),
};
