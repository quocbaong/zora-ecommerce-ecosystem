import api from '@/lib/axios';
import type { CreateOrderPayload, ShippingAddress, OrderItem } from '@/types/api.types';

export interface Order {
  id: string;
  userId: string;
  totalPrice: number;
  status: 'PENDING' | 'CONFIRMED' | 'SHIPPING' | 'DELIVERED' | 'CANCELLED' | 'DISPUTED' | 'REFUNDED';
  createdAt: string;
  updatedAt?: string;
  isDisputeResolved?: boolean;
  items?: OrderItem[];
  shippingAddress?: ShippingAddress;
  paymentMethod?: string;
  paymentStatus?: string;
  trackingNumber?: string;
  shippingProvider?: string;
  estimatedDeliveryDate?: string;
  deliveredAt?: string;
  refundRequest?: {
    id: string;
    type: 'REFUND_ONLY' | 'RETURN_AND_REFUND';
    status: 'REQUESTED' | 'UNDER_REVIEW' | 'WAITING_FOR_RETURN' | 'RETURN_SHIPPING' | 'RETURN_RECEIVED' | 'REFUNDED' | 'REJECTED';
    reason: string;
    evidenceUrls?: string[];
    createdAt: string;
    updatedAt?: string;
    items?: {
      orderItemId: string;
      quantity: number;
    }[];
    returnShipment?: {
      shippingMethod: 'PICKUP' | 'DROP_OFF' | 'SELF_ARRANGE';
      trackingCode?: string;
      carrier?: string;
      status: string;
      shippedAt?: string;
    };
  };
}

export interface SellerOrdersResponse {
  content: Order[];
  totalElements: number;
  totalPages: number;
  pageable: { pageNumber: number; pageSize: number };
  last: boolean;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  pageable: { pageNumber: number; pageSize: number };
  last: boolean;
}

export interface SellerStats {
  totalOrders: number;
  totalRevenue: number;
  activeProducts: number;
  newOrdersToday: number;
}

export interface RevenueDataPoint {
  label: string;
  revenue: number;
  orders: number;
}

export interface TopProduct {
  productId: string;
  productName: string;
  productImage: string | null;
  totalSold: number;
  totalRevenue: number;
}

export interface TrendingProduct {
  productId: string;
  productName: string;
  productImage: string | null;
  revenueLast7d: number;
  revenuePrev7d: number;
  soldLast7d: number;
}

export interface SellerTrends {
  revenueLast7d: number;
  revenuePrev7d: number;
  ordersLast7d: number;
  ordersPrev7d: number;
  cancelledLast7d: number;
  cancelledPrev7d: number;
  dailyTrend: RevenueDataPoint[];
  topMovers: TrendingProduct[];
}

export type { CreateOrderPayload };

export const orderService = {
  createOrder: (payload: CreateOrderPayload) =>
    api.post<Order>('/api/orders', payload).then((r) => r.data),

  getMyOrders: () =>
    api.get<PageResponse<Order>>('/api/orders/my', { params: { size: 100 } }).then((r) => r.data.content),

  getOrders: () =>
    api.get<PageResponse<Order>>('/api/orders/my', { params: { size: 100 } }).then((r) => r.data.content),

  getOrderById: (id: string) =>
    api.get<Order>(`/api/orders/${id}`).then((r) => r.data),

  deleteOrder: (id: string) =>
    api.delete<Order>(`/api/orders/${id}`).then((r) => r.data),

  cancelOrder: (id: string) =>
    api.patch<Order>(`/api/orders/${id}/cancel`).then((r) => r.data),

  updatePaymentMethod: (id: string, paymentMethod: string) =>
    api.patch<Order>(`/api/orders/${id}/payment-method`, null, { params: { paymentMethod } }).then((r) => r.data),

  // ─── Seller ─────────────────────────────────────────────────────

  getSellerOrders: () =>
    api.get<PageResponse<Order>>('/api/orders/seller', { params: { size: 1000 } }).then((r) => r.data.content),

  getSellerStats: () =>
    api.get<SellerStats>('/api/orders/seller/stats').then((r) => r.data),

  getSellerRevenueChart: (range: 'day' | 'month') =>
    api.get<RevenueDataPoint[]>('/api/orders/seller/revenue', { params: { range } }).then((r) => r.data),

  getTopProducts: (limit = 5) =>
    api.get<TopProduct[]>('/api/orders/seller/top-products', { params: { limit } }).then((r) => r.data),

  getSellerTrends: () =>
    api.get<SellerTrends>('/api/orders/seller/trends').then((r) => r.data),

  updateOrderStatus: (id: string, status: Order['status']) =>
    api.patch<Order>(`/api/orders/${id}/status`, null, { params: { status } }).then((r) => r.data),

  shipOrder: (id: string) =>
    api.patch<Order>(`/api/orders/${id}/ship`).then((r) => r.data),

  confirmDelivery: (id: string) =>
    api.patch<Order>(`/api/orders/${id}/deliver`).then((r) => r.data),

  uploadEvidence: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<{ url: string }>('/api/orders/upload-evidence', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data.url);
  },

  requestDispute: (id: string, payload: {
    type: 'REFUND_ONLY' | 'RETURN_AND_REFUND';
    reason: string;
    evidenceUrls: string[];
    items: { orderItemId: string; quantity: number }[];
  }) =>
    api.post<Order>(`/api/orders/${id}/dispute`, payload).then((r) => r.data),

  chooseLogistics: (id: string, payload: {
    shippingMethod: 'PICKUP' | 'DROP_OFF' | 'SELF_ARRANGE';
    trackingCode?: string;
    carrier?: string;
  }) =>
    api.post<Order>(`/api/orders/${id}/dispute/logistics`, payload).then((r) => r.data),

  confirmReturnReceived: (id: string) => api.post<Order>(`/api/orders/${id}/confirm-received`).then(r => r.data),
  escalateDispute: async (id: string, payload?: any) => {
    const { data } = await api.post(`/api/orders/${id}/dispute/escalate`, payload || {});
    return data;
  },

  sellerApproveRefund: (id: string) =>
    api.post<Order>(`/api/orders/${id}/seller-approve-refund`).then((r) => r.data),
};
