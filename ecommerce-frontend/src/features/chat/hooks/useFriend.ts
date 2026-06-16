import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { friendService, type FoundUser } from '../services/friendService';
import { useChatStore } from '@/stores/chatStore';

const CONVERSATIONS_KEY = ['chat', 'conversations'];

export function useSearchUser() {
  const [result, setResult] = useState<FoundUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (email: string) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const user = await friendService.searchByEmail(email);
      setResult(user);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      setError(status === 404 ? 'Không tìm thấy người dùng với email này' : 'Có lỗi xảy ra, thử lại sau');
    } finally {
      setLoading(false);
    }
  }, []);

  return { result, loading, error, search };
}

export function useSendFriendRequest() {
  const qc = useQueryClient();
  const setActiveConversation = useChatStore((s) => s.setActiveConversation);

  return useMutation({
    mutationFn: (toUserId: string) => friendService.sendFriendRequest(toUserId),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: CONVERSATIONS_KEY });
      const convId = (data?.conversation as Record<string, unknown>)?.conversationId as string | undefined;
      if (convId) setActiveConversation(convId);
      toast.success('Đã gửi lời mời kết bạn');
    },
    onError: () => toast.error('Không thể gửi lời mời kết bạn'),
  });
}

export function useGetFriends() {
  return useQuery({
    queryKey: ['chat', 'friends'],
    queryFn: () => friendService.getFriends() as Promise<Array<{ userId?: string; sellerId?: string; conversationId?: string; conversationType?: string; friendshipStatus?: string }>>,
  });
}

export function useAcceptFriendRequest() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (conversationId: string) => friendService.acceptFriendRequest(conversationId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CONVERSATIONS_KEY });
      qc.invalidateQueries({ queryKey: ['chat', 'friends'] });
      toast.success('Đã chấp nhận lời mời kết bạn');
    },
    onError: () => toast.error('Không thể chấp nhận lời mời kết bạn'),
  });
}
