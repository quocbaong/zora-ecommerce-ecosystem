import api from '@/lib/axios';
import type {
  Group,
  GroupMember,
  CreateGroupPayload,
} from '../types/group';

const BASE = '/api/chat/groups';

export const groupService = {
  createGroup: async (payload: CreateGroupPayload): Promise<Group> => {
    const res = await api.post(BASE, payload);
    return res.data.data;
  },

  getMyGroups: async (): Promise<Group[]> => {
    const res = await api.get(BASE);
    return res.data.data ?? [];
  },

  getGroup: async (groupId: string): Promise<Group> => {
    const res = await api.get(`${BASE}/${groupId}`);
    return res.data.data;
  },

  updateGroup: async (groupId: string, payload: Partial<Pick<Group, 'name' | 'description' | 'rules' | 'allowMemberPost' | 'highlightAdminMessages'>>): Promise<Group> => {
    const res = await api.put(`${BASE}/${groupId}`, payload);
    return res.data.data;
  },

  deleteGroup: async (groupId: string): Promise<void> => {
    await api.delete(`${BASE}/${groupId}`);
  },

  uploadGroupAvatar: async (groupId: string, file: File): Promise<string> => {
    const form = new FormData();
    form.append('file', file);
    const res = await api.post(`${BASE}/${groupId}/avatar`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data.avatarUrl;
  },

  // ─── Members ───────────────────────────────────────────────────────────────

  getMembers: async (groupId: string): Promise<GroupMember[]> => {
    const res = await api.get(`${BASE}/${groupId}/members`);
    return res.data.data ?? [];
  },

  addMembers: async (groupId: string, userIds: string[]): Promise<{ added: string[] }> => {
    const res = await api.post(`${BASE}/${groupId}/members`, { userIds });
    return res.data.data;
  },

  removeMember: async (groupId: string, userId: string): Promise<void> => {
    await api.delete(`${BASE}/${groupId}/members/${userId}`);
  },

  changeRole: async (groupId: string, userId: string, role: string): Promise<void> => {
    await api.put(`${BASE}/${groupId}/members/${userId}/role`, { role });
  },

  updateNickname: async (groupId: string, userId: string, nickname: string): Promise<void> => {
    await api.put(`${BASE}/${groupId}/members/${userId}/nickname`, { nickname });
  },

  leaveGroup: async (groupId: string): Promise<void> => {
    await api.post(`${BASE}/${groupId}/leave`);
  },

  getPendingMembers: async (groupId: string): Promise<GroupMember[]> => {
    const res = await api.get(`${BASE}/${groupId}/pending-members`);
    return res.data.data ?? [];
  },

  approveMember: async (groupId: string, userId: string): Promise<void> => {
    await api.post(`${BASE}/${groupId}/members/${userId}/approve`);
  },

  rejectMember: async (groupId: string, userId: string): Promise<void> => {
    await api.post(`${BASE}/${groupId}/members/${userId}/reject`);
  },

  muteGroup: async (groupId: string, durationMs: number, mentionsOnly = false): Promise<void> => {
    await api.post(`${BASE}/${groupId}/mute`, { durationMs, mentionsOnly });
  },

  unmuteGroup: async (groupId: string): Promise<void> => {
    await api.delete(`${BASE}/${groupId}/mute`);
  },

  markGroupAsRead: async (groupId: string): Promise<void> => {
    await api.put(`${BASE}/${groupId}/read`);
  },
};
