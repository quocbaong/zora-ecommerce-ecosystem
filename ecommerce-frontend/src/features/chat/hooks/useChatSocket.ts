import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket } from '@/lib/socket';
import { useChatStore } from '@/stores/chatStore';
import { showBrowserNotification, isTabHidden, ensurePermission } from '@/lib/browserNotification';
import type { Message, MessageType } from '../types';
import type { ChatNewNotification } from '@/types/api.types';

interface CallHandlers {
  onIncomingCall?: (data: {
    conversationId: string;
    callId: string;
    callType: 'video' | 'audio';
    callerId: string;
    callerName: string;
    offer: RTCSessionDescriptionInit;
  }) => void;
  onCallAnswered?: (data: { callId: string; answer: RTCSessionDescriptionInit }) => void;
  onCallRejected?: (data: { callId: string }) => void;
  onCallEnded?: (data: { callId: string }) => void;
  onSignal?: (data: { callId: string; signal: { type: string; candidate?: RTCIceCandidateInit } }) => void;
}

function normalizeMessage(raw: Record<string, unknown>, fallbackConvId?: string): Message {
  const msgConvId = (raw.conversationId ?? fallbackConvId ?? '') as string;
  return {
    id: (raw.id ?? raw.messageId ?? '') as string,
    conversationId: msgConvId,
    senderId: (raw.senderId ?? '') as string,
    type: (raw.type ?? 'TEXT') as MessageType,
    content: (raw.content ?? '') as string,
    recalled: (raw.recalled ?? false) as boolean,
    reactions: (raw.reactions ?? {}) as Record<string, string[]>,
    createdAt: (raw.createdAt ?? new Date().toISOString()) as string,
  };
}

