import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { chatService } from '../services/chatService';
import { useChatStore } from '@/stores/chatStore';
import { useAuthStore } from '@/stores/authStore';
import type { CreateConversationPayload, SendMessagePayload, Conversation } from '../types';

const CONVERSATIONS_KEY = ['chat', 'conversations'];

export function useConversations() {
  const setTotalUnreadChat = useChatStore((s) => s.setTotalUnreadChat);
  const user = useAuthStore((s) => s.user);

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const query = useQuery({
    queryKey: CONVERSATIONS_KEY,
    queryFn: () => chatService.getConversations(),
    enabled: isAuthenticated,
    refetchInterval: isAuthenticated ? 30000 : false,
  });

  useEffect(() => {
    if (query.data && user) {
      const list = Array.isArray(query.data) ? query.data : [];
      const isSeller = user.role?.toUpperCase() === 'SELLER';
      const total = list.reduce((sum, conv: Conversation) => {
        // DIRECT conversations always use unreadUser (each participant has their own record)
        const unread = (conv.conversationType === 'DIRECT' || !isSeller)
          ? (conv.unreadUser ?? 0)
          : (conv.unreadSeller ?? 0);
        return sum + unread;
      }, 0);
      setTotalUnreadChat(total);
    }
  }, [query.data, user, setTotalUnreadChat]);

  return query;
}

export function useMessages(conversationId: string | null) {
  const setMessages = useChatStore((s) => s.setMessages);
  return useQuery({
    queryKey: ['chat', 'messages', conversationId],
    queryFn: async () => {
      const msgs = await chatService.getMessages(conversationId!, { limit: 50 });
      if (conversationId) setMessages(conversationId, msgs);
      return msgs;
    },
    enabled: !!conversationId,
    staleTime: 0,       // always consider data stale so it refetches on mount/focus
    refetchOnMount: true,
  });
}

export function useCreateConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateConversationPayload) =>
      chatService.getOrCreateConversation(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CONVERSATIONS_KEY });
    },
    onError: () => toast.error('Không thể tạo cuộc trò chuyện.'),
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  const updateUser = useAuthStore((s) => s.updateUser);
  return useMutation({
    mutationFn: ({
      conversationId,
      payload,
    }: {
      conversationId: string;
      payload: SendMessagePayload;
    }) => chatService.sendMessage(conversationId, payload),
    onSuccess: (_, { conversationId }) => {
      // Do NOT add to store here — the socket's new_message event will deliver it.
      // Adding here + socket would cause duplicates.
      qc.invalidateQueries({ queryKey: CONVERSATIONS_KEY });
      qc.invalidateQueries({ queryKey: ['chat', 'messages', conversationId] });
    },
    onError: (error: any) => {
      const status = error?.response?.status;
      const data = error?.response?.data || {};
      const errMessage = data?.message || data?.error || '';

      const isMutedError = errMessage === 'MUTED' || errMessage?.toLowerCase().includes('cấm chat') || data?.muted || data?.muteUntil || data?.mutedUntil;

      if (isMutedError) {
        const until = data?.mutedUntil || data?.muteUntil || data?.time || '';
        const formattedTime = until ? new Date(until).toLocaleString('vi-VN') : 'một thời gian';
        toast.error(`Bạn đang bị hạn chế chat đến ${formattedTime}`);
        updateUser({
          muted: true,
          muteUntil: until || new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
          mutedUntil: until || new Date(Date.now() + 24 * 3600 * 1000).toISOString()
        });
      } else if (errMessage && errMessage.includes('người nhận')) {
        toast.error(errMessage);
      } else if (status === 403 || errMessage === 'ACCOUNT_BANNED' || data?.accountStatus === 'BANNED' || data?.banned) {
        toast.error('Tài khoản của bạn đã bị khóa vĩnh viễn.');
        updateUser({
          banned: true,
          accountStatus: 'BANNED',
          status: 'BANNED'
        });
      } else {
        toast.error(errMessage || 'Không thể gửi tin nhắn.');
      }
    },
  });
}

export function useDeleteConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) => chatService.deleteConversation(conversationId),
    onSuccess: (_, conversationId) => {
      // Remove from conversations list cache immediately (don't wait for refetch)
      qc.setQueryData<Conversation[]>(CONVERSATIONS_KEY, (old) =>
        old ? old.filter((c) => c.id !== conversationId) : old
      );
      // Remove cached messages for this conversation
      qc.removeQueries({ queryKey: ['chat', 'messages', conversationId] });
    },
    onError: () => toast.error('Không thể xoá cuộc trò chuyện.'),
  });
}

export function useMarkAsRead() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const setTotalUnreadChat = useChatStore((s) => s.setTotalUnreadChat);
  return useMutation({
    mutationFn: (conversationId: string) => chatService.markAsRead(conversationId),
    onMutate: async (conversationId) => {
      // Hủy mọi refetch đang chạy để optimistic update không bị overwrite
      // bởi response cũ (vd: invalidate từ handleNewMessage vừa được trigger)
      await qc.cancelQueries({ queryKey: CONVERSATIONS_KEY });
      const isSeller = user?.role?.toUpperCase() === 'SELLER';
      qc.setQueryData<Conversation[]>(CONVERSATIONS_KEY, (old) => {
        if (!old) return old;
        const updated = old.map((conv) => {
          if (conv.id !== conversationId) return conv;
          // DIRECT conversations always track unreadUser per participant record
          const isDirect = conv.conversationType === 'DIRECT';
          return (isDirect || !isSeller) ? { ...conv, unreadUser: 0 } : { ...conv, unreadSeller: 0 };
        });
        const total = updated.reduce((sum, conv) => {
          const isDirect = conv.conversationType === 'DIRECT';
          const unread = (isDirect || !isSeller) ? (conv.unreadUser ?? 0) : (conv.unreadSeller ?? 0);
          return sum + unread;
        }, 0);
        setTotalUnreadChat(total);
        return updated;
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CONVERSATIONS_KEY }),
  });
}

export function useReportConversation() {
  return useMutation({
    mutationFn: ({
      conversationId,
      reason,
      description,
      evidenceMessageIds,
      evidenceImages,
    }: {
      conversationId: string;
      reason: string;
      description: string;
      evidenceMessageIds: string[];
      evidenceImages?: string[];
    }) =>
      chatService.reportConversation(conversationId, {
        reason,
        description,
        evidenceMessageIds,
        evidenceImages,
      }),
    onSuccess: () => {
      toast.success('Báo cáo của bạn đã được gửi thành công.');
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Lỗi khi gửi báo cáo.';
      toast.error(message);
    },
  });
}
