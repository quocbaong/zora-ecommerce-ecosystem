import api from '@/lib/axios';
import type { Conversation, Message, SendMessagePayload, CreateConversationPayload, MessageType } from '../types';

// WebSocket messages use `messageId`, REST API uses `id` — normalize to `id`
function normalizeMessage(raw: Record<string, unknown>): Message {
  return {
    id: (raw.id ?? raw.messageId ?? '') as string,
    conversationId: raw.conversationId as string | undefined,
    senderId: (raw.senderId ?? '') as string,
    type: (raw.type ?? 'TEXT') as MessageType,
    content: (raw.content ?? '') as string,
    recalled: (raw.recalled ?? false) as boolean,
    reactions: (raw.reactions ?? {}) as Record<string, string[]>,
    createdAt: (raw.createdAt ?? new Date().toISOString()) as string,
    isForwarded: raw.isForwarded as boolean | undefined,
    forwardedFrom: raw.forwardedFrom as string | undefined,
  };
}

function extractArray<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (raw && typeof raw === 'object') {
    const r = raw as Record<string, unknown>;
    // Common wrapper keys in priority order
    for (const key of ['data', 'content', 'messages', 'items', 'list', 'conversations']) {
      if (Array.isArray(r[key])) return r[key] as T[];
    }
    // Last resort: first array value in the object
    for (const value of Object.values(r)) {
      if (Array.isArray(value)) return value as T[];
    }
  }
  return [];
}

function extractSingle<T>(raw: unknown): T {
  if (raw && typeof raw === 'object') {
    const r = raw as Record<string, unknown>;
    // if wrapped { success, data: {...} } and data is an object (not array)
    if (r.data && typeof r.data === 'object' && !Array.isArray(r.data)) {
      return r.data as T;
    }
  }
  return raw as T;
}

const pendingConversationRequests = new Map<string, Promise<Conversation>>();

function normalizeConversation(raw: Record<string, unknown>): Conversation {
  const id = (raw.conversationId ?? raw.id ?? '') as string;
  const userId = (raw.userId ?? '') as string;
  const sellerId = (raw.sellerId ?? '') as string;
  const participants = [userId, sellerId].filter(Boolean);
  const lastMessageAt = raw.lastMessageAt
    ? typeof raw.lastMessageAt === 'number'
      ? new Date(raw.lastMessageAt).toISOString()
      : String(raw.lastMessageAt)
    : undefined;
  return {
    id,
    participants,
    userId,
    sellerId,
    productId: raw.productId as string | undefined,
    lastMessage: raw.lastMessage as string | undefined,
    lastMessageAt,
    updatedAt: raw.updatedAt as string | undefined,
    unreadUser: raw.unreadUser as number | undefined,
    unreadSeller: raw.unreadSeller as number | undefined,
    conversationType: raw.conversationType as 'PRODUCT' | 'DIRECT' | undefined,
    friendshipStatus: raw.friendshipStatus as 'NONE' | 'PENDING' | 'ACCEPTED' | undefined,
  };
}

function getConversationRequestKey(payload: CreateConversationPayload) {
  return `${payload.sellerId}:${payload.productId ?? ''}`;
}

export const chatService = {
  getOrCreateConversation: (payload: CreateConversationPayload) => {
    const key = getConversationRequestKey(payload);
    const existing = pendingConversationRequests.get(key);
    if (existing) return existing;

    const promise = api
      .post('/api/chat/conversations', payload)
      .then((r) => {
        const raw = extractSingle<Record<string, unknown>>(r.data);
        return normalizeConversation(raw);
      })
      .finally(() => {
        pendingConversationRequests.delete(key);
      });

    pendingConversationRequests.set(key, promise);
    return promise;
  },

  getConversations: () =>
    api.get('/api/chat/conversations').then((r) => {
      const list = extractArray<Record<string, unknown>>(r.data);
      return list.map(normalizeConversation);
    }),

  getConversationDetail: (id: string) =>
    api.get(`/api/chat/conversations/${id}`).then((r) => extractSingle<Conversation>(r.data)),

  getMessages: (conversationId: string, params?: { limit?: number; lastKey?: string }) =>
    api
      .get(`/api/chat/conversations/${conversationId}/messages`, { params })
      .then((r) => extractArray<unknown>(r.data).map((m) => normalizeMessage(m as Record<string, unknown>))),

  sendMessage: (conversationId: string, payload: SendMessagePayload) =>
    api
      .post(`/api/chat/conversations/${conversationId}/messages`, payload)
      .then((r) => normalizeMessage(extractSingle<Record<string, unknown>>(r.data))),

  markAsRead: (conversationId: string) =>
    api.put<Conversation>(`/api/chat/conversations/${conversationId}/read`).then((r) => r.data),

  uploadFile: (file: File, conversationId: string) => {
    const form = new FormData();
    form.append('file', file);
    return api
      .post<{ success: boolean; url?: string }>(
        `/api/chat/upload?conversationId=${conversationId}`,
        form,
        { headers: { 'Content-Type': undefined } }
      )
      .then((r) => r.data);
  },

  deleteMessage: (conversationId: string, messageId: string) =>
    api.delete(`/api/chat/conversations/${conversationId}/messages/${messageId}`).then((r) => r.data),

  recallMessage: (conversationId: string, messageId: string) =>
    api.put(`/api/chat/conversations/${conversationId}/messages/${messageId}/recall`).then((r) => r.data),

  addReaction: (conversationId: string, messageId: string, emoji: string) =>
    api.post(`/api/chat/conversations/${conversationId}/messages/${messageId}/reactions`, { emoji }).then((r) => r.data),

  deleteConversation: (conversationId: string) =>
    api.delete(`/api/chat/conversations/${conversationId}`).then((r) => r.data),

  reportConversation: (conversationId: string, payload: { reason: string; description: string; evidenceMessageIds: string[]; evidenceImages?: string[] }) =>
    api
      .post(`/api/chat/conversations/${conversationId}/report`, payload)
      .then((r) => r.data),
};
