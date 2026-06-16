import { useState, useRef, useCallback } from 'react';
import { aiService, AiConversation } from '../services/aiService';

export interface AiMessage {
  role: 'user' | 'assistant';
  content: string;
  time: Date;
}

export function useAiChat() {
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const conversationIdRef = useRef<string | undefined>(undefined);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    setMessages((prev) => [...prev, { role: 'user', content: text, time: new Date() }]);
    setLoading(true);
    try {
      const res = await aiService.chat({ message: text, conversationId: conversationIdRef.current });
      conversationIdRef.current = res.conversationId;
      setMessages((prev) => [...prev, { role: 'assistant', content: res.reply, time: new Date() }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Xin lỗi, tôi đang gặp sự cố. Vui lòng thử lại.', time: new Date() },
      ]);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const newConversation = useCallback(() => {
    setMessages([]);
    conversationIdRef.current = undefined;
  }, []);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const data = await aiService.getHistory();
      setConversations(data);
    } catch {
      setConversations([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const openConversation = useCallback(async (conv: AiConversation) => {
    setLoading(true);
    try {
      const msgs = await aiService.getMessages(conv.id);
      conversationIdRef.current = conv.id;
      setMessages(
        msgs.map((m) => ({
          role: m.senderType === 'USER' ? 'user' : 'assistant',
          content: m.content,
          time: new Date(m.createdAt),
        }))
      );
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteAllHistory = useCallback(async () => {
    await aiService.deleteHistory();
    setConversations([]);
    newConversation();
  }, [newConversation]);

  return {
    messages, loading,
    conversations, historyLoading,
    sendMessage, newConversation,
    loadHistory, openConversation, deleteAllHistory,
  };
}
