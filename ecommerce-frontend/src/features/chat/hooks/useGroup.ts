import { useEffect } from 'react';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { groupService } from '../services/groupService';
import { groupMessageService } from '../services/groupMessageService';
import { pollService } from '../services/pollService';
import { reminderService } from '../services/reminderService';
import { useGroupStore } from '@/stores/groupStore';
import { useAuthStore } from '@/stores/authStore';
import type { CreateGroupPayload, SendGroupMessagePayload } from '../types/group';

// ─── Group list & CRUD ───────────────────────────────────────────────────────

export function useMyGroups() {
  const setTotalGroupUnread = useGroupStore((s) => s.setTotalGroupUnread);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const query = useQuery({
    queryKey: ['group', 'list'],
    queryFn: () => groupService.getMyGroups(),
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (query.data) {
      const total = query.data.reduce((sum, g) => sum + (g.memberMeta?.unreadCount ?? 0), 0);
      setTotalGroupUnread(total);
    }
  }, [query.data, setTotalGroupUnread]);

  return query;
}

export function useGroupInfo(groupId: string | null) {
  return useQuery({
    queryKey: ['group', groupId],
    queryFn: () => groupService.getGroup(groupId!),
    enabled: !!groupId,
  });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  const setActiveGroup = useGroupStore((s) => s.setActiveGroup);

  return useMutation({
    mutationFn: (payload: CreateGroupPayload) => groupService.createGroup(payload),
    onSuccess: (group) => {
      qc.invalidateQueries({ queryKey: ['group', 'list'] });
      setActiveGroup(group.groupId);
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateGroupInfo(groupId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: Partial<{ name: string; description: string; rules: string; allowMemberPost: boolean; highlightAdminMessages: boolean }>) =>
      groupService.updateGroup(groupId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group', groupId] });
      qc.invalidateQueries({ queryKey: ['group', 'list'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUploadGroupAvatar(groupId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => groupService.uploadGroupAvatar(groupId, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group', groupId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteGroup() {
  const qc = useQueryClient();
  const setActiveGroup = useGroupStore((s) => s.setActiveGroup);

  return useMutation({
    mutationFn: (groupId: string) => groupService.deleteGroup(groupId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group', 'list'] });
      setActiveGroup(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useLeaveGroup() {
  const qc = useQueryClient();
  const setActiveGroup = useGroupStore((s) => s.setActiveGroup);

  return useMutation({
    mutationFn: (groupId: string) => groupService.leaveGroup(groupId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group', 'list'] });
      setActiveGroup(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ─── Members ─────────────────────────────────────────────────────────────────

export function useGroupMembers(groupId: string | null) {
  return useQuery({
    queryKey: ['group', groupId, 'members'],
    queryFn: () => groupService.getMembers(groupId!),
    enabled: !!groupId,
  });
}

export function usePendingMembers(groupId: string | null) {
  return useQuery({
    queryKey: ['group', groupId, 'pending-members'],
    queryFn: () => groupService.getPendingMembers(groupId!),
    enabled: !!groupId,
  });
}

export function useApproveMember(groupId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => groupService.approveMember(groupId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group', groupId, 'members'] });
      qc.invalidateQueries({ queryKey: ['group', groupId, 'pending-members'] });
      toast.success('Đã phê duyệt thành viên!');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useRejectMember(groupId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => groupService.rejectMember(groupId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group', groupId, 'pending-members'] });
      toast.success('Đã từ chối thành viên!');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useAddMembers(groupId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (userIds: string[]) => groupService.addMembers(groupId, userIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group', groupId, 'members'] });
      qc.invalidateQueries({ queryKey: ['group', groupId, 'pending-members'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useRemoveMember(groupId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => groupService.removeMember(groupId, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['group', groupId, 'members'] }),
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useChangeRole(groupId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      groupService.changeRole(groupId, userId, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['group', groupId, 'members'] }),
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateNickname(groupId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, nickname }: { userId: string; nickname: string }) =>
      groupService.updateNickname(groupId, userId, nickname),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['group', groupId, 'members'] }),
    onError: (err: Error) => toast.error(err.message),
  });
}

// ─── Messages ────────────────────────────────────────────────────────────────

export function useGroupMessages(groupId: string | null) {
  const setGroupMessages = useGroupStore((s) => s.setGroupMessages);
  const prependGroupMessages = useGroupStore((s) => s.prependGroupMessages);

  return useInfiniteQuery({
    queryKey: ['group', groupId, 'messages'],
    queryFn: async ({ pageParam }) => {
      const data = await groupMessageService.getGroupMessages(groupId!, {
        limit: 10,
        lastKey: pageParam as string | undefined
      });
      if (!pageParam) {
        if (groupId) setGroupMessages(groupId, data.messages ?? []);
      } else {
        if (groupId) prependGroupMessages(groupId, data.messages ?? []);
      }
      return data;
    },
    getNextPageParam: (lastPage) => lastPage.nextKey || undefined,
    initialPageParam: null as string | null | undefined,
    enabled: !!groupId,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}

export function useSendGroupMessage(groupId: string) {
  return useMutation({
    mutationFn: (payload: SendGroupMessagePayload) =>
      groupMessageService.sendGroupMessage(groupId, payload),
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useRecallGroupMessage(groupId: string) {
  const store = useGroupStore();

  return useMutation({
    mutationFn: (messageId: string) => groupMessageService.recallGroupMessage(groupId, messageId),
    onMutate: (messageId) => {
      // Optimistic
      store.recallGroupMessage(groupId, messageId);
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteGroupMessage(groupId: string) {
  const store = useGroupStore();

  return useMutation({
    mutationFn: (messageId: string) => groupMessageService.deleteGroupMessage(groupId, messageId),
    onMutate: (messageId) => {
      store.deleteGroupMessage(groupId, messageId);
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useAddGroupReaction(groupId: string) {
  return useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: string; emoji: string }) =>
      groupMessageService.addGroupReaction(groupId, messageId, emoji),
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useMarkGroupAsRead(groupId: string | null) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => groupService.markGroupAsRead(groupId!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['group', 'list'] }),
  });
}

// ─── Pins ────────────────────────────────────────────────────────────────────

export function usePinnedMessages(groupId: string | null) {
  return useQuery({
    queryKey: ['group', groupId, 'pins'],
    queryFn: () => groupMessageService.getPinnedMessages(groupId!),
    enabled: !!groupId,
  });
}

export function usePinMessage(groupId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (messageId: string) => groupMessageService.pinMessage(groupId, messageId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['group', groupId, 'pins'] }),
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } }; message?: string })?.response?.data?.error
        || (err as Error)?.message
        || 'Không thể ghim tin nhắn';
      toast.error(msg);
    },
  });
}

export function useUnpinMessage(groupId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (messageId: string) => groupMessageService.unpinMessage(groupId, messageId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['group', groupId, 'pins'] }),
    onError: (err: Error) => toast.error(err.message),
  });
}

// ─── Polls ───────────────────────────────────────────────────────────────────

export function usePolls(groupId: string | null) {
  return useQuery({
    queryKey: ['group', groupId, 'polls'],
    queryFn: () => pollService.listPolls(groupId!),
    enabled: !!groupId,
  });
}

export function useCreatePoll(groupId: string) {
  return useMutation({
    mutationFn: (payload: { question: string; options: string[]; isMultiple?: boolean; autoCloseAt?: number | null }) =>
      pollService.createPoll(groupId, payload),
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useVote(groupId: string, pollId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (optionIds: string[]) => pollService.vote(groupId, pollId, optionIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['group', groupId, 'polls'] }),
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUnvote(groupId: string, pollId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => pollService.unvote(groupId, pollId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['group', groupId, 'polls'] }),
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useClosePoll(groupId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (pollId: string) => pollService.closePoll(groupId, pollId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['group', groupId, 'polls'] }),
    onError: (err: Error) => toast.error(err.message),
  });
}

// ─── Reminders ───────────────────────────────────────────────────────────────

export function useReminders(groupId: string | null) {
  return useQuery({
    queryKey: ['group', groupId, 'reminders'],
    queryFn: () => reminderService.listReminders(groupId!),
    enabled: !!groupId,
  });
}

export function useCreateReminder(groupId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: { title: string; remindAt: number; participants?: string[] }) =>
      reminderService.createReminder(groupId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['group', groupId, 'reminders'] }),
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useMarkReminderDone(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reminderId: string) => reminderService.markDone(groupId, reminderId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['group', groupId, 'reminders'] }),
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteReminder(groupId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (reminderId: string) => reminderService.deleteReminder(groupId, reminderId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['group', groupId, 'reminders'] }),
    onError: (err: Error) => toast.error(err.message),
  });
}

// ─── Mute ────────────────────────────────────────────────────────────────────

export function useMuteGroup(groupId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ durationMs, mentionsOnly }: { durationMs: number; mentionsOnly?: boolean }) =>
      groupService.muteGroup(groupId, durationMs, mentionsOnly),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['group', groupId, 'members'] }),
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUnmuteGroup(groupId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => groupService.unmuteGroup(groupId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['group', groupId, 'members'] }),
    onError: (err: Error) => toast.error(err.message),
  });
}
