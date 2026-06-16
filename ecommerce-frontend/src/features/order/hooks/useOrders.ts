import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { orderService, CreateOrderPayload } from '../services/orderService';

const ORDERS_KEY = ['orders'];

export function useOrders() {
  return useQuery({
    queryKey: ORDERS_KEY,
    queryFn: () => orderService.getOrders(),
  });
}

export function useOrderById(id: string) {
  return useQuery({
    queryKey: [...ORDERS_KEY, id],
    queryFn: () => orderService.getOrderById(id),
    enabled: !!id,
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateOrderPayload) => orderService.createOrder(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ORDERS_KEY });
    },
    onError: () => {
      toast.error('Không thể tạo đơn hàng. Vui lòng thử lại.');
    },
  });
}

export function useCancelOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => orderService.cancelOrder(id),
    onSuccess: (_, id) => {
      toast.success('Hủy đơn hàng thành công!');
      qc.invalidateQueries({ queryKey: ORDERS_KEY });
      qc.invalidateQueries({ queryKey: [...ORDERS_KEY, id] });
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.error || error?.response?.data?.message || error.message || 'Không thể hủy đơn hàng.';
      toast.error(`Lỗi: ${msg}`);
    },
  });
}

export function useUpdatePaymentMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, method }: { id: string, method: string }) => orderService.updatePaymentMethod(id, method),
    onSuccess: (_, { id }) => {
      toast.success('Đã thay đổi phương thức thanh toán!');
      qc.invalidateQueries({ queryKey: ORDERS_KEY });
      qc.invalidateQueries({ queryKey: [...ORDERS_KEY, id] });
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.error || error?.response?.data?.message || error.message || 'Lỗi khi thay đổi phương thức thanh toán.';
      toast.error(`Lỗi: ${msg}`);
    },
  });
}

export function useConfirmDelivery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => orderService.confirmDelivery(id),
    onSuccess: (_, id) => {
      toast.success('Xác nhận đã nhận hàng thành công!');
      qc.invalidateQueries({ queryKey: ORDERS_KEY });
      qc.invalidateQueries({ queryKey: [...ORDERS_KEY, id] });
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.error || error?.response?.data?.message || error.message || 'Lỗi xác nhận.';
      toast.error(`Lỗi: ${msg}`);
    },
  });
}

export function useRequestDispute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, type, reason, evidenceUrls, items }: { 
      id: string; 
      type: 'REFUND_ONLY' | 'RETURN_AND_REFUND';
      reason: string; 
      evidenceUrls: string[];
      items: { orderItemId: string; quantity: number }[];
    }) => 
      orderService.requestDispute(id, { type, reason, evidenceUrls, items }),
    onSuccess: (_, { id }) => {
      toast.success('Gửi yêu cầu trả hàng/khiếu nại thành công!');
      qc.invalidateQueries({ queryKey: ORDERS_KEY });
      qc.invalidateQueries({ queryKey: [...ORDERS_KEY, id] });
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.error || error?.response?.data?.message || error.message || 'Lỗi khiếu nại.';
      toast.error(`Lỗi: ${msg}`);
    },
  });
}

export function useChooseLogistics() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string, payload: { shippingMethod: 'PICKUP' | 'DROP_OFF' | 'SELF_ARRANGE', trackingCode?: string, carrier?: string } }) =>
      orderService.chooseLogistics(id, payload),
    onSuccess: (_, { id }) => {
      toast.success('Xác nhận phương thức vận chuyển thành công!');
      qc.invalidateQueries({ queryKey: ORDERS_KEY });
      qc.invalidateQueries({ queryKey: [...ORDERS_KEY, id] });
      qc.invalidateQueries({ queryKey: ['seller-orders'] });
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.error || error?.response?.data?.message || error.message || 'Lỗi hệ thống.';
      toast.error(`Lỗi: ${msg}`);
    },
  });
}

export function useConfirmReturnReceived() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => orderService.confirmReturnReceived(id),
    onSuccess: (_, id) => {
      toast.success('Đã xác nhận nhận hàng và cập nhật hệ thống!');
      qc.invalidateQueries({ queryKey: ORDERS_KEY });
      qc.invalidateQueries({ queryKey: [...ORDERS_KEY, id] });
      qc.invalidateQueries({ queryKey: ['seller-orders'] });
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.error || error?.response?.data?.message || error.message || 'Lỗi hệ thống.';
      toast.error(`Lỗi: ${msg}`);
    },
  });
}

export function useEscalateDispute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string, payload?: any }) => orderService.escalateDispute(id, payload),
    onSuccess: (_, { id }) => {
      toast.success('Đã gửi yêu cầu Admin phân xử thành công!');
      qc.invalidateQueries({ queryKey: ORDERS_KEY });
      qc.invalidateQueries({ queryKey: [...ORDERS_KEY, id] });
      qc.invalidateQueries({ queryKey: ['seller-orders'] });
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.error || error?.response?.data?.message || error.message || 'Lỗi hệ thống.';
      toast.error(`Lỗi: ${msg}`);
    },
  });
}
