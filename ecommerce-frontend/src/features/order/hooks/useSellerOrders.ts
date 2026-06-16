import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderService } from '@/features/order/services/orderService';
import type { Order } from '@/features/order/services/orderService';

export const useSellerOrders = () =>
  useQuery({
    queryKey: ['seller-orders'],
    queryFn: () => orderService.getSellerOrders(),
    staleTime: 15_000,
    refetchInterval: 30_000, // poll every 30s for new orders
  });

export const useUpdateOrderStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: Order['status'] }) =>
      orderService.updateOrderStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seller-orders'] });
    },
  });
};

export const useShipOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => orderService.shipOrder(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seller-orders'] });
    },
  });
};

export const useSellerApproveRefund = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => orderService.sellerApproveRefund(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seller-orders'] });
    },
  });
};
