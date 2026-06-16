import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authService } from '../services/authService';
import { useAuthStore } from '@/stores/authStore';
import { useCartStore } from '@/stores/cartStore';
import { cartService } from '@/features/cart/services/cartService';
import { AuthTokens, LoginPayload, RegisterPayload } from '@/types/api.types';
import { disconnectSocket } from '@/lib/socket';
import { disconnectStomp } from '@/lib/stompClient';

export const useLogin = () => {
  const setUser = useAuthStore((state) => state.setUser);
  const qc = useQueryClient();
  return useMutation<AuthTokens, Error, LoginPayload>({
    mutationFn: authService.login,
    onSuccess: async (res) => {
      if (res) {
        localStorage.setItem('access_token', res.accessToken);
        localStorage.setItem('refresh_token', res.refreshToken);
        setUser(res.user);

        // Force a fresh socket so it reconnects with the new auth token
        disconnectSocket();

        // Merge local cart vào server cart rồi xóa local
        const localItems = useCartStore.getState().items;
        if (localItems.length > 0) {
          try {
            await cartService.mergeCart(
              localItems.map((item) => ({
                productId: item.productId,
                variantId: item.variantId,
                variantName: item.variantName,
                name: item.name,
                image: item.image || null,
                sellerId: item.sellerId || null,
                quantity: item.quantity,
                price: item.price,
              }))
            );
          } catch {
            // Merge thất bại không chặn login flow
          }
          useCartStore.getState().clearCart();
        }

        qc.removeQueries({ queryKey: ['cart'] });
      }
    },
  });
};

export const useRegister = () => {
  return useMutation<{email: string; message: string}, Error, RegisterPayload>({
    mutationFn: authService.register,
  });
};

export const useLogout = () => {
  const logoutStore = useAuthStore((state) => state.logout);
  const qc = useQueryClient();

  const clearAllCache = () => {
    disconnectSocket();
    disconnectStomp();
    logoutStore(); // xóa auth-storage trong localStorage (bao gồm avatarUrl)
    qc.removeQueries({ queryKey: ['cart'] });
    qc.removeQueries({ queryKey: ['user'] }); // xóa cache profile
    qc.clear(); // xóa toàn bộ React Query cache
  };

  return useMutation<string, Error, void>({
    mutationFn: authService.logout,
    onSuccess: clearAllCache,
    onError: clearAllCache,
  });
};
