import { useEffect } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { useGroupStore } from '@/stores/groupStore';

const BASE_TITLE = 'ZORA - E-commerce Platform';

/**
 * Cập nhật tab title kiểu "(N) ZORA..." khi có tin nhắn chưa đọc, giống YouTube/Gmail.
 * Reset về title gốc khi count = 0.
 */
export function useUnreadTitle() {
  const totalUnreadChat = useChatStore((s) => s.totalUnreadChat);
  const totalGroupUnread = useGroupStore((s) => s.totalGroupUnread);

  useEffect(() => {
    const total = (totalUnreadChat || 0) + (totalGroupUnread || 0);
    document.title = total > 0 ? `(${total}) ${BASE_TITLE}` : BASE_TITLE;
  }, [totalUnreadChat, totalGroupUnread]);
}
