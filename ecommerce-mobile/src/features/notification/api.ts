import apiClient from '../../api/client';
import { ApiResponse, Notification } from '../../types';

export const notificationApi = {
  getNotifications: async () => {
    const response = await apiClient.get<any>('/notifications');
    return response.data?.data || response.data?.content || [];
  },

  markAsRead: async (id: string) => {
    const response = await apiClient.put<ApiResponse<any>>(`/notifications/${id}/read`);
    return response.data;
  },

  markAllAsRead: async () => {
    const response = await apiClient.put<ApiResponse<any>>('/notifications/read-all');
    return response.data;
  },
};
