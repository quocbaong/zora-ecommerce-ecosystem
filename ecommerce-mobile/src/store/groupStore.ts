import { create } from 'zustand';
import type { Group, GroupMessage, GroupMember } from '../types/chat';

interface GroupState {
  groups: Record<string, Group>;                                          
  groupMessages: Record<string, GroupMessage[]>;                          
  groupMembers: Record<string, GroupMember[]>;                            
  activeGroupId: string | null;
  groupTypingUsers: Record<string, Record<string, boolean>>;
  groupReadState: Record<string, string[]>; // groupId -> userIds who read
  totalGroupUnread: number;
  pinnedMessages: Record<string, GroupMessage[]>;
  polls: Record<string, Record<string, any>>; // groupId -> { pollId -> pollData }

  setActiveGroup: (groupId: string | null) => void;
  setTotalGroupUnread: (count: number) => void;
  upsertGroup: (group: Group) => void;
  removeGroup: (groupId: string) => void;
  setGroups: (groups: Group[]) => void;
  setGroupMessages: (groupId: string, messages: GroupMessage[]) => void;
  addGroupMessage: (groupId: string, message: GroupMessage) => void;
  recallGroupMessage: (groupId: string, messageId: string) => void;
  deleteGroupMessage: (groupId: string, messageId: string) => void;
  updateGroupReactions: (groupId: string, messageId: string, reactions: Record<string, string[]>) => void;
  updateGroupMessage: (groupId: string, messageId: string, content: string) => void;
  setGroupMembers: (groupId: string, members: GroupMember[]) => void;
  setGroupTyping: (groupId: string, userId: string, isTyping: boolean) => void;
  setGroupRead: (groupId: string, userId: string) => void;
  removeMember: (groupId: string, userId: string) => void;
  updateMemberRole: (groupId: string, userId: string, role: 'ADMIN' | 'MEMBER') => void;
  setPinnedMessages: (groupId: string, messages: GroupMessage[]) => void;
  addPin: (groupId: string, message: GroupMessage) => void;
  removePin: (groupId: string, messageId: string) => void;
  upsertPoll: (groupId: string, poll: any) => void;
  updatePollOptions: (groupId: string, pollId: string, options: any[], closed?: boolean) => void;
}