export function useChatSocket(conversationId: string | null, callHandlers?: CallHandlers) {
  const addMessage = useChatStore((s) => s.addMessage);
  const recallMessage = useChatStore((s) => s.recallMessage);
  const updateReactions = useChatStore((s) => s.updateReactions);
  const setTyping = useChatStore((s) => s.setTyping);
  const setRead = useChatStore((s) => s.setRead);
  const activeConversationId = useChatStore((s) => s.activeConversationId);
  const qc = useQueryClient();
  const socketRef = useRef(getSocket());
  const joinedRoomRef = useRef<string | null>(null);
  // Keep latest handlers without re-subscribing on each render
  const handlersRef = useRef<CallHandlers | undefined>(callHandlers);
  useEffect(() => { handlersRef.current = callHandlers; }, [callHandlers]);

  // ── GLOBAL: new_message from personal room ────────────────────────────────
  // This handles real-time messages for ALL conversations regardless of which one is active.
  // Backend emits new_message to user:${userId} personal room so this always fires.
  useEffect(() => {
    const socket = socketRef.current;

    const handleNewMessage = (data: { message: Record<string, unknown> }) => {
      const raw = data?.message ?? (data as unknown as Record<string, unknown>);
      const message = normalizeMessage(raw);
      console.log('[socket] new_message received', message.conversationId, message.id);
      if (!message.conversationId) return; // malformed, skip
      // addMessage deduplicates by id, safe to call always
      addMessage(message.conversationId, message);

      // Nếu đang mở chính conv này trên /chat VÀ tab đang focus: KHÔNG invalidate
      // conv list, vì refetch sẽ trả unread count từ DB chưa kịp reset → badge nhảy.
      // Patch lastMessage/lastMessageAt vào cache trực tiếp.
      // Nếu tab ẩn (user sang YouTube...) → coi như không active, refetch bình thường
      // để badge unread cập nhật được.
      const state = useChatStore.getState();
      const isOnChatPage = typeof window !== 'undefined' && window.location.pathname === '/chat';
      const isTabFocused = typeof document !== 'undefined' && !document.hidden && document.hasFocus();
      const isActiveOpen = isOnChatPage && isTabFocused && state.activeConversationId === message.conversationId;

      if (isActiveOpen) {
        type ConvList = Array<{ id: string; lastMessage?: string; lastMessageAt?: string | number }>;
        qc.setQueryData<ConvList>(['chat', 'conversations'], (old) => {
          if (!old) return old;
          const preview = typeof message.content === 'string'
            ? message.content.substring(0, 100)
            : '';
          return old.map((c) => c.id === message.conversationId
            ? { ...c, lastMessage: preview, lastMessageAt: message.createdAt }
            : c);
        });
      } else {
        qc.invalidateQueries({ queryKey: ['chat', 'conversations'] });
        // A new message can be a friend-request acceptance reply — always keep friends cache fresh
        qc.invalidateQueries({ queryKey: ['chat', 'friends'] });
      }
      qc.invalidateQueries({ queryKey: ['chat', 'messages', message.conversationId] });
    };

    socket.on('new_message', handleNewMessage);
    console.log('[socket] global new_message handler registered, socket id:', socket.id);
    return () => {
      socket.off('new_message', handleNewMessage);
    };
  // addMessage and qc are stable refs — no need to re-subscribe
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── GLOBAL: new_notification — unread badge + browser notification ─────────
  useEffect(() => {
    // Request quyền 1 lần khi user đăng nhập và socket sẵn sàng. Browser sẽ
    // hỏi user — nếu họ deny thì các lần sau bỏ qua, không spam.
    ensurePermission();

    const socket = socketRef.current;

    const handleNewNotification = (data: ChatNewNotification) => {
      // Chỉ coi là "đang xem" khi vừa ở /chat VỪA conv khớp activeConversationId
      // VỪA tab đang focus (không hidden). Nếu user chuyển sang tab YouTube
      // hoặc minimize window, tab ZORA ẩn → cần coi là "không xem" để increment
      // unread badge và hiện browser notification.
      const isOnChatPage = typeof window !== 'undefined' && window.location.pathname === '/chat';
      const isTabFocused = typeof document !== 'undefined' && !document.hidden && document.hasFocus();
      const isActive = isOnChatPage && isTabFocused && data.conversationId === activeConversationId;

      if (isActive) {
        // Đang mở chính hội thoại này → báo backend đánh dấu đã đọc luôn
        // để unreadUser/unreadSeller không lên 1 rồi nhảy về 0
        socket.emit('mark_read', { conversationId: data.conversationId });
        // KHÔNG invalidate conversations ở đây — handleNewMessage sẽ patch
        // lastMessage trực tiếp, tránh refetch bị unread stale.
      } else {
        // KHÔNG gọi incrementUnreadChat() — useChatSocket được mount ở 2 nơi
        // (GlobalRealtimeMount + ChatPage) → handler fire 2 lần → badge cộng
        // dồn +2 mỗi tin. Chỉ invalidate, để `useConversations` refetch và
        // recompute total từ DB (ground truth).
        qc.invalidateQueries({ queryKey: ['chat', 'conversations'] });
      }

      // Hiện browser notification khi tab ẩn hoặc không focus, và tin nhắn
      // không thuộc conv đang xem. Tránh đẩy notification cho chính user đang
      // theo dõi chat. Trùng conversationId chia sẻ `tag` → notification mới
      // thay thế cái cũ thay vì xếp chồng.
      if (!isActive && isTabHidden()) {
        const preview = data.preview || 'Bạn có tin nhắn mới';
        showBrowserNotification('Tin nhắn mới', {
          body: preview,
          tag: `chat-${data.conversationId}`,
          onClick: () => {
            window.location.href = `/chat?conversationId=${data.conversationId}`;
          },
        });
      }
    };

    socket.on('new_notification', handleNewNotification);
    return () => {
      socket.off('new_notification', handleNewNotification);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversationId]);

  // ── GLOBAL: order_status_updated — invalidate order detail cache cho INVOICE card ──
  useEffect(() => {
    const socket = socketRef.current;
    const handleOrderStatusUpdated = (data: { orderId: string; status: string; userId?: string }) => {
      if (!data?.orderId) return;
      qc.invalidateQueries({ queryKey: ['orders', data.orderId] });
      // Cũng invalidate list để OrderListPage tự refresh nếu user đang xem
      qc.invalidateQueries({ queryKey: ['orders'] });
    };
    socket.on('order_status_updated', handleOrderStatusUpdated);
    return () => {
      socket.off('order_status_updated', handleOrderStatusUpdated);
    };
  }, [qc]);

  // ── GLOBAL: call signaling ────────────────────────────────────────────────
  useEffect(() => {
    const socket = socketRef.current;

    const handleIncomingCall = (data: Parameters<NonNullable<CallHandlers['onIncomingCall']>>[0]) => {
      handlersRef.current?.onIncomingCall?.(data);
    };
    const handleCallAnswered = (data: Parameters<NonNullable<CallHandlers['onCallAnswered']>>[0]) => {
      handlersRef.current?.onCallAnswered?.(data);
    };
    const handleCallRejected = (data: Parameters<NonNullable<CallHandlers['onCallRejected']>>[0]) => {
      handlersRef.current?.onCallRejected?.(data);
    };
    const handleCallEnded = (data: Parameters<NonNullable<CallHandlers['onCallEnded']>>[0]) => {
      handlersRef.current?.onCallEnded?.(data);
    };
    const handleSignal = (data: Parameters<NonNullable<CallHandlers['onSignal']>>[0]) => {
      handlersRef.current?.onSignal?.(data);
    };

    socket.on('incoming_call', handleIncomingCall);
    socket.on('call_answered', handleCallAnswered);
    socket.on('call_rejected', handleCallRejected);
    socket.on('call_ended', handleCallEnded);
    socket.on('webrtc_signal', handleSignal);

    return () => {
      socket.off('incoming_call', handleIncomingCall);
      socket.off('call_answered', handleCallAnswered);
      socket.off('call_rejected', handleCallRejected);
      socket.off('call_ended', handleCallEnded);
      socket.off('webrtc_signal', handleSignal);
    };
  }, []);

  // ── CONVERSATION-SPECIFIC: join room + typing + recall + reactions ─────────
  useEffect(() => {
    const socket = socketRef.current;
    if (!conversationId) return;

    if (joinedRoomRef.current !== conversationId) {
      socket.emit('join_conversation', { conversationId });
      // Tell the backend we've read this conversation
      socket.emit('mark_read', { conversationId });
      joinedRoomRef.current = conversationId;
    }

    const handleMessageRecalled = (data: { conversationId: string; messageId: string }) => {
      recallMessage(data.conversationId, data.messageId);
    };

    const handleReactionUpdated = (data: { conversationId: string; messageId: string; reactions: Record<string, string[]> }) => {
      updateReactions(data.conversationId, data.messageId, data.reactions);
    };

    const handleTyping = ({ senderId, senderRole }: { senderId: string; senderRole: string }) => {
      setTyping(senderId, true);
      setTimeout(() => setTyping(senderId, false), 3000);
      void senderRole;
    };

    const handleMessageRead = (data: { conversationId: string; userId: string }) => {
      // Track who read this conversation for showing "Đã xem"
      setRead(data.conversationId, data.userId);
      qc.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    };

    socket.on('user_typing', handleTyping);
    socket.on('message_read', handleMessageRead);
    socket.on('message_recalled', handleMessageRecalled);
    socket.on('reaction_updated', handleReactionUpdated);

    return () => {
      socket.off('user_typing', handleTyping);
      socket.off('message_read', handleMessageRead);
      socket.off('message_recalled', handleMessageRecalled);
      socket.off('reaction_updated', handleReactionUpdated);
    };
  }, [conversationId, recallMessage, updateReactions, setTyping, qc]);

  const emitTyping = () => {
    if (!conversationId) return;
    socketRef.current.emit('typing', { conversationId });
  };

  return { emitTyping };
}
