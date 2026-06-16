import api from '@/lib/axios';
import type { Poll } from '../types/group';

const BASE = '/api/chat/groups';

export const pollService = {
  createPoll: async (
    groupId: string,
    payload: { question: string; options: string[]; isMultiple?: boolean; autoCloseAt?: number | null }
  ): Promise<{ poll: Poll }> => {
    const res = await api.post(`${BASE}/${groupId}/polls`, payload);
    return res.data.data;
  },

  listPolls: async (groupId: string): Promise<Poll[]> => {
    const res = await api.get(`${BASE}/${groupId}/polls`);
    return res.data.data ?? [];
  },

  getPoll: async (groupId: string, pollId: string): Promise<Poll> => {
    const res = await api.get(`${BASE}/${groupId}/polls/${pollId}`);
    return res.data.data;
  },

  vote: async (groupId: string, pollId: string, optionIds: string[]): Promise<Poll> => {
    const res = await api.post(`${BASE}/${groupId}/polls/${pollId}/vote`, { optionIds });
    return res.data.data;
  },

  unvote: async (groupId: string, pollId: string): Promise<Poll> => {
    const res = await api.delete(`${BASE}/${groupId}/polls/${pollId}/vote`);
    return res.data.data;
  },

  closePoll: async (groupId: string, pollId: string): Promise<void> => {
    await api.post(`${BASE}/${groupId}/polls/${pollId}/close`);
  },
};
