import { useEffect, useRef, useState } from 'react';
import { Sparkles, Send, History, RefreshCw, Trash2, X, MessageSquarePlus } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAiChat } from '../hooks/useAiChat';
import { useAuthStore } from '@/stores/authStore';

function formatTime(d: Date) {
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function formatRelative(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 60) return 'Vừa xong';
  if (diff < 3600) return Math.floor(diff / 60) + ' phút';
  if (diff < 86400) return Math.floor(diff / 3600) + ' giờ';
  return d.toLocaleDateString('vi-VN');
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-3 py-2 rounded-2xl bg-gray-100 w-fit">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-gray-400 block"
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  );
}

export default function AiChatPanel() {
  const {
    messages, loading,
    conversations, historyLoading,
    sendMessage, newConversation,
    loadHistory, openConversation, deleteAllHistory,
  } = useAiChat();
  const isSeller = useAuthStore((s) => s.user?.role?.toUpperCase() === 'SELLER');

  const [input, setInput] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = () => {
    if (!input.trim() || loading) return;
    sendMessage(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      if (e.nativeEvent.isComposing || e.keyCode === 229) return;
      e.preventDefault();
      handleSend();
    }
  };

  const handleOpenHistory = () => {
    setShowHistory(true);
    loadHistory();
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-sm shadow-orange-200">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">ZORA AI</p>
            <p className="text-xs text-gray-500">Trợ lý AI luôn sẵn sàng</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => newConversation()}
            className="p-2 rounded-xl text-gray-500 hover:text-orange-500 hover:bg-orange-50 transition-colors"
            title="Làm mới chat"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={handleOpenHistory}
            className="p-2 rounded-xl text-gray-500 hover:text-orange-500 hover:bg-orange-50 transition-colors"
            title="Xem lịch sử"
          >
            <History className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-gray-50/40">
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center mb-4 shadow-lg shadow-orange-200">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <p className="font-semibold text-gray-900">Xin chào! Tôi là ZORA AI</p>
            <p className="text-sm text-gray-500 mt-1 max-w-sm">
              {isSeller
                ? 'Hỏi tôi về thống kê shop, đơn hàng, chính sách sàn...'
                : 'Hỏi tôi về đơn hàng, sản phẩm, chính sách đổi trả, giao hàng...'}
            </p>
            <div className="flex flex-col gap-2 mt-4 w-full max-w-xs">
              {(isSeller
                ? ['Thống kê doanh thu shop?', 'Đơn hàng cần xác nhận?', 'Chính sách Seller?']
                : ['Chính sách đổi trả?', 'Theo dõi đơn hàng ở đâu?', 'Thời gian giao hàng?']
              ).map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-sm px-4 py-2.5 rounded-full border border-orange-200 text-orange-600 bg-orange-50/50 hover:bg-orange-100 transition-colors text-left"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className="max-w-[75%]">
              <div
                className={`px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap break-words ${
                  m.role === 'user'
                    ? 'bg-orange-500 text-white rounded-br-md'
                    : 'bg-white border border-gray-100 text-gray-800 rounded-bl-md shadow-sm'
                }`}
              >
                {m.content}
              </div>
              <p className={`text-[10px] text-gray-400 mt-1 ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
                {formatTime(m.time)}
              </p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <TypingDots />
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-100 px-4 py-3 bg-white">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nhập tin nhắn cho AI..."
            rows={1}
            className="flex-1 resize-none rounded-2xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/50 max-h-32"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="w-10 h-10 rounded-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-white shadow-sm transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-gray-400 text-center mt-2">
          Enter để gửi · Shift+Enter xuống dòng
        </p>
      </div>

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg max-h-[80vh] flex flex-col rounded-2xl bg-white shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <History className="w-5 h-5 text-orange-500" /> Lịch sử trò chuyện
              </h3>
              <button onClick={() => setShowHistory(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-2 py-2">
              {historyLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="py-12 text-center text-sm text-gray-500">Chưa có cuộc trò chuyện nào</div>
              ) : (
                conversations.map((c) => (
                  <button
                    key={c.id}
                    onClick={async () => {
                      await openConversation(c);
                      setShowHistory(false);
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-orange-50 transition-colors flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {c.title || 'Cuộc trò chuyện'}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatRelative(c.updatedAt)}</p>
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="flex justify-between gap-2 px-5 py-3 border-t border-gray-100">
              <button
                onClick={async () => {
                  if (confirm('Xoá toàn bộ lịch sử trò chuyện AI?')) {
                    await deleteAllHistory();
                  }
                }}
                disabled={conversations.length === 0}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-50 disabled:opacity-40"
              >
                <Trash2 className="w-4 h-4" /> Xoá hết
              </button>
              <button
                onClick={() => {
                  newConversation();
                  setShowHistory(false);
                }}
                className="flex items-center gap-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 px-4 py-2 text-sm font-semibold text-white"
              >
                <MessageSquarePlus className="w-4 h-4" /> Chat mới
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
