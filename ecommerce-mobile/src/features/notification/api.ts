import apiClient from '../../api/client';
import { ApiResponse, Notification } from '../../types';

export const notificationApi = {
  getNotifications: async () => {
    const response = await apiClient.get<Notification[]>('/notifications');
    return response.data;
  },

  markAsRead: async (id: string) => {
    const response = await apiClient.patch<ApiResponse<any>>(`/notifications/${id}/read`);
    return response.data;
  },
};
