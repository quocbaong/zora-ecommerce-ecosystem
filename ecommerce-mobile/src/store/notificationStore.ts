import { create } from 'zustand';
import { notificationApi } from '../features/notification/api';
import { Notification } from '../types';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  receiveNotification: (notification: Notification) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  
  fetchNotifications: async () => {
    try {
      const data = await notificationApi.getNotifications();
      const notifs = data || [];
      const unreadCount = notifs.filter((n: Notification) => !n.isRead).length;
      set({ notifications: notifs, unreadCount });
    } catch (error) {
      console.error('Failed to fetch notifications in store', error);
    }
  },

  markAsRead: async (id: string) => {
    try {
      await notificationApi.markAsRead(id);
      set((state) => {
        const notifs = state.notifications.map(n => n.id === id ? { ...n, isRead: true } : n);
        const unreadCount = notifs.filter(n => !n.isRead).length;
        return { notifications: notifs, unreadCount };
      });
    } catch (error) {
      console.error('Failed to mark notification as read in store', error);
    }
  },

  receiveNotification: (notification: Notification) => {
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1
    }));
  }
}));
