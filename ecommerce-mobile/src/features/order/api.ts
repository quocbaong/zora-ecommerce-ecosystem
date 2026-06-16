import apiClient from '../../api/client';
import { ApiResponse, Order } from '../../types';

export const orderApi = {
  createOrder: async (payload: any) => {
    const response = await apiClient.post<ApiResponse<Order>>('/orders', payload);
    return response.data;
  },

  getOrders: async () => {
    const response = await apiClient.get<any>('/orders/my');
    return response.data?.content || response.data?.data || response.data;
  },

  getOrderById: async (id: string) => {
    const response = await apiClient.get<ApiResponse<Order>>(`/orders/${id}`);
    return response.data.data;
  },
};