export const useGroupStore = create<GroupState>((set) => ({
  groups: {},
  groupMessages: {},
  groupMembers: {},
  activeGroupId: null,
  groupTypingUsers: {},
  groupReadState: {},
  totalGroupUnread: 0,
  pinnedMessages: {},
  polls: {},

  setActiveGroup: (groupId) => set({ activeGroupId: groupId }),
  setTotalGroupUnread: (count) => set({ totalGroupUnread: count }),

  upsertGroup: (group) =>
    set((state) => ({
      groups: { ...state.groups, [group.groupId]: { ...(state.groups[group.groupId] ?? {}), ...group } },
    })),

  removeGroup: (groupId) =>
    set((state) => {
      const groups = { ...state.groups };
      delete groups[groupId];
      const groupMessages = { ...state.groupMessages };
      delete groupMessages[groupId];
      const groupMembers = { ...state.groupMembers };
      delete groupMembers[groupId];
      return { groups, groupMessages, groupMembers };
    }),

  setGroups: (groups) =>
    set(() => ({
      groups: Object.fromEntries(groups.map((g) => [g.groupId, g])),
    })),

  setGroupMessages: (groupId, messages) =>
    set((state) => ({
      groupMessages: { ...state.groupMessages, [groupId]: messages },
    })),

  addGroupMessage: (groupId, message) =>
    set((state) => {
      const existing = state.groupMessages[groupId] ?? [];
      if (existing.some((m) => m.messageId === message.messageId)) return state;
      return {
        groupMessages: {
          ...state.groupMessages,
          [groupId]: [message, ...existing],
        },
      };
    }),

  recallGroupMessage: (groupId, messageId) =>
    set((state) => ({
      groupMessages: {
        ...state.groupMessages,
        [groupId]: (state.groupMessages[groupId] ?? []).map((m) =>
          m.messageId === messageId ? { ...m, recalled: true, content: 'Tin nhắn đã được thu hồi' } : m
        ),
      },
    })),

  deleteGroupMessage: (groupId: string, messageId: string) =>
    set((state) => ({
      groupMessages: {
        ...state.groupMessages,
        [groupId]: (state.groupMessages[groupId] ?? []).filter((m) => m.messageId !== messageId),
      },
    })),

  updateGroupReactions: (groupId, messageId, reactions) =>
    set((state) => ({
      groupMessages: {
        ...state.groupMessages,
        [groupId]: (state.groupMessages[groupId] ?? []).map((m) =>
          m.messageId === messageId ? { ...m, reactions } : m
        ),
      },
    })),

  updateGroupMessage: (groupId, messageId, content) =>
    set((state) => ({
      groupMessages: {
        ...state.groupMessages,
        [groupId]: (state.groupMessages[groupId] ?? []).map((m) =>
          m.messageId === messageId ? { ...m, content, isEdited: true } : m
        ),
      },
    })),

  setGroupMembers: (groupId, members) =>
    set((state) => ({
      groupMembers: { ...state.groupMembers, [groupId]: members },
    })),

  setGroupTyping: (groupId, userId, isTyping) =>
    set((state) => {
      const groupTyping = state.groupTypingUsers[groupId] || {};
      return {
        groupTypingUsers: {
          ...state.groupTypingUsers,
          [groupId]: { ...groupTyping, [userId]: isTyping },
        },
      };
    }),

  setGroupRead: (groupId, userId) =>
    set((state) => {
      const existing = state.groupReadState[groupId] ?? [];
      if (existing.includes(userId)) return state;
      return {
        groupReadState: {
          ...state.groupReadState,
          [groupId]: [...existing, userId]
        }
      };
    }),

  removeMember: (groupId, userId) =>
    set((state) => ({
      groupMembers: {
        ...state.groupMembers,
        [groupId]: (state.groupMembers[groupId] ?? []).filter((m) => m.userId !== userId),
      },
    })),

  updateMemberRole: (groupId: string, userId: string, role: 'ADMIN' | 'MEMBER') =>
    set((state) => ({
      groupMembers: {
        ...state.groupMembers,
        [groupId]: (state.groupMembers[groupId] ?? []).map((m) =>
          m.userId === userId ? { ...m, role } : m
        ),
      },
    })),

  setPinnedMessages: (groupId, messages) =>
    set((state) => ({
      pinnedMessages: { ...state.pinnedMessages, [groupId]: messages },
    })),

  addPin: (groupId, message) =>
    set((state) => {
      const existing = state.pinnedMessages[groupId] ?? [];
      if (existing.some((m) => m.messageId === message.messageId)) return state;
      return {
        pinnedMessages: {
          ...state.pinnedMessages,
          [groupId]: [message, ...existing],
        },
      };
    }),

  removePin: (groupId, messageId) =>
    set((state) => ({
      pinnedMessages: {
        ...state.pinnedMessages,
        [groupId]: (state.pinnedMessages[groupId] ?? []).filter((m) => m.messageId !== messageId),
      },
    })),
    
  upsertPoll: (groupId, poll) =>
    set((state) => ({
      polls: {
        ...state.polls,
        [groupId]: {
          ...(state.polls[groupId] || {}),
          [poll.pollId]: poll
        }
      }
    })),

  updatePollOptions: (groupId, pollId, options, closed) =>
    set((state) => {
      const groupPolls = state.polls[groupId] || {};
      const poll = groupPolls[pollId];
      if (!poll) return state;
      return {
        polls: {
          ...state.polls,
          [groupId]: {
            ...groupPolls,
            [pollId]: { ...poll, options, closedAt: closed ? new Date().toISOString() : poll.closedAt }
          }
        }
      };
    }),
}));
