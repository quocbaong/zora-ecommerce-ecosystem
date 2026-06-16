import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Bot, X, Send, RotateCcw, ChevronLeft, Clock, Trash2, MessageSquarePlus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAiChat } from '../hooks/useAiChat';
import { useAuthStore } from '@/stores/authStore';
import { AiConversation } from '../services/aiService';

const PRIMARY = '#FF6B35';
const NAVY = '#0A2540';

const USER_QUICK_PROMPTS = ['Chính sách đổi trả?', 'Theo dõi đơn hàng ở đâu?', 'Thời gian giao hàng?'];
const SELLER_QUICK_PROMPTS = ['Thống kê doanh thu shop?', 'Đơn hàng cần xác nhận?', 'Chính sách Seller?'];

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-1 py-1">
      {[0, 1, 2].map((i) => (
        <motion.span key={i} className="w-2 h-2 rounded-full bg-gray-400 block"
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  );
}

function formatTime(date: Date) {
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function formatRelative(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return 'Hôm nay ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Hôm qua';
  if (diffDays < 7) return `${diffDays} ngày trước`;
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

// ─── History Panel ────────────────────────────────────────────────
function HistoryPanel({
  conversations, loading,
  onOpen, onNew, onDelete, onBack,
}: {
  conversations: AiConversation[];
  loading: boolean;
  onOpen: (c: AiConversation) => void;
  onNew: () => void;
  onDelete: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 flex-shrink-0" style={{ background: NAVY }}>
        <button onClick={onBack} className="w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors">
          <ChevronLeft size={18} />
        </button>
        <span className="text-white font-semibold text-sm flex-1">Lịch sử trò chuyện</span>
        <button onClick={onNew} title="Cuộc trò chuyện mới"
          className="w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors">
          <MessageSquarePlus size={16} />
        </button>
        <button onClick={onDelete} title="Xóa tất cả"
          className="w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors">
          <Trash2 size={15} />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto" style={{ background: '#F4F5F7' }}>
        {loading && (
          <div className="flex justify-center items-center h-20">
            <div className="w-5 h-5 border-2 border-gray-300 border-t-orange-400 rounded-full animate-spin" />
          </div>
        )}
        {!loading && conversations.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-6 py-10">
            <Clock size={32} className="text-gray-300" />
            <p className="text-gray-400 text-sm">Chưa có cuộc trò chuyện nào</p>
          </div>
        )}
        {!loading && conversations.map((conv) => (
          <button key={conv.id} onClick={() => onOpen(conv)}
            className="w-full flex items-start gap-3 px-4 py-3 hover:bg-white border-b border-gray-100 text-left transition-colors">
            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ background: `${PRIMARY}20` }}>
              <Bot size={16} style={{ color: PRIMARY }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{conv.title}</p>
              <p className="text-xs text-gray-400 mt-0.5">{formatRelative(conv.updatedAt)}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Chat Panel ───────────────────────────────────────────────────
function ChatPanel({
  messages, loading, input, setInput,
  onSend, onKeyDown, onHistory, onNew, onClose,
  inputRef, bottomRef, isSeller,
}: {
  messages: ReturnType<typeof useAiChat>['messages'];
  loading: boolean;
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onHistory: () => void;
  onNew: () => void;
  onClose: () => void;
  inputRef: React.RefObject<HTMLInputElement>;
  bottomRef: React.RefObject<HTMLDivElement>;
  isSeller: boolean;
}) {
  const quickPrompts = isSeller ? SELLER_QUICK_PROMPTS : USER_QUICK_PROMPTS;
  const subtitle = isSeller
    ? 'Hỏi tôi về thống kê shop, đơn hàng, chính sách sàn...'
    : 'Hỏi tôi về đơn hàng, sản phẩm, chính sách đổi trả...';
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0" style={{ background: NAVY }}>
        <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: PRIMARY }}>
          <Bot size={18} color="#fff" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm leading-tight">ZORA AI</p>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
            <span className="text-white/60 text-xs">Đang hoạt động</span>
          </div>
        </div>
        <button onClick={onHistory} title="Lịch sử"
          className="w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors">
          <Clock size={15} />
        </button>
        <button onClick={onNew} title="Cuộc trò chuyện mới"
          className="w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors">
          <RotateCcw size={14} />
        </button>
        <button onClick={onClose}
          className="w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1" style={{ background: '#F4F5F7' }}>
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-6">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mb-1" style={{ background: `${PRIMARY}20` }}>
              <Bot size={28} style={{ color: PRIMARY }} />
            </div>
            <p className="font-semibold text-gray-700 text-sm">Xin chào! Tôi là ZORA AI</p>
            <p className="text-gray-400 text-xs leading-relaxed">{subtitle}</p>
            <div className="flex flex-col gap-2 mt-3 w-full">
              {quickPrompts.map((q) => (
                <button key={q} onClick={() => {
                  // trigger via parent — handled in widget
                  const event = new CustomEvent('ai-quick-prompt', { detail: q });
                  window.dispatchEvent(event);
                }}
                  className="text-xs px-3 py-2 rounded-full border text-left transition-colors hover:bg-white"
                  style={{ borderColor: `${PRIMARY}40`, color: PRIMARY, background: `${PRIMARY}08` }}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => {
          const isUser = msg.role === 'user';
          const prev = messages[i - 1];
          const showAvatar = !isUser && (!prev || prev.role === 'user');
          return (
            <div key={i}>
              {i === 0 && (
                <p className="text-center text-gray-400 text-xs mb-3">
                  {msg.time.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
              )}
              <div className={`flex items-end gap-2 ${isUser ? 'justify-end' : 'justify-start'} mb-1`}>
                {!isUser && (
                  <div className="w-7 flex-shrink-0 self-end mb-1">
                    {showAvatar
                      ? <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: PRIMARY }}><Bot size={14} color="#fff" /></div>
                      : <div className="w-7" />}
                  </div>
                )}
                <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[78%]`}>
                  <div className="px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words"
                    style={{
                      background: isUser ? PRIMARY : '#fff',
                      color: isUser ? '#fff' : '#1a1a1a',
                      borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                    }}>
                    {msg.content}
                  </div>
                  <span className="text-gray-400 text-[10px] mt-0.5 px-1">{formatTime(msg.time)}</span>
                </div>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-end gap-2 justify-start mb-1">
            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: PRIMARY }}>
              <Bot size={14} color="#fff" />
            </div>
            <div className="px-3 py-2" style={{ background: '#fff', borderRadius: '18px 18px 18px 4px', boxShadow: '0 1px 2px rgba(0,0,0,0.08)' }}>
              <TypingDots />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 px-3 py-3 border-t border-gray-100 bg-white flex-shrink-0">
        <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown} placeholder="Nhập tin nhắn..."
          disabled={loading}
          className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm outline-none placeholder-gray-400 disabled:opacity-50 transition-colors focus:bg-gray-50"
        />
        <button onClick={onSend} disabled={loading || !input.trim()}
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-30"
          style={{ background: input.trim() ? PRIMARY : '#e5e7eb' }}>
          <Send size={15} color={input.trim() ? '#fff' : '#9ca3af'} />
        </button>
      </div>
    </div>
  );
}

// ─── Widget ───────────────────────────────────────────────────────
export default function AiChatWidget() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'chat' | 'history'>('chat');
  const [input, setInput] = useState('');
  const location = useLocation();
  const isChatPage = location.pathname.startsWith('/chat');
  const {
    messages, loading,
    conversations, historyLoading,
    sendMessage, newConversation,
    loadHistory, openConversation, deleteAllHistory,
  } = useAiChat();
  const isSeller = useAuthStore((s) => s.user?.role?.toUpperCase() === 'SELLER');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (open && view === 'chat') setTimeout(() => inputRef.current?.focus(), 150);
    if (open && view === 'history') loadHistory();
  }, [open, view]);

  // Quick prompt via custom event
  useEffect(() => {
    const handler = (e: Event) => {
      const q = (e as CustomEvent).detail as string;
      sendMessage(q);
    };
    window.addEventListener('ai-quick-prompt', handler);
    return () => window.removeEventListener('ai-quick-prompt', handler);
  }, [sendMessage]);

  // Mở widget từ nơi khác (vd: nút "Chat với AI" trong ChatPage sidebar)
  useEffect(() => {
    const openHandler = () => setOpen(true);
    window.addEventListener('ai-widget-open', openHandler);
    return () => window.removeEventListener('ai-widget-open', openHandler);
  }, []);

  const handleSend = () => {
    if (!input.trim() || loading) return;
    sendMessage(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      if ((e.nativeEvent as KeyboardEvent).isComposing || e.keyCode === 229) return;
      e.preventDefault();
      handleSend();
    }
  };

  const handleOpenConv = async (conv: typeof conversations[0]) => {
    await openConversation(conv);
    setView('chat');
  };

  const handleNew = () => {
    newConversation();
    setView('chat');
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="rounded-2xl overflow-hidden shadow-2xl"
            style={{ width: 360, height: 540, background: '#fff' }}
          >
            <AnimatePresence mode="wait">
              {view === 'chat' ? (
                <motion.div key="chat" className="h-full"
                  initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}
                  transition={{ duration: 0.18 }}>
                  <ChatPanel
                    messages={messages} loading={loading}
                    input={input} setInput={setInput}
                    onSend={handleSend} onKeyDown={handleKeyDown}
                    onHistory={() => setView('history')}
                    onNew={handleNew}
                    onClose={() => setOpen(false)}
                    inputRef={inputRef} bottomRef={bottomRef}
                    isSeller={isSeller}
                  />
                </motion.div>
              ) : (
                <motion.div key="history" className="h-full"
                  initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 20, opacity: 0 }}
                  transition={{ duration: 0.18 }}>
                  <HistoryPanel
                    conversations={conversations} loading={historyLoading}
                    onOpen={handleOpenConv}
                    onNew={handleNew}
                    onDelete={deleteAllHistory}
                    onBack={() => setView('chat')}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating button — ẩn ở trang /chat (đã có entry trong sidebar) */}
      {!isChatPage && <motion.button
        onClick={() => setOpen((o) => !o)}
        whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.93 }}
        className="w-14 h-14 rounded-full shadow-lg flex items-center justify-center"
        style={{ background: PRIMARY }}
        title="Chat với ZORA AI"
      >
        <AnimatePresence mode="wait">
          {open
            ? <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}><X size={22} color="#fff" /></motion.div>
            : <motion.div key="bot" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}><Bot size={24} color="#fff" /></motion.div>
          }
        </AnimatePresence>
      </motion.button>}
    </div>
  );
}
