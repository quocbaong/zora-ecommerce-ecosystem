import { create } from 'zustand';
import type { Group, GroupMessage, GroupMember } from '@/features/chat/types/group';

interface GroupState {
  groups: Record<string, Group>;                                          // groupId → Group
  groupMessages: Record<string, GroupMessage[]>;                          // groupId → messages
  groupMembers: Record<string, GroupMember[]>;                            // groupId → members
  activeGroupId: string | null;
  /** groupId → userId → true (isTyping) */
  groupTypingUsers: Record<string, Record<string, boolean>>;
  /** groupId → Set<userId> who have read this group */
  groupReadState: Record<string, Set<string>>;
  totalGroupUnread: number;

  // ─── Actions ──────────────────────────────────────────────────────────────
  setActiveGroup: (groupId: string | null) => void;
  setTotalGroupUnread: (count: number) => void;

  upsertGroup: (group: Group) => void;
  removeGroup: (groupId: string) => void;
  setGroups: (groups: Group[]) => void;

  setGroupMessages: (groupId: string, messages: GroupMessage[]) => void;
  prependGroupMessages: (groupId: string, messages: GroupMessage[]) => void;
  addGroupMessage: (groupId: string, message: GroupMessage) => void;
  recallGroupMessage: (groupId: string, messageId: string) => void;
  deleteGroupMessage: (groupId: string, messageId: string) => void;
  updateGroupReactions: (groupId: string, messageId: string, reactions: Record<string, string[]>) => void;
  setMessagePinned: (groupId: string, messageId: string, pinned: boolean) => void;

  setGroupMembers: (groupId: string, members: GroupMember[]) => void;

  setGroupTyping: (groupId: string, userId: string, isTyping: boolean) => void;
  setGroupRead: (groupId: string, userId: string) => void;
}

export const useGroupStore = create<GroupState>((set) => ({
  groups: {},
  groupMessages: {},
  groupMembers: {},
  activeGroupId: null,
  groupTypingUsers: {},
  groupReadState: {},
  totalGroupUnread: 0,

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

  prependGroupMessages: (groupId, newMessages) =>
    set((state) => {
      const existing = state.groupMessages[groupId] ?? [];
      const existingIds = new Set(existing.map((m) => m.messageId));
      const toAdd = newMessages.filter((m) => !existingIds.has(m.messageId));
      return {
        groupMessages: { ...state.groupMessages, [groupId]: [...toAdd, ...existing] },
      };
    }),

  addGroupMessage: (groupId, message) =>
    set((state) => {
      const existing = state.groupMessages[groupId] ?? [];
      const idx = existing.findIndex((m) => m.messageId === message.messageId);
      if (idx !== -1) {
        // Upsert: remove old entry and re-append at end (moves to bottom, e.g. poll after new vote)
        const updated = [...existing.slice(0, idx), ...existing.slice(idx + 1), message];
        return { groupMessages: { ...state.groupMessages, [groupId]: updated } };
      }
      return {
        groupMessages: {
          ...state.groupMessages,
          [groupId]: [...existing, message],
        },
      };
    }),

  recallGroupMessage: (groupId, messageId) =>
    set((state) => ({
      groupMessages: {
        ...state.groupMessages,
        [groupId]: (state.groupMessages[groupId] ?? []).map((m) =>
          m.messageId === messageId ? { ...m, recalled: true, content: '' } : m
        ),
      },
    })),

  deleteGroupMessage: (groupId, messageId) =>
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

  setMessagePinned: (groupId, messageId, pinned) =>
    set((state) => ({
      groupMessages: {
        ...state.groupMessages,
        [groupId]: (state.groupMessages[groupId] ?? []).map((m) =>
          m.messageId === messageId ? { ...m, isPinned: pinned } : m
        ),
      },
    })),

  setGroupMembers: (groupId, members) =>
    set((state) => ({
      groupMembers: { ...state.groupMembers, [groupId]: members },
    })),

  setGroupTyping: (groupId, userId, isTyping) =>
    set((state) => ({
      groupTypingUsers: {
        ...state.groupTypingUsers,
        [groupId]: {
          ...(state.groupTypingUsers[groupId] ?? {}),
          [userId]: isTyping,
        },
      },
    })),

  setGroupRead: (groupId, userId) =>
    set((state) => {
      const existing = state.groupReadState[groupId] ?? new Set<string>();
      const updated = new Set(existing);
      updated.add(userId);
      return { groupReadState: { ...state.groupReadState, [groupId]: updated } };
    }),
}));
