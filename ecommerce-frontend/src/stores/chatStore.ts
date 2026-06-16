import { create } from 'zustand';
import type { Message } from '@/features/chat/types';
import { useGroupCallStore } from './groupCallStore';

export type CallStatus = 'idle' | 'calling' | 'incoming' | 'in_call';

export interface CallState {
  callId: string | null;
  conversationId: string | null;
  callType: 'video' | 'audio';
  callStatus: CallStatus;
  callerId: string | null;
  callerName: string | null;
  isInitiator: boolean;
  answeredAt: number | null; // Date.now() when call became in_call
}

interface ChatState {
  activeConversationId: string | null;
  messages: Record<string, Message[]>; // key: conversationId
  typingUsers: Record<string, boolean>; // key: userId
  presenceByUserId: Record<string, boolean>;
  totalUnreadChat: number;
  // read receipts: conversationId -> Set of userIds who have read
  readState: Record<string, Set<string>>;

  // Video/Audio call state
  call: CallState;

  setActiveConversation: (id: string | null) => void;
  addMessage: (conversationId: string, message: Message) => void;
  setMessages: (conversationId: string, messages: Message[]) => void;
  recallMessage: (conversationId: string, messageId: string) => void;
  deleteMessage: (conversationId: string, messageId: string) => void;
  updateReactions: (conversationId: string, messageId: string, reactions: Record<string, string[]>) => void;
  setTyping: (userId: string, isTyping: boolean) => void;
  clearTyping: () => void;
  setPresence: (userId: string, isOnline: boolean) => void;
  setPresenceBatch: (presence: Record<string, boolean>) => void;
  clearPresence: () => void;
  setTotalUnreadChat: (count: number) => void;
  incrementUnreadChat: () => void;
  setRead: (conversationId: string, userId: string) => void;

  // Call actions
  startCall: (conversationId: string, callId: string, callType: 'video' | 'audio') => void;
  receiveCall: (conversationId: string, callId: string, callType: 'video' | 'audio', callerId: string, callerName: string) => void;
  acceptCall: () => void;
  endCall: () => void;
}

const defaultCall: CallState = {
  callId: null,
  conversationId: null,
  callType: 'video',
  callStatus: 'idle',
  callerId: null,
  callerName: null,
  isInitiator: false,
  answeredAt: null,
};

export const useChatStore = create<ChatState>()((set) => ({
  activeConversationId: null,
  messages: {},
  typingUsers: {},
  presenceByUserId: {},
  totalUnreadChat: 0,
  readState: {},
  call: defaultCall,

  setActiveConversation: (id) => set({ activeConversationId: id }),

  addMessage: (conversationId, message) =>
    set((state) => {
      const existing = state.messages[conversationId] ?? [];
      if (message.id && existing.some((m) => m.id === message.id)) return state;
      return {
        messages: {
          ...state.messages,
          [conversationId]: [...existing, message],
        },
      };
    }),

  setMessages: (conversationId, messages) =>
    set((state) => ({
      messages: { ...state.messages, [conversationId]: messages },
    })),

  recallMessage: (conversationId, messageId) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: (state.messages[conversationId] ?? []).map((m) =>
          m.id === messageId ? { ...m, recalled: true, content: '' } : m
        ),
      },
    })),

  deleteMessage: (conversationId, messageId) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: (state.messages[conversationId] ?? []).filter((m) => m.id !== messageId),
      },
    })),

  updateReactions: (conversationId, messageId, reactions) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: (state.messages[conversationId] ?? []).map((m) =>
          m.id === messageId ? { ...m, reactions } : m
        ),
      },
    })),

  setTyping: (userId, isTyping) =>
    set((state) => ({
      typingUsers: { ...state.typingUsers, [userId]: isTyping },
    })),

  clearTyping: () => set({ typingUsers: {} }),

  setPresence: (userId, isOnline) =>
    set((state) => ({
      presenceByUserId: { ...state.presenceByUserId, [userId]: isOnline },
    })),

  setPresenceBatch: (presence) =>
    set((state) => ({
      presenceByUserId: { ...state.presenceByUserId, ...presence },
    })),

  clearPresence: () => set({ presenceByUserId: {} }),

  setTotalUnreadChat: (count) => set({ totalUnreadChat: count }),

  incrementUnreadChat: () =>
    set((state) => ({ totalUnreadChat: state.totalUnreadChat + 1 })),

  setRead: (conversationId, userId) =>
    set((state) => {
      const existing = state.readState[conversationId] ?? new Set<string>();
      const updated = new Set(existing);
      updated.add(userId);
      return { readState: { ...state.readState, [conversationId]: updated } };
    }),

  startCall: (conversationId, callId, callType) =>
    set({
      call: {
        callId,
        conversationId,
        callType,
        callStatus: 'calling',
        callerId: null,
        callerName: null,
        isInitiator: true,
        answeredAt: null,
      },
    }),

  receiveCall: (conversationId, callId, callType, callerId, callerName) =>
    set((state) => {
      // Duplicate event for the same call — no-op
      if (state.call.callId === callId) return state;
      // Busy with another call (incoming / calling / in_call) → drop the new one.
      // This prevents call state from being overwritten when a second caller
      // rings while the first call is still pending.
      if (state.call.callStatus !== 'idle') return state;
      // Cross-store guard — already in / ringing a group call
      const groupCall = useGroupCallStore.getState();
      if (groupCall.status !== 'idle') return state;
      return {
        call: {
          callId,
          conversationId,
          callType,
          callStatus: 'incoming',
          callerId,
          callerName,
          isInitiator: false,
          answeredAt: null,
        },
      };
    }),

  acceptCall: () =>
    set((state) => ({
      call: { ...state.call, callStatus: 'in_call', answeredAt: Date.now() },
    })),

  endCall: () => set({ call: defaultCall }),
}));
