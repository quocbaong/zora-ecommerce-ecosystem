import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  id: string;             // local UUID — phân biệt giữa các (sản phẩm, biến thể) khác nhau
  productId: string;
  variantId?: string;
  variantName?: string;   // nhãn variant để hiển thị trong cart (vd: "Đỏ M")
  name: string;
  price: number;
  image: string;
  quantity: number;
  sellerId?: string;
}

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'id' | 'quantity'> & { quantity?: number }) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, qty: number) => void;
  clearCart: () => void;
  totalItems: () => number;
  totalPrice: () => number;
}

function genId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `local_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function sameVariant(a: { productId: string; variantId?: string }, b: { productId: string; variantId?: string }) {
  return a.productId === b.productId && (a.variantId ?? null) === (b.variantId ?? null);
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) =>
        set((state) => {
          const existing = state.items.find((i) => sameVariant(i, item));
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.id === existing.id
                  ? { ...i, quantity: i.quantity + (item.quantity || 1) }
                  : i
              ),
            };
          }
          return {
            items: [
              ...state.items,
              { ...item, id: genId(), quantity: item.quantity || 1 },
            ],
          };
        }),

      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((i) => i.id !== id),
        })),

      updateQuantity: (id, qty) =>
        set((state) => ({
          items: state.items
            .map((i) => (i.id === id ? { ...i, quantity: Math.max(0, qty) } : i))
            .filter((i) => i.quantity > 0),
        })),

      clearCart: () => set({ items: [] }),

      totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

      totalPrice: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    }),
    {
      name: 'cart-storage',
      version: 2,
      // Cart cũ (v1) lưu item không có id — gán id để các API mới hoạt động
      migrate: (persistedState: unknown, version: number) => {
        if (version < 2) {
          const state = persistedState as { items?: Array<Partial<CartItem>> } | undefined;
          if (state?.items) {
            state.items = state.items.map((it) => ({
              ...it,
              id: it.id || genId(),
            }));
          }
          return state as CartState;
        }
        return persistedState as CartState;
      },
    },
  ),
);
