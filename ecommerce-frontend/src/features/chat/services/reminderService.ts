import api from '@/lib/axios';
import type { Reminder } from '../types/group';

const BASE = '/api/chat/groups';

export const reminderService = {
  createReminder: async (
    groupId: string,
    payload: { title: string; remindAt: number; participants?: string[] }
  ): Promise<{ reminder: Reminder }> => {
    const res = await api.post(`${BASE}/${groupId}/reminders`, payload);
    return res.data.data;
  },

  listReminders: async (groupId: string): Promise<Reminder[]> => {
    const res = await api.get(`${BASE}/${groupId}/reminders`);
    return res.data.data ?? [];
  },

  markDone: async (groupId: string, reminderId: string): Promise<void> => {
    await api.put(`${BASE}/${groupId}/reminders/${reminderId}/done`);
  },

  deleteReminder: async (groupId: string, reminderId: string): Promise<void> => {
    await api.delete(`${BASE}/${groupId}/reminders/${reminderId}`);
  },
};
