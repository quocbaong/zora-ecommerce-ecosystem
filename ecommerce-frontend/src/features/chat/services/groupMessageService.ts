import api from '@/lib/axios';
import type { GroupMessage, PinnedMessage, SendGroupMessagePayload } from '../types/group';

const BASE = '/api/chat/groups';

export const groupMessageService = {
  getGroupMessages: async (
    groupId: string,
    params?: { limit?: number; lastKey?: string }
  ): Promise<{ messages: GroupMessage[]; nextKey: string | null }> => {
    const res = await api.get(`${BASE}/${groupId}/messages`, { params });
    return res.data.data ?? { messages: [], nextKey: null };
  },

  sendGroupMessage: async (groupId: string, payload: SendGroupMessagePayload): Promise<GroupMessage> => {
    const res = await api.post(`${BASE}/${groupId}/messages`, payload);
    return res.data.data;
  },

  recallGroupMessage: async (groupId: string, messageId: string): Promise<void> => {
    await api.put(`${BASE}/${groupId}/messages/${messageId}/recall`);
  },

  deleteGroupMessage: async (groupId: string, messageId: string): Promise<void> => {
    await api.delete(`${BASE}/${groupId}/messages/${messageId}`);
  },

  addGroupReaction: async (groupId: string, messageId: string, emoji: string): Promise<void> => {
    await api.post(`${BASE}/${groupId}/messages/${messageId}/reactions`, { emoji });
  },

  getPinnedMessages: async (groupId: string): Promise<PinnedMessage[]> => {
    const res = await api.get(`${BASE}/${groupId}/pins`);
    return res.data.data ?? [];
  },

  pinMessage: async (groupId: string, messageId: string): Promise<PinnedMessage> => {
    const res = await api.post(`${BASE}/${groupId}/messages/${messageId}/pin`);
    return res.data.data;
  },

  unpinMessage: async (groupId: string, messageId: string): Promise<void> => {
    await api.delete(`${BASE}/${groupId}/messages/${messageId}/pin`);
  },
};
