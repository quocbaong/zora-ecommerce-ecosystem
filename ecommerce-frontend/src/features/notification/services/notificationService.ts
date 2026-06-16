import api from '@/lib/axios';
import { Notification } from '@/types/api.types';

export const notificationService = {
  getMyNotifications: (userId: string) =>
    api.get(`/api/notifications?userId=${userId}`).then((r) => {
      const raw = r.data;
      if (Array.isArray(raw)) return raw as Notification[];
      if (Array.isArray(raw?.data)) return raw.data as Notification[];
      return [] as Notification[];
    }),

  markAsRead: (notificationId: string) =>
    api.put(`/api/notifications/${notificationId}/read`).then((r) => r.data),

  markAllAsRead: () =>
    api.put(`/api/notifications/read-all`).then((r) => r.data),
};
