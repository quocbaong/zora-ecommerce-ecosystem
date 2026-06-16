import { useQuery } from '@tanstack/react-query';
import { orderService } from '@/features/order/services/orderService';
import { productService } from '@/features/product/services/productService';
import { useAuthStore } from '@/stores/authStore';

const STALE = 60_000;

export const useSellerStats = () =>
  useQuery({
    queryKey: ['seller-stats'],
    queryFn: () => orderService.getSellerStats(),
    staleTime: STALE,
  });

export const useSellerRevenue = (range: 'day' | 'month') =>
  useQuery({
    queryKey: ['seller-revenue', range],
    queryFn: () => orderService.getSellerRevenueChart(range),
    staleTime: STALE,
  });

export const useTopProducts = (limit = 5) =>
  useQuery({
    queryKey: ['seller-top-products', limit],
    queryFn: () => orderService.getTopProducts(limit),
    staleTime: STALE,
  });

export const useSellerTrends = () =>
  useQuery({
    queryKey: ['seller-trends'],
    queryFn: () => orderService.getSellerTrends(),
    staleTime: STALE,
  });

export const useLowStockProducts = (threshold = 5) => {
  const sellerId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: ['seller-low-stock', sellerId, threshold],
    queryFn: async () => {
      if (!sellerId) return [];
      const res = await productService.getAll({ sellerId, size: 100 });
      const products = res?.content ?? [];
      return products.filter((p) => p.stock <= threshold && p.status === 'ACTIVE');
    },
    enabled: !!sellerId,
    staleTime: STALE,
  });
};
