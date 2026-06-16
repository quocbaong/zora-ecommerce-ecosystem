import apiClient from '../../api/client';

export interface ReportPayload {
  conversationId: string;
  reason: string;
  description: string;
  evidenceMessageIds: string[];
  evidenceImages: string[];
}

export const chatService = {
  uploadEvidenceImage: async (uri: string, conversationId: string): Promise<{ url: string }> => {
    const formData = new FormData();
    const filename = uri.split('/').pop() || 'evidence.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : `image/jpeg`;

    // @ts-ignore (React Native FormData requires objects for files)
    formData.append('file', { uri, name: filename, type });

    // The API might expect conversationId for organizing uploads
    // formData.append('conversationId', conversationId);

    const response = await apiClient.post(`/chat/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  reportConversation: async (payload: ReportPayload): Promise<void> => {
    await apiClient.post(`/chat/conversations/${payload.conversationId}/report`, {
      reason: payload.reason,
      description: payload.description,
      evidenceMessageIds: payload.evidenceMessageIds,
      evidenceImages: payload.evidenceImages,
    });
  },
};
