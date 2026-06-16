import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useGroupStore } from '@/stores/groupStore';
import { getSocket } from '@/lib/socket';
import type { GroupMessage, Poll, PollOption } from '../types/group';

/**
 * Always-on group socket handlers — registered at ChatPage level.
 * Handles group list updates regardless of which group (if any) is open.
 */
export function useGroupGlobalSocket() {
  const qc = useQueryClient();

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onGroupCreated = () => {
      qc.invalidateQueries({ queryKey: ['group', 'list'] });
    };

    const onMemberAdded = (data: { groupId: string }) => {
      qc.invalidateQueries({ queryKey: ['group', 'list'] });
      qc.invalidateQueries({ queryKey: ['group', data.groupId, 'members'] });
      qc.invalidateQueries({ queryKey: ['group', data.groupId, 'pending-members'] });
    };

    const onMemberRemoved = (data: { groupId: string }) => {
      qc.invalidateQueries({ queryKey: ['group', 'list'] });
      qc.invalidateQueries({ queryKey: ['group', data.groupId, 'members'] });
      qc.invalidateQueries({ queryKey: ['group', data.groupId, 'pending-members'] });
    };

    const onMemberPending = (data: { groupId: string }) => {
      qc.invalidateQueries({ queryKey: ['group', 'list'] });
      qc.invalidateQueries({ queryKey: ['group', data.groupId, 'pending-members'] });
    };

    const onGroupDeleted = (data: { groupId: string }) => {
      qc.invalidateQueries({ queryKey: ['group', 'list'] });
      useGroupStore.getState().removeGroup(data.groupId);
    };

    // Global: receives new_group_message from user personal room for ALL groups.
    const onNewGroupMessage = (data: { groupId: string; message: GroupMessage }) => {
      console.log('[socket] new_group_message received', data.groupId, data.message?.messageId);
      const { addGroupMessage } = useGroupStore.getState();
      // Add to message store directly — GroupChatWindow reads from store and
      // renders immediately. No need to invalidate the messages query (doing
      // so would refetch page 1 → `setGroupMessages` REPLACES the entire
      // activeMessages list with just 10 items → scrollHeight collapses →
      // browser auto-clamps scrollTop → view jumps to bottom. THAT'S the
      // root cause of "auto-scroll on new message" bug.
      addGroupMessage(data.groupId, data.message);
      // Invalidate group list so sidebar timestamp + unread badge refresh
      qc.invalidateQueries({ queryKey: ['group', 'list'] });
    };

    socket.on('group_created', onGroupCreated);
    socket.on('group_member_added', onMemberAdded);
    socket.on('group_member_removed', onMemberRemoved);
    socket.on('group_member_pending', onMemberPending);
    socket.on('group_deleted', onGroupDeleted);
    socket.on('new_group_message', onNewGroupMessage);

    return () => {
      socket.off('group_created', onGroupCreated);
      socket.off('group_member_added', onMemberAdded);
      socket.off('group_member_removed', onMemberRemoved);
      socket.off('group_member_pending', onMemberPending);
      socket.off('group_deleted', onGroupDeleted);
      socket.off('new_group_message', onNewGroupMessage);
    };
  }, [qc]);
}

interface GroupSocketCallbacks {
  onPollData?: (pollId: string, poll: Poll) => void;
  onPollUpdated?: (groupId: string, pollId: string, options: PollOption[], closed: boolean) => void;
}

