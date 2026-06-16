import api from '@/lib/axios';

export interface FoundUser {
  id: string;
  fullName?: string;
  avatarUrl?: string;
  email?: string;
}

export const friendService = {
  searchByEmail: (email: string) =>
    api.get<{ success: boolean; data: FoundUser }>('/api/chat/users/search', { params: { email } })
      .then((r) => r.data.data),

  sendFriendRequest: (toUserId: string) =>
    api.post<{ success: boolean; data: { conversation: Record<string, unknown>; message: Record<string, unknown> } }>(
      '/api/chat/friends/request',
      { toUserId }
    ).then((r) => r.data.data),

  acceptFriendRequest: (conversationId: string) =>
    api.post<{ success: boolean; data: { message: Record<string, unknown> } }>(
      '/api/chat/friends/accept',
      { conversationId }
    ).then((r) => r.data.data),

  getFriends: () =>
    api.get<{ success: boolean; data: unknown[] }>('/api/chat/friends').then((r) => r.data.data),
};
