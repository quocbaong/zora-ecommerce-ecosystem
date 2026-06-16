import { create } from 'zustand';
import { Product, ProductVariant } from '../types';

interface CartItem {
  productId: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  variantId?: string;
  variantName?: string;
  sellerId: string;
  shopName: string;
}

interface CartState {
  items: CartItem[];
  addItem: (product: Product, variant?: ProductVariant, quantity?: number) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQuantity: (productId: string, quantity: number, variantId?: string) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],

  addItem: (product, variant, quantity = 1) => {
    const { items } = get();
    const variantId = variant?.id;
    const variantName = variant ? `${variant.color || ''} ${variant.size || ''}` : undefined;
    
    const existingIndex = items.findIndex(
      (item) => item.productId === product.id && item.variantId === variantId
    );

    if (existingIndex > -1) {
      const updatedItems = [...items];
      updatedItems[existingIndex].quantity += quantity;
      set({ items: updatedItems });
    } else {
      const newItem: CartItem = {
        productId: product.id,
        name: product.name,
        price: product.price + (variant?.additionalPrice || 0),
        image: product.images[0] || '',
        quantity,
        variantId,
        variantName,
        sellerId: product.sellerId || 'unknown',
        shopName: product.verified ? 'Zora Mall Store' : 'Shop ZORA',
      };
      set({ items: [...items, newItem] });
    }
  },

  removeItem: (productId, variantId) => {
    const { items } = get();
    set({
      items: items.filter(
        (item) => !(item.productId === productId && item.variantId === variantId)
      ),
    });
  },

  updateQuantity: (productId, quantity, variantId) => {
    const { items } = get();
    if (quantity <= 0) {
      get().removeItem(productId, variantId);
      return;
    }
    
    set({
      items: items.map((item) =>
        item.productId === productId && item.variantId === variantId
          ? { ...item, quantity }
          : item
      ),
    });
  },

  clearCart: () => set({ items: [] }),

  getTotalPrice: () => {
    const { items } = get();
    return items.reduce((total, item) => total + item.price * item.quantity, 0);
  },

  getItemCount: () => {
    const { items } = get();
    return items.reduce((total, item) => total + item.quantity, 0);
  },
}));
