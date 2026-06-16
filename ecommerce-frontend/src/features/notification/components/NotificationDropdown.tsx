import { useRef, useState, useEffect } from 'react';
import { Bell, Package, CreditCard, Truck, Star, Megaphone, X } from 'lucide-react';
import { useNotificationStore } from '@/stores/notificationStore';
import { useMarkNotificationRead, useMarkAllNotificationsRead } from '../hooks/useNotifications';
import { Notification } from '@/types/api.types';

function getNotifIcon(type: Notification['type']) {
  switch (type) {
    case 'ORDER_CREATED':   return <Package className="w-4 h-4 text-blue-500" />;
    case 'PAYMENT_SUCCESS': return <CreditCard className="w-4 h-4 text-green-500" />;
    case 'ORDER_SHIPPED':
    case 'ORDER_UPDATE':    return <Truck className="w-4 h-4 text-orange-500" />;
    case 'PRODUCT_CREATED': return <Star className="w-4 h-4 text-yellow-500" />;
    default:                return <Megaphone className="w-4 h-4 text-purple-500" />;
  }
}

function timeAgo(dateStr: string) {
  // Backend gửi LocalDateTime theo giờ UTC nhưng không có hậu tố 'Z' → ép parse theo UTC
  const hasZone = /[zZ]$/.test(dateStr) || /[+-]\d{2}:\d{2}$/.test(dateStr);
  const diff = Date.now() - new Date(hasZone ? dateStr : `${dateStr}Z`).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} giờ trước`;
  return `${Math.floor(hrs / 24)} ngày trước`;
}

export default function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount } = useNotificationStore();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = () => {
    setOpen((v) => !v);
  };

  const handleMarkRead = (id: string) => {
    markRead.mutate(id);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleOpen}
        className="relative p-2 text-secondary/80 hover:text-primary transition-colors"
        aria-label="Thông báo"
      >
        <Bell className="h-5 w-5 stroke-[1.5]" />
        {unreadCount > 0 && (
          <span className="absolute right-0 top-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-gray-100 bg-white shadow-lg z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="font-semibold text-sm text-secondary">Thông báo</span>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllRead.mutate()}
                  disabled={markAllRead.isPending}
                  className="text-xs text-primary hover:underline disabled:opacity-50"
                >
                  Đánh dấu tất cả đã đọc
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-secondary/40">
                <Bell className="w-8 h-8 mb-2" />
                <span className="text-sm">Chưa có thông báo</span>
              </div>
            ) : (
              notifications.slice(0, 20).map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => {
                    if (!notif.isRead) handleMarkRead(notif.id);
                    setExpandedId(expandedId === notif.id ? null : notif.id);
                  }}
                  className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 ${
                    !notif.isRead ? 'bg-blue-50/40' : ''
                  }`}
                >
                  <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                    {getNotifIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-tight ${!notif.isRead ? 'font-semibold text-secondary' : 'font-medium text-secondary/80'}`}>
                      {notif.title}
                    </p>
                    <p className={`text-xs text-secondary/60 mt-0.5 whitespace-pre-wrap ${expandedId === notif.id ? '' : 'line-clamp-2'}`}>
                      {notif.message}
                    </p>
                    <p className="text-[11px] text-secondary/40 mt-1">{timeAgo(notif.createdAt)}</p>
                  </div>
                  {!notif.isRead && (
                    <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