export function useGroupSocket(activeGroupId: string | null, callbacks: GroupSocketCallbacks = {}) {
  const qc = useQueryClient();
  const {
    recallGroupMessage,
    updateGroupReactions,
    setGroupTyping,
    setGroupRead,
    upsertGroup,
    removeGroup,
  } = useGroupStore();

  const activeGroupIdRef = useRef(activeGroupId);
  activeGroupIdRef.current = activeGroupId;
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  // Stable scroll trigger — bumped when new message arrives so ChatPage can scroll
  const scrollTriggerRef = useRef(0);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    if (activeGroupId) {
      socket.emit('join_group', { groupId: activeGroupId });
      // Tell others we've read this group
      socket.emit('group_mark_read', { groupId: activeGroupId });
    }

    // NOTE: addGroupMessage is handled globally in useGroupGlobalSocket.
    // Here we only handle the poll sidecar data and scroll trigger.
    const handleNewGroupMessage = (data: { groupId: string; message: GroupMessage; poll?: Poll }) => {
      scrollTriggerRef.current += 1;
      // If this message carries poll data, cache it immediately
      if (data.poll) {
        callbacksRef.current.onPollData?.(data.poll.pollId, data.poll);
      }
      // Invalidate group list so unread badge updates
      qc.invalidateQueries({ queryKey: ['group', 'list'] });
    };

    const handleRecalled = (data: { groupId: string; messageId: string }) => {
      recallGroupMessage(data.groupId, data.messageId);
    };

    const handleReactionUpdated = (data: { groupId: string; messageId: string; reactions: Record<string, string[]> }) => {
      updateGroupReactions(data.groupId, data.messageId, data.reactions);
    };

    const handlePinned = (data: { groupId: string; pin?: { messageId?: string }; messageId?: string }) => {
      qc.invalidateQueries({ queryKey: ['group', data.groupId, 'pins'] });
      const mid = data.pin?.messageId || data.messageId;
      if (mid) useGroupStore.getState().setMessagePinned(data.groupId, mid, true);
    };

    const handleUnpinned = (data: { groupId: string; messageId: string }) => {
      qc.invalidateQueries({ queryKey: ['group', data.groupId, 'pins'] });
      if (data.messageId) useGroupStore.getState().setMessagePinned(data.groupId, data.messageId, false);
    };

    const handleMemberChanged = (data: { groupId: string }) => {
      qc.invalidateQueries({ queryKey: ['group', data.groupId, 'members'] });
      qc.invalidateQueries({ queryKey: ['group', data.groupId, 'pending-members'] });
    };

    const handleMemberPending = (data: { groupId: string }) => {
      qc.invalidateQueries({ queryKey: ['group', data.groupId, 'pending-members'] });
    };

    const handleRoleChanged = (data: { groupId: string }) => {
      qc.invalidateQueries({ queryKey: ['group', data.groupId, 'members'] });
    };

    const handleInfoUpdated = (data: { groupId: string; name: string; avatarUrl: string; description: string }) => {
      upsertGroup({ groupId: data.groupId, name: data.name, avatarUrl: data.avatarUrl, description: data.description } as never);
      qc.invalidateQueries({ queryKey: ['group', data.groupId] });
    };

    const handleGroupDeleted = (data: { groupId: string }) => {
      removeGroup(data.groupId);
      qc.invalidateQueries({ queryKey: ['group', 'list'] });
    };

    const handleGroupCreated = () => {
      qc.invalidateQueries({ queryKey: ['group', 'list'] });
    };

    const handlePollUpdated = (data: { groupId: string; pollId: string; options: PollOption[]; closed: boolean }) => {
      callbacksRef.current.onPollUpdated?.(data.groupId, data.pollId, data.options, data.closed);
      qc.invalidateQueries({ queryKey: ['group', data.groupId, 'polls'] });
    };

    const handleReminderTriggered = (data: { groupId: string; title: string }) => {
      toast.info(`Nhắc hẹn: ${data.title}`);
      qc.invalidateQueries({ queryKey: ['group', data.groupId, 'reminders'] });
    };

    // Typing with 3s auto-clear
    const typingTimers = new Map<string, ReturnType<typeof setTimeout>>();
    const handleGroupTyping = (data: { groupId: string; userId: string }) => {
      setGroupTyping(data.groupId, data.userId, true);
      const key = `${data.groupId}:${data.userId}`;
      if (typingTimers.has(key)) clearTimeout(typingTimers.get(key)!);
      typingTimers.set(
        key,
        setTimeout(() => {
          setGroupTyping(data.groupId, data.userId, false);
          typingTimers.delete(key);
        }, 3000)
      );
    };

    socket.on('new_group_message', handleNewGroupMessage);
    socket.on('group_message_recalled', handleRecalled);
    socket.on('group_reaction_updated', handleReactionUpdated);
    socket.on('group_message_pinned', handlePinned);
    socket.on('group_message_unpinned', handleUnpinned);
    socket.on('group_member_added', handleMemberChanged);
    socket.on('group_member_removed', handleMemberChanged);
    socket.on('group_member_pending', handleMemberPending);
    socket.on('group_role_changed', handleRoleChanged);
    socket.on('group_info_updated', handleInfoUpdated);
    socket.on('group_deleted', handleGroupDeleted);
    socket.on('group_created', handleGroupCreated);
    socket.on('poll_updated', handlePollUpdated);
    socket.on('reminder_triggered', handleReminderTriggered);
    socket.on('group_typing', handleGroupTyping);
    socket.on('group_message_read', (data: { groupId: string; userId: string }) => {
      setGroupRead(data.groupId, data.userId);
    });

    return () => {
      if (activeGroupId) socket.emit('leave_group', { groupId: activeGroupId });

      socket.off('new_group_message', handleNewGroupMessage);
      socket.off('group_message_recalled', handleRecalled);
      socket.off('group_reaction_updated', handleReactionUpdated);
      socket.off('group_message_pinned', handlePinned);
      socket.off('group_message_unpinned', handleUnpinned);
      socket.off('group_member_added', handleMemberChanged);
      socket.off('group_member_removed', handleMemberChanged);
      socket.off('group_member_pending', handleMemberPending);
      socket.off('group_role_changed', handleRoleChanged);
      socket.off('group_info_updated', handleInfoUpdated);
      socket.off('group_deleted', handleGroupDeleted);
      socket.off('group_created', handleGroupCreated);
      socket.off('poll_updated', handlePollUpdated);
      socket.off('reminder_triggered', handleReminderTriggered);
      socket.off('group_typing', handleGroupTyping);
      socket.off('group_message_read');

      typingTimers.forEach(clearTimeout);
    };
  }, [activeGroupId]);

  const emitGroupTyping = useCallback((groupId: string) => {
    const socket = getSocket();
    socket?.emit('group_typing', { groupId });
  }, []);

  return { emitGroupTyping, scrollTriggerRef };
}
