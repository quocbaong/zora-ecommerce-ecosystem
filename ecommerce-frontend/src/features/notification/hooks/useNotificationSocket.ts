import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getStompClient, disconnectStomp } from '@/lib/stompClient';
import { useNotificationStore } from '@/stores/notificationStore';
import { useAuthStore } from '@/stores/authStore';
import { Notification } from '@/types/api.types';
import { toast } from 'sonner';

const processedNotificationIds = new Set<string>();

export const useNotificationSocket = (userId: string | undefined) => {
  const addNotification = useNotificationStore((s) => s.addNotification);
  const updateUser = useAuthStore((s) => s.updateUser);
  const qc = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    let client: ReturnType<typeof getStompClient>;
    try {
      client = getStompClient();
    } catch (e) {
      console.warn('[NotificationSocket] Failed to get STOMP client:', e);
      return;
    }

    client.onConnect = () => {
      client.subscribe(`/topic/notifications/${userId}`, (frame) => {
        try {
          const notification: Notification = JSON.parse(frame.body);

          if (notification.id) {
            if (processedNotificationIds.has(notification.id)) {
              return;
            }
            processedNotificationIds.add(notification.id);
          }

          const msg = notification.message || '';
          const type = (notification.type as string) || '';

          // 1. Report submitted
          if (type === 'REPORT_SUBMITTED' || msg.includes('Báo cáo của bạn đã được gửi thành công')) {
            toast.success("Báo cáo của bạn đã được gửi thành công.");
          }
          // 2. Report resolved
          else if (type === 'REPORT_RESOLVED' || msg.includes('Báo cáo của bạn đã được xử lý')) {
            toast.success("Báo cáo của bạn đã được xử lý.");
          }
          // 3. Report rejected
          else if (type === 'REPORT_REJECTED' || msg.includes('không đủ bằng chứng vi phạm')) {
            toast.info("Báo cáo của bạn không đủ bằng chứng vi phạm.");
          }
          // 4. Warning received
          else if (type === 'WARNING_RECEIVED' || type === 'WARNING' || msg.includes('bị cảnh cáo')) {
            toast.warning("Tài khoản của bạn đã bị cảnh cáo do vi phạm quy tắc chat.");
          }
          // 5. Mute received
          else if (type === 'MUTED' || type === 'USER_MUTED' || msg.includes('hạn chế chat')) {
            toast.error("Tài khoản của bạn đã bị hạn chế chat.");
            const muteUntilVal = (notification as any).muteUntil || (notification as any).time || new Date(Date.now() + 24 * 3600 * 1000).toISOString();
            updateUser({
              muted: true,
              muteUntil: muteUntilVal,
              mutedUntil: muteUntilVal
            });
          }
          // 6. Permanent ban
          else if (type === 'ACCOUNT_BANNED' || type === 'BANNED' || type === 'PERMANENTLY_BANNED' || msg.includes('khóa vĩnh viễn') || msg.includes('bị khóa vĩnh viễn')) {
            toast.error("Tài khoản của bạn đã bị khóa vĩnh viễn do vi phạm nhiều lần.");
            updateUser({
              banned: true,
              accountStatus: 'BANNED',
              status: 'BANNED'
            });
          } else {
            toast(notification.title, {
              description: notification.message,
              duration: 4000,
            });
          }

          addNotification(notification);
          qc.invalidateQueries({ queryKey: ['notifications', userId] });
        } catch {
          // ignore malformed frames
        }
      });
    };

    try {
      if (!client.active) {
        client.activate();
      }
    } catch (e) {
      console.warn('[NotificationSocket] STOMP activate failed:', e);
    }

    return () => {
      try {
        disconnectStomp();
      } catch {
        // ignore cleanup errors
      }
    };
  }, [userId, addNotification, qc]);
};
