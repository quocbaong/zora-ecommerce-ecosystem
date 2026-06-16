import { create } from 'zustand';
import type { Message } from '../types/chat';

export type CallStatus = 'idle' | 'calling' | 'incoming' | 'in_call';

export interface CallState {
  callId: string | null;
  conversationId: string | null;
  callType: 'video' | 'audio';
  callStatus: CallStatus;
  callerId: string | null;
  callerName: string | null;
  isInitiator: boolean;
  answeredAt: number | null;
  offer?: any;
  answer?: any;
  remoteCameraOff?: boolean;
}

interface ChatState {
  activeConversationId: string | null;
  messages: Record<string, Message[]>; // key: conversationId
  typingUsers: Record<string, boolean>; // key: userId
  readState: Record<string, string[]>; // conversationId -> userIds who read
  totalUnreadChat: number;
  userStatuses: Record<string, 'online' | 'offline'>;

  // Video/Audio call state
  call: CallState;

  setActiveConversation: (id: string | null) => void;
  addMessage: (conversationId: string, message: Message) => void;
  setMessages: (conversationId: string, messages: Message[]) => void;
  recallMessage: (conversationId: string, messageId: string) => void;
  deleteMessage: (conversationId: string, messageId: string) => void;
  updateReactions: (conversationId: string, messageId: string, reactions: Record<string, string[]>) => void;
  updateMessage: (conversationId: string, messageId: string, content: string) => void;
  setTyping: (userId: string, isTyping: boolean) => void;
  setRead: (conversationId: string, userId: string) => void;
  clearTyping: () => void;
  setTotalUnreadChat: (count: number) => void;
  incrementUnreadChat: () => void;
  updateUserStatus: (userId: string, status: 'online' | 'offline') => void;

  // Call actions
  startCall: (conversationId: string, callId: string, callType: 'video' | 'audio') => void;
  receiveCall: (conversationId: string, callId: string, callType: 'video' | 'audio', callerId: string, callerName: string, offer?: any) => void;
  acceptCall: (answer?: any) => void;
  endCall: () => void;
  setRemoteCameraOff: (off: boolean) => void;
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
  remoteCameraOff: false,
};

export const useChatStore = create<ChatState>()((set) => ({
  activeConversationId: null,
  messages: {},
  typingUsers: {},
  readState: {},
  totalUnreadChat: 0,
  userStatuses: {},
  call: defaultCall,

  setActiveConversation: (id) => set({ activeConversationId: id }),

  addMessage: (conversationId, message) =>
    set((state) => {
      const existing = state.messages[conversationId] ?? [];
      const isDuplicate = (message.id && existing.some((m) => m.id === message.id)) || 
                          (message.messageId && existing.some((m) => m.messageId === message.messageId));
      if (isDuplicate) return state;

      const isNewNotification = conversationId !== state.activeConversationId;

      return {
        messages: {
          ...state.messages,
          [conversationId]: [message, ...existing],
        },
        totalUnreadChat: isNewNotification ? state.totalUnreadChat + 1 : state.totalUnreadChat,
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
          m.id === messageId ? { ...m, recalled: true, content: 'Tin nhắn đã được thu hồi' } : m
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

  updateMessage: (conversationId, messageId, content) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: (state.messages[conversationId] ?? []).map((m) =>
          m.id === messageId ? { ...m, content, isEdited: true } : m
        ),
      },
    })),

  setTyping: (userId, isTyping) =>
    set((state) => ({
      typingUsers: { ...state.typingUsers, [userId]: isTyping },
    })),

  setRead: (conversationId, userId) =>
    set((state) => {
      const existing = state.readState[conversationId] ?? [];
      if (existing.includes(userId)) return state;
      return {
        readState: {
          ...state.readState,
          [conversationId]: [...existing, userId]
        }
      };
    }),

  clearTyping: () => set({ typingUsers: {} }),

  setTotalUnreadChat: (count) => set({ totalUnreadChat: count }),

  incrementUnreadChat: () =>
    set((state) => ({ totalUnreadChat: state.totalUnreadChat + 1 })),

  updateUserStatus: (userId, status) =>
    set((state) => ({
      userStatuses: { ...state.userStatuses, [userId]: status },
    })),

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

  receiveCall: (conversationId, callId, callType, callerId, callerName, offer) =>
    set((state) => {
      if (state.call.callStatus === 'in_call') return state;
      if (state.call.callId === callId) return state; 
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
          offer,
        },
      };
    }),

  acceptCall: (answer) =>
    set((state) => ({
      call: { ...state.call, callStatus: 'in_call', answeredAt: Date.now(), answer },
    })),

  endCall: () => set({ call: defaultCall }),

  setRemoteCameraOff: (off) => set((state) => ({ call: { ...state.call, remoteCameraOff: off } })),
}));
