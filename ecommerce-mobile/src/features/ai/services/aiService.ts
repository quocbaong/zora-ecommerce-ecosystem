import apiClient from '../../../api/client';

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
    const { data } = await apiClient.post('/ai/chat', payload);
    return data;
  },

  getHistory: async (): Promise<AiConversation[]> => {
    const { data } = await apiClient.get('/ai/history');
    return data;
  },

  getMessages: async (conversationId: string): Promise<AiMessage[]> => {
    const { data } = await apiClient.get(`/ai/history/${encodeURIComponent(conversationId)}`);
    return data;
  },

  deleteHistory: async (): Promise<void> => {
    await apiClient.delete('/ai/history');
  },
};
