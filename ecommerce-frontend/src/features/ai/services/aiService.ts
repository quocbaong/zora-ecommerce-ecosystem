import api from '@/lib/axios';

export interface AiChatRequest {
  message: string;
  conversationId?: string;
  requestId?: string;
}

export interface AiChatResponse {
  conversationId: string;
  reply: string;
}

export interface AiConversation {
  id: string;
  title: string;
  updatedAt: string;
  createdAt: string;
}

export interface AiMessage {
  id: string;
  conversationId: string;
  senderType: 'USER' | 'ASSISTANT';
  content: string;
  createdAt: string;
}

export const aiService = {
  chat: async (payload: AiChatRequest): Promise<AiChatResponse> => {
    const { data } = await api.post('/api/ai/chat', payload);
    return data;
  },

  getHistory: async (): Promise<AiConversation[]> => {
    const { data } = await api.get('/api/ai/history');
    return data;
  },

  getMessages: async (conversationId: string): Promise<AiMessage[]> => {
    const { data } = await api.get(`/api/ai/history/${encodeURIComponent(conversationId)}`);
    return data;
  },

  deleteHistory: async (): Promise<void> => {
    await api.delete('/api/ai/history');
  },
};
