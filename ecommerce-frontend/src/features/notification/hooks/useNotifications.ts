import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationService } from '../services/notificationService';
import { useNotificationStore } from '@/stores/notificationStore';
import { useEffect } from 'react';

export const useNotifications = (userId: string | undefined) => {
  const setNotifications = useNotificationStore((s) => s.setNotifications);

  const query = useQuery({
    queryKey: ['notifications', userId],
    queryFn: () => notificationService.getMyNotifications(userId!),
    enabled: !!userId,
    staleTime: 0, // always re-fetch so read status is accurate after reload
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (query.data) setNotifications(query.data);
  }, [query.data, setNotifications]);

  return query;
};

export const useMarkNotificationRead = () => {
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: notificationService.markAsRead,
    onMutate: (id) => {
      // Optimistic update in store
      markAsRead(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: () => {
      // Revert optimistic update by refetching
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};

export const useMarkAllNotificationsRead = () => {
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: notificationService.markAllAsRead,
    onMutate: () => {
      // Optimistic update
      markAllAsRead();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};
