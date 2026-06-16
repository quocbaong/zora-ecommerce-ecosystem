import { useEffect, useMemo } from 'react';
import { getSocket } from '@/lib/socket';
import { useChatStore } from '@/stores/chatStore';

export function usePresenceSocket(userIds: Array<string | undefined | null>) {
  const setPresence = useChatStore((s) => s.setPresence);
  const setPresenceBatch = useChatStore((s) => s.setPresenceBatch);

  const normalizedUserIds = useMemo(
    () => [...new Set(userIds.filter((id): id is string => !!id))],
    [userIds]
  );

  useEffect(() => {
    const socket = getSocket();

    const handlePresenceUpdate = (data: { userId: string; isOnline: boolean }) => {
      if (!data?.userId) return;
      setPresence(data.userId, data.isOnline);
    };

    const handlePresenceSnapshot = (data: { presence: Record<string, boolean> }) => {
      if (!data?.presence) return;
      setPresenceBatch(data.presence);
    };

    socket.on('presence_update', handlePresenceUpdate);
    socket.on('presence_snapshot', handlePresenceSnapshot);

    return () => {
      socket.off('presence_update', handlePresenceUpdate);
      socket.off('presence_snapshot', handlePresenceSnapshot);
    };
  }, [setPresence, setPresenceBatch]);

  useEffect(() => {
    if (normalizedUserIds.length === 0) return;
    getSocket().emit('presence_query', { userIds: normalizedUserIds });
  }, [normalizedUserIds]);
}
