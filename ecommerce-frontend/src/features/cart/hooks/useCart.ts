import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cartService, AddCartItemPayload } from '../services/cartService';
import { useAuthStore } from '@/stores/authStore';

const CART_KEY = ['cart'];

export function useCart() {
  const { isAuthenticated } = useAuthStore();
  return useQuery({
    queryKey: CART_KEY,
    queryFn: () => cartService.getCart(),
    enabled: isAuthenticated,
  });
}

export function useAddToCart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AddCartItemPayload) => cartService.addItem(payload),
    onSuccess: () => {
      toast.success('Đã thêm vào giỏ hàng');
      qc.invalidateQueries({ queryKey: CART_KEY });
    },
    onError: () => {
      toast.error('Không thể thêm vào giỏ hàng');
    },
  });
}

export function useUpdateCartItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      cartService.updateItem(itemId, quantity),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CART_KEY });
    },
    onError: () => {
      toast.error('Không thể cập nhật số lượng');
    },
  });
}

export function useRemoveCartItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => cartService.removeItem(itemId),
    onSuccess: () => {
      toast.success('Đã xóa sản phẩm khỏi giỏ hàng');
      qc.invalidateQueries({ queryKey: CART_KEY });
    },
    onError: () => {
      toast.error('Không thể xóa sản phẩm');
    },
  });
}

export function useClearCart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => cartService.clearCart(),
    onSuccess: () => {
      toast.success('Đã xóa tất cả sản phẩm trong giỏ hàng');
      qc.invalidateQueries({ queryKey: CART_KEY });
    },
    onError: () => {
      toast.error('Không thể xóa giỏ hàng');
    },
  });
}
