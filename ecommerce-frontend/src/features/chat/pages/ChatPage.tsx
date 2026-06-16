import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MessageCircle, Loader2, Search, Info, ArrowLeft, X, ChevronUp, ChevronDown, Video, Phone, UserPlus, Trash2, Users, Sparkles, HelpCircle, MessageSquarePlus, Users2, ArrowDown } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useChatStore } from '@/stores/chatStore';
import { useGroupCallStore } from '@/stores/groupCallStore';
import { useGroupStore } from '@/stores/groupStore';
import { getSocket } from '@/lib/socket';
import { useConversations, useMessages, useCreateConversation, useSendMessage, useMarkAsRead, useDeleteConversation } from '../hooks/useChat';
import { useChatSocket } from '../hooks/useChatSocket';
import { usePresenceSocket } from '../hooks/usePresenceSocket';
import { useVideoCall } from '../hooks/useVideoCall';
import { useGroupCall } from '../hooks/useGroupCall';
import { chatService } from '../services/chatService';
import { faqService } from '../services/faqService';
import { useShopFaqs } from '../hooks/useFaq';
import { userService } from '@/features/user/services/userService';
import { useProfile } from '@/features/user/hooks/useUser';
import FaqMenuPanel from '../components/FaqMenuPanel';
import SellerFaqSettingsPanel from '../components/SellerFaqSettingsPanel';
import AiChatPanel from '@/features/ai/components/AiChatPanel';
import ConversationItem from '../components/ConversationItem';
import GroupConversationItem from '../components/GroupConversationItem';
import GroupChatWindow from '../components/GroupChatWindow';
import MessageBubble from '../components/MessageBubble';
import ChatInput from '../components/ChatInput';
import ForwardModal from '../components/ForwardModal';
import ReportConversationModal from '../components/ReportConversationModal';
import InvoiceModal from '../components/InvoiceModal';
import SendVoucherModal from '../components/SendVoucherModal';
import UserProfilePanel from '../components/UserProfilePanel';
import VideoCallModal from '../components/VideoCallModal';
import FindFriendModal from '../components/FindFriendModal';
import CreateGroupModal from '../components/CreateGroupModal';
import GroupVideoCallModal from '../components/GroupVideoCallModal';
import GroupIncomingCallNotification from '../components/GroupIncomingCallNotification';
import { useAcceptFriendRequest, useGetFriends } from '../hooks/useFriend';
import { useMyGroups } from '../hooks/useGroup';
import type { Conversation, Message, ShopFaq } from '../types';
import type { Group } from '../types/group';

const autoCreatedConversationKeys = new Set<string>();
const pendingAutoCreatedConversationKeys = new Set<string>();

interface ParticipantProfile {
  id: string;
  fullName?: string;
  avatarUrl?: string;
}

function formatDateSeparator(ts: string): string {
  const date = new Date(ts);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffDays === 0) return 'Hôm nay';
  if (diffDays === 1) return 'Hôm qua';
  return date.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

function groupMessagesByDate(messages: Message[]) {
  const groups: { date: string; messages: Message[] }[] = [];
  let currentDate = '';
  for (const msg of messages) {
    const d = new Date(msg.createdAt).toDateString();
    if (d !== currentDate) {
      currentDate = d;
      groups.push({ date: msg.createdAt, messages: [msg] });
    } else {
      groups[groups.length - 1].messages.push(msg);
    }
  }
  return groups;
}

export default function ChatPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated } = useAuthStore();
  
  useProfile();

  const isBanned = useMemo(() => {
    return !!(user?.banned || user?.accountStatus === 'BANNED' || user?.status === 'BANNED');
  }, [user]);

  const isMuted = useMemo(() => {
    if (user?.muted) return true;
    const until = user?.mutedUntil || user?.muteUntil;
    if (until) {
      return new Date(until) > new Date();
    }
    return false;
  }, [user]);

  const formattedMuteUntil = useMemo(() => {
    const until = user?.mutedUntil || user?.muteUntil;
    if (until) {
      try {
        return new Date(until).toLocaleString('vi-VN');
      } catch {
        return 'một thời gian';
      }
    }
    return 'một thời gian';
  }, [user]);
  const {
    activeConversationId, setActiveConversation,
    messages, typingUsers, readState, presenceByUserId,
    recallMessage: storeRecall,
    deleteMessage: storeDelete,
    updateReactions: storeUpdateReactions,
  } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isSendingMessageRef = useRef(false);
  const prevMsgsLoadingRef = useRef(false);

  // Derive store message count early so the scroll useEffect can depend on it (avoids mid-component hook)
  const storeMessageCount = messages[activeConversationId ?? '']?.length ?? 0;

  // ── Scroll-position tracking (ported from GroupChatWindow) ──
  // True once the user has scrolled noticeably away from the bottom. Stays
  // true until they manually scroll back to the bottom (or click the jump button).
  const userScrolledUpRef = useRef(false);
  const lastScrollTopRef = useRef(0);
  const lastDistanceFromBottomRef = useRef(0);
  const scrollDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevLastMessageIdRef = useRef<string | null>(null);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const [unreadWhileScrolledUp, setUnreadWhileScrolledUp] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');       // sidebar conversation search
  const [sidebarFilter, setSidebarFilter] = useState<'all' | 'unread' | 'groups' | 'friends'>('all');
  const [profileCache, setProfileCache] = useState<Record<string, ParticipantProfile>>({});

  // Modal states
  const [forwardMsg, setForwardMsg] = useState<Message | null>(null);
  const [reportTargetMessage, setReportTargetMessage] = useState<Message | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [showFindFriendModal, setShowFindFriendModal] = useState(false);
  const [viewProfileUserId, setViewProfileUserId] = useState<string | null>(null);
  const [showChatPolicyModal, setShowChatPolicyModal] = useState(false);

  // FAQ states
  const [showFaqSettings, setShowFaqSettings] = useState(false); // seller: settings panel
  const [showFaqToggle, setShowFaqToggle] = useState(false);      // user: toggle pill menu

  const acceptFriendRequest = useAcceptFriendRequest();
  const { data: friends = [] } = useGetFriends();

  // ── Group state ──
  const { activeGroupId, setActiveGroup } = useGroupStore();
  const groupCallState = useGroupCallStore();
  const { data: groups = [] } = useMyGroups();
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);

  const handleSelectGroup = useCallback((groupId: string) => {
    setActiveGroup(groupId);
    setActiveConversation(null);
    setAiActive(false);
  }, [setActiveGroup, setActiveConversation]);

  // Message search within active conversation
  const [showMsgSearch, setShowMsgSearch] = useState(false);
  const [msgSearchQuery, setMsgSearchQuery] = useState('');
  const [msgSearchIndex, setMsgSearchIndex] = useState(0);
  const msgSearchInputRef = useRef<HTMLInputElement>(null);
  const msgRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const { data: conversations, isLoading: convsLoading } = useConversations();
  const { data: fetchedMessages, isLoading: msgsLoading } = useMessages(activeConversationId);
  const createConversation = useCreateConversation();
  const sendMessage = useSendMessage();
  const markAsRead = useMarkAsRead();
  const deleteConversation = useDeleteConversation();

  // ── Video call ──
  const {
    call,
    localStream,
    remoteStream,
    initiateCall,
    answerCall,
    handleCallAnswered,
    handleSignal,
    hangUp,
    rejectCall,
    cleanupCall,
    toggleMute,
    toggleCamera,
  } = useVideoCall();

  const {
    localStream: groupLocalStream,
    participants: groupParticipants,
    initiateGroupCall,
    joinGroupCall,
    cleanupGroupCall,
    queryActiveCall,
    toggleMute: toggleGroupMute,
    toggleCamera: toggleGroupCamera,
  } = useGroupCall();

  // Query active call whenever we switch to a group (handles late joiners)
  useEffect(() => {
    if (activeGroupId) queryActiveCall(activeGroupId);
  }, [activeGroupId, queryActiveCall]);

  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);

  const { emitTyping } = useChatSocket(activeConversationId, {
    onIncomingCall: (data) => {
      pendingOfferRef.current = data.offer;
      useChatStore.getState().receiveCall(
        data.conversationId,
        data.callId,
        data.callType,
        data.callerId,
        data.callerName,
      );
    },
    onCallAnswered: (data) => {
      handleCallAnswered(data.answer);
    },
    onCallRejected: () => {
      cleanupCall();
    },
    onCallEnded: () => {
      cleanupCall();
    },
    onSignal: (data) => {
      handleSignal(data.signal as { type: string; candidate?: RTCIceCandidateInit });
    },
  });

  useEffect(() => {
    if (!isAuthenticated) navigate('/login');
  }, [isAuthenticated, navigate]);

  const isSeller = user?.role?.toUpperCase() === 'SELLER';

  const presenceUserIds = useMemo(() => {
    return (conversations ?? [])
      .map((conv: Conversation) => {
        if (conv.conversationType === 'DIRECT') return conv.sellerId;
        return isSeller ? conv.userId : conv.sellerId;
      })
      .filter((id): id is string => !!id);
  }, [conversations, isSeller]);

  usePresenceSocket(presenceUserIds);

  // Fetch participant profiles for conversations AND friends (friends list may
  // include people whose conversation was soft-deleted and thus absent from
  // `conversations`)
  useEffect(() => {
    if (!user) return;
    const convIds = (conversations ?? []).map((conv: Conversation) => {
      if (conv.conversationType === 'DIRECT') return conv.sellerId;
      return isSeller ? conv.userId : conv.sellerId;
    });
    const friendIds = friends.map((f) => f.userId === user.id ? f.sellerId : f.userId);
    const idsToFetch = [...convIds, ...friendIds]
      .filter((id): id is string => !!id && !profileCache[id]);
    const uniqueIds = [...new Set(idsToFetch)];
    if (uniqueIds.length === 0) return;
    uniqueIds.forEach((id) => {
      userService.getProfileById(id).then((profile) => {
        setProfileCache((prev) => ({ ...prev, [id]: { id, fullName: profile.fullName, avatarUrl: profile.avatarUrl } }));
      }).catch(() => {});
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations, friends, user]);

  // Auto-create conversation from product detail
  useEffect(() => {
    const sellerId = searchParams.get('sellerId');
    const rawProductId = searchParams.get('productId');
    const productId = rawProductId && rawProductId !== 'undefined' ? rawProductId : undefined;
    if (!sellerId || sellerId === 'undefined') return;

    // Dedupe key by sellerId only — one PRODUCT thread per seller regardless of which product opened it.
    const key = sellerId;
    if (autoCreatedConversationKeys.has(key) || pendingAutoCreatedConversationKeys.has(key) || createConversation.isPending) return;

    // Match any existing PRODUCT conversation with this seller (ignore productId).
    const existing = conversations?.find((c) => c.conversationType !== 'DIRECT' && c.sellerId === sellerId);
    if (existing) {
      autoCreatedConversationKeys.add(key);
      setActiveConversation(existing.id);
      return;
    }

    pendingAutoCreatedConversationKeys.add(key);
    createConversation.mutate({ sellerId, productId }, {
      onSuccess: (conv) => {
        autoCreatedConversationKeys.add(key);
        pendingAutoCreatedConversationKeys.delete(key);
        setActiveConversation(conv.id);
      },
      onError: () => pendingAutoCreatedConversationKeys.delete(key),
    });
  }, [searchParams, conversations, createConversation, setActiveConversation]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    // Debounce: coalesce rapid-fire calls into one animation
    if (scrollDebounceRef.current) clearTimeout(scrollDebounceRef.current);
    scrollDebounceRef.current = setTimeout(() => {
      scrollDebounceRef.current = null;
      // Re-check: if user started scrolling up during the debounce wait, respect their intent
      if (userScrolledUpRef.current) return;
      requestAnimationFrame(() => {
        const container = messagesContainerRef.current;
        if (!container) return;
        if (behavior === 'smooth') {
          container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
        } else {
          container.scrollTop = container.scrollHeight;
        }
      });
    }, behavior === 'smooth' ? 60 : 0);
    setShowJumpToLatest(false);
    setUnreadWhileScrolledUp(0);
    userScrolledUpRef.current = false;
  }, []);

  // Track scroll position to know if user is reading old messages
  const handleMessagesScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const distance = target.scrollHeight - (target.scrollTop + target.clientHeight);
    const scrollingDown = target.scrollTop > lastScrollTopRef.current;
    lastScrollTopRef.current = target.scrollTop;
    lastDistanceFromBottomRef.current = distance;

    // ANY upward motion (> 5px from bottom) → user is reading old msgs
    if (!scrollingDown && distance > 5) {
      userScrolledUpRef.current = true;
    } else if (scrollingDown && distance < 10) {
      // Reaching bottom while scrolling down → reset
      userScrolledUpRef.current = false;
      setShowJumpToLatest(false);
      setUnreadWhileScrolledUp(0);
    }
  }, []);

  // Scroll tức thì khi đổi conversation
  useEffect(() => {
    if (!activeConversationId) return;
    userScrolledUpRef.current = false;
    lastDistanceFromBottomRef.current = 0;
    prevLastMessageIdRef.current = null;
    setShowJumpToLatest(false);
    setUnreadWhileScrolledUp(0);
    scrollToBottom('auto');
  }, [activeConversationId, scrollToBottom]);

  // Scroll khi messages vừa load xong (msgsLoading: true → false)
  useEffect(() => {
    if (prevMsgsLoadingRef.current && !msgsLoading) {
      userScrolledUpRef.current = false;
      scrollToBottom('auto');
    }
    prevMsgsLoadingRef.current = msgsLoading;
  }, [msgsLoading, scrollToBottom]);

  // Khi có tin nhắn mới: chỉ auto-scroll nếu user đang ở gần đáy, ngược lại hiện nút V
  useEffect(() => {
    if (!storeMessageCount || !activeConversationId) return;
    const storemsgs = messages[activeConversationId] ?? [];
    const lastMsg = storemsgs[storemsgs.length - 1];
    const lastMsgId = lastMsg?.id ?? null;

    // Skip nếu không phải tin nhắn mới thực sự
    if (lastMsgId === prevLastMessageIdRef.current) return;
    const isFirstLoad = prevLastMessageIdRef.current === null;
    prevLastMessageIdRef.current = lastMsgId;
    if (isFirstLoad) return; // Đã xử lý bởi conversation switch effect

    const isOwnMessage = lastMsg?.senderId === user?.id;
    const wasAtBottom = !userScrolledUpRef.current && lastDistanceFromBottomRef.current < 10;

    if (isOwnMessage || wasAtBottom) {
      scrollToBottom('smooth');
    } else {
      // User đang xem tin cũ → hiện nút V, không tự scroll
      setShowJumpToLatest(true);
      setUnreadWhileScrolledUp((c) => c + 1);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeMessageCount, activeConversationId]);

  // Mark as read on conversation open
  useEffect(() => {
    if (activeConversationId) markAsRead.mutate(activeConversationId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversationId]);

  // Reset active conversation khi rời trang /chat. Trước đây activeConversationId
  // còn lưu trong store sau khi user navigate đi, khiến handleNewNotification
  // bên ngoài /chat hiểu nhầm "đang xem conv đó" → tự đánh dấu là đã đọc, user
  // không thấy badge và không nhận browser notification cho conv đó.
  useEffect(() => {
    return () => {
      setActiveConversation(null);
      setActiveGroup(null);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mark as read instantly when a new message arrives from someone else while viewing the conversation
  const lastSocketMessageRef = useRef<string | null>(null);
  useEffect(() => {
    if (!activeConversationId || !user) return;
    const storemsgs = messages[activeConversationId] ?? [];
    if (storemsgs.length === 0) return;
    const lastMsg = storemsgs[storemsgs.length - 1];
    if (lastMsg.senderId !== user.id && lastMsg.id !== lastSocketMessageRef.current) {
      lastSocketMessageRef.current = lastMsg.id;
      markAsRead.mutate(activeConversationId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, activeConversationId, user?.id]);

  const [aiActive, setAiActive] = useState(false);

  const handleSelectConversation = useCallback((id: string) => {
    setActiveConversation(id);
    setActiveGroup(null);
    setAiActive(false);
  }, [setActiveConversation, setActiveGroup]);

  const handleSelectAi = useCallback(() => {
    setAiActive(true);
    setActiveConversation(null);
    setActiveGroup(null);
  }, [setActiveConversation, setActiveGroup]);

  const handleSend = useCallback((content: string, type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'PDF' | 'AUDIO' | 'INVOICE' | 'VOUCHER' | 'GIF' = 'TEXT') => {
    if (!activeConversationId || sendMessage.isPending || isSendingMessageRef.current) return;
    isSendingMessageRef.current = true;
    sendMessage.mutate(
      { conversationId: activeConversationId, payload: { type, content } },
      { onSettled: () => { isSendingMessageRef.current = false; } }
    );
  }, [activeConversationId, sendMessage]);

  const handleUploadFile = useCallback(async (file: File) => {
    if (!activeConversationId) return;
    const res = await chatService.uploadFile(file, activeConversationId);
    const url = res?.url;
    if (!url) return;

    let type: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'PDF' = 'IMAGE';
    if (file.type.startsWith('video/')) type = 'VIDEO';
    else if (file.type.startsWith('audio/')) type = 'AUDIO';
    else if (file.type === 'application/pdf') type = 'PDF';

    // Bypass isSendingMessageRef guard — each file is an independent message
    await sendMessage.mutateAsync(
      { conversationId: activeConversationId, payload: { type, content: url } },
    );
  }, [activeConversationId, sendMessage]);

  const handleRecall = useCallback(async (messageId: string) => {
    if (!activeConversationId) return;
    try {
      await chatService.recallMessage(activeConversationId, messageId);
      storeRecall(activeConversationId, messageId);
    } catch {}
  }, [activeConversationId, storeRecall]);

  const handleDelete = useCallback(async (messageId: string) => {
    if (!activeConversationId) return;
    try {
      await chatService.deleteMessage(activeConversationId, messageId);
      storeDelete(activeConversationId, messageId);
    } catch {}
  }, [activeConversationId, storeDelete]);

  const handleReact = useCallback(async (messageId: string, emoji: string) => {
    if (!activeConversationId) return;
    try {
      const res = await chatService.addReaction(activeConversationId, messageId, emoji);
      if (res?.data?.reactions) {
        storeUpdateReactions(activeConversationId, messageId, res.data.reactions);
      }
    } catch {}
  }, [activeConversationId, storeUpdateReactions]);

  const handleForward = useCallback(async (targetConversationId: string, message: Message) => {
    const currentConv = conversations?.find((c) => c.id === activeConversationId);
    const otherId = currentConv
      ? (currentConv.conversationType === 'DIRECT' ? currentConv.sellerId : (isSeller ? currentConv.userId : currentConv.sellerId))
      : undefined;
    const fallbackName = (otherId ? profileCache[otherId]?.fullName : undefined) || (isSeller ? 'Người mua' : 'Người bán');

    const senderName = message.senderId === user?.id
      ? 'Bạn'
      : (profileCache[message.senderId]?.fullName || fallbackName || 'Người dùng');

    await chatService.sendMessage(targetConversationId, {
      type: message.type,
      content: message.content,
      isForwarded: true,
      forwardedFrom: senderName,
    });
  }, [user?.id, profileCache, conversations, activeConversationId, isSeller]);

  const handleReport = useCallback((message: Message) => {
    setReportTargetMessage(message);
  }, []);

  const handleSendInvoice = useCallback((content: string) => {
    handleSend(content, 'INVOICE');
  }, [handleSend]);

  const handleSendVoucher = useCallback((voucherId: string) => {
    handleSend(JSON.stringify({ voucherId }), 'VOUCHER');
  }, [handleSend]);

  const storeMessages: Message[] = activeConversationId ? (messages[activeConversationId] ?? []) : [];
  const activeMessages: Message[] = storeMessages.length > 0 ? storeMessages : (fetchedMessages ?? []);
  const messageGroups = groupMessagesByDate(activeMessages);
  const activeConversation = conversations?.find((c) => c.id === activeConversationId);

  // ── FAQ (Quick Reply) ──────────────────────────────────────────────────────
  // Only fetch FAQs when user (not seller) is in a PRODUCT conversation
  const faqSellerId = useMemo(() => {
    if (isSeller || !activeConversation) return undefined;
    if (activeConversation.conversationType === 'DIRECT') return undefined;
    return activeConversation.sellerId;
  }, [isSeller, activeConversation]);

  const { data: shopFaqs = [], isLoading: faqLoading } = useShopFaqs(faqSellerId);

  const handleFaqSelect = useCallback(async (faq: ShopFaq) => {
    if (!activeConversationId) return;
    try {
      // 1. Send user's question as a regular message and wait for it to complete
      await sendMessage.mutateAsync({
        conversationId: activeConversationId,
        payload: { type: 'TEXT', content: faq.question }
      });
      // 2. Ask backend to auto-send seller's answer after the question is saved
      await faqService.triggerFaqReply(activeConversationId, faq.id);
    } catch (e) {
      console.warn('FAQ reply failed:', e);
    }
    setShowFaqToggle(false);
  }, [activeConversationId, sendMessage]);


  // Message search: matched message IDs in order
  const searchMatches = useMemo(() => {
    const q = msgSearchQuery.trim().toLowerCase();
    if (!q) return [];
    return activeMessages
      .filter((m) => !m.recalled && m.type === 'TEXT' && m.content.toLowerCase().includes(q))
      .map((m) => m.id);
  }, [activeMessages, msgSearchQuery]);

  const currentMatchId = searchMatches[msgSearchIndex] ?? null;

  // Scroll to current match
  useEffect(() => {
    if (!currentMatchId) return;
    const el = msgRefs.current[currentMatchId];
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [currentMatchId]);

  // Reset index when query changes
  useEffect(() => { setMsgSearchIndex(0); }, [msgSearchQuery]);

  // Focus input when panel opens
  useEffect(() => {
    if (showMsgSearch) setTimeout(() => msgSearchInputRef.current?.focus(), 50);
    else setMsgSearchQuery('');
  }, [showMsgSearch]);

  // Close msg search + FAQ toggle when conversation changes
  useEffect(() => {
    setShowMsgSearch(false);
    setMsgSearchQuery('');
    setShowFaqToggle(false);
    setShowFaqSettings(false);
  }, [activeConversationId]);
  const getOtherParticipantId = (conv?: Conversation) => {
    if (!conv || !user) return undefined;
    // For DIRECT convs: userId=self, sellerId=other (always use sellerId)
    if (conv.conversationType === 'DIRECT') return conv.sellerId;
    return isSeller ? conv.userId : conv.sellerId;
  };
  const activeOtherParticipantId = getOtherParticipantId(activeConversation);
  const activeOtherProfile = activeOtherParticipantId ? profileCache[activeOtherParticipantId] : undefined;
  const activeParticipantName = activeOtherProfile?.fullName || (isSeller ? 'Người mua' : 'Người bán');
  const activeParticipantOnline = activeOtherParticipantId ? !!presenceByUserId[activeOtherParticipantId] : false;

  const someoneTyping = Object.entries(typingUsers).some(([uid, typing]) => typing && uid !== user?.id);
  const currentCallGroup = groupCallState.groupId
    ? groups.find((group) => group.groupId === groupCallState.groupId)
    : undefined;

  // Scroll to bottom when typing indicator appears — only if user is already at bottom
  useEffect(() => {
    if (someoneTyping && !userScrolledUpRef.current) scrollToBottom('smooth');
  }, [someoneTyping, scrollToBottom]);

  // Gộp 1-1 conversations và groups, sort theo tin nhắn gần nhất
  const sidebarItems = [
    ...(conversations ?? []).map((conv: Conversation) => ({
      kind: 'conv' as const,
      ts: conv.lastMessageAt ? new Date(conv.lastMessageAt).getTime() : 0,
      conv,
      group: null as Group | null,
    })),
    ...groups.map((group: Group) => ({
      kind: 'group' as const,
      ts: group.lastMessageAt ? new Date(group.lastMessageAt).getTime() : new Date(group.updatedAt).getTime(),
      conv: null as Conversation | null,
      group,
    })),
  ].sort((a, b) => b.ts - a.ts);

  const filteredItems = sidebarItems.filter((item) => {
    if (sidebarFilter === 'friends') return false;
    // 1. Filter by tab
    if (sidebarFilter === 'unread') {
      if (item.kind === 'conv' && item.conv) {
        const unread = isSeller ? (item.conv.unreadSeller ?? 0) : (item.conv.unreadUser ?? 0);
        if (unread <= 0) return false;
      } else if (item.kind === 'group' && item.group) {
        if ((item.group.memberMeta?.unreadCount ?? 0) <= 0) return false;
      } else {
        return false;
      }
    } else if (sidebarFilter === 'groups') {
      if (item.kind !== 'group') return false;
    }

    // 2. Filter by search query
    if (!searchQuery.trim()) return true;
    if (item.kind === 'conv' && item.conv) {
      const conv = item.conv;
      const otherId = conv.conversationType === 'DIRECT' ? conv.sellerId : (isSeller ? conv.userId : conv.sellerId);
      const profile = otherId ? profileCache[otherId] : undefined;
      const name = profile?.fullName || '';
      return name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (conv.lastMessage || '').toLowerCase().includes(searchQuery.toLowerCase());
    } else if (item.group) {
      return (item.group.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    }
    return false;
  });

  return (
    <div className="flex h-full bg-gray-100">

      {/* ── Left: Sidebar ── */}
      <div className={`w-full md:w-80 shrink-0 bg-white flex flex-col border-r border-gray-200 ${activeConversationId ? 'hidden md:flex' : 'flex'}`}>
        <div className="px-5 py-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Tin nhắn</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowCreateGroupModal(true)}
              className="p-2 rounded-xl text-gray-500 hover:text-orange-500 hover:bg-orange-50 transition-colors"
              title="Tạo nhóm"
            >
              <Users className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowFindFriendModal(true)}
              className="p-2 rounded-xl text-gray-500 hover:text-orange-500 hover:bg-orange-50 transition-colors"
              title="Tìm bạn bè"
            >
              <UserPlus className="w-5 h-5" />
            </button>
            {/* FAQ settings — seller only */}
            {isSeller && (
              <button
                onClick={() => setShowFaqSettings((v) => !v)}
                className={`p-2 rounded-xl transition-colors ${
                  showFaqSettings
                    ? 'text-orange-500 bg-orange-50'
                    : 'text-gray-500 hover:text-orange-500 hover:bg-orange-50'
                }`}
                title="Cài đặt câu hỏi nhanh"
              >
                <MessageSquarePlus className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full px-3 py-2">
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              type="text"
              placeholder="Tìm kiếm cuộc trò chuyện..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none"
            />
          </div>
        </div>

        <div className="px-4 py-2 flex items-center gap-2 border-b border-gray-100">
          <button
            onClick={() => setSidebarFilter('all')}
            className={`flex-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              sidebarFilter === 'all' ? 'bg-orange-50 text-orange-600' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
            }`}
          >
            Tất cả
          </button>
          <button
            onClick={() => setSidebarFilter('unread')}
            className={`flex-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              sidebarFilter === 'unread' ? 'bg-orange-50 text-orange-600' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
            }`}
          >
            Chưa đọc
          </button>
          <button
            onClick={() => setSidebarFilter('groups')}
            className={`flex-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              sidebarFilter === 'groups' ? 'bg-orange-50 text-orange-600' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
            }`}
          >
            Nhóm
          </button>
          <button
            onClick={() => setSidebarFilter('friends')}
            className={`flex-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              sidebarFilter === 'friends' ? 'bg-orange-50 text-orange-600' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
            }`}
          >
            Bạn bè
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* ── Chat với AI ── (render trong main panel) */}
          <button
            onClick={handleSelectAi}
            className={`w-full flex items-center gap-3 px-4 py-3 border-b border-gray-100 transition-colors text-left ${
              aiActive ? 'bg-orange-50' : 'hover:bg-orange-50/50'
            }`}
          >
            <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shrink-0 shadow-sm shadow-orange-200">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`font-semibold text-sm ${aiActive ? 'text-orange-600' : 'text-gray-900'}`}>ZORA AI</p>
              <p className="text-xs text-gray-500 truncate">Trợ lý AI — hỏi gì cũng được</p>
            </div>
          </button>

          {sidebarFilter === 'friends' ? (
            friends.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                <Users2 className="w-12 h-12 text-gray-200 mb-3" />
                <p className="text-gray-500 font-medium text-sm">Chưa có bạn bè nào</p>
                <p className="text-xs text-gray-400 mt-1">Tìm kiếm và kết bạn để bắt đầu trò chuyện</p>
              </div>
            ) : (
              friends.map((friend) => {
                // Resolve the friend's id = the side that is NOT the current user.
                // Each direct conv record stores {userId, sellerId}; the friend is
                // whichever one differs from our own id.
                const friendId = friend.userId === user?.id ? friend.sellerId : friend.userId;
                const profile = friendId ? profileCache[friendId] : undefined;
                const isOnline = !!(friendId && presenceByUserId[friendId]);
                return (
                  <button
                    key={friend.conversationId ?? friendId}
                    onClick={() => friend.conversationId && setActiveConversation(friend.conversationId)}
                    className={`w-full flex items-center gap-3 px-4 py-3 border-b border-gray-100 hover:bg-orange-50/50 transition-colors text-left ${
                      friend.conversationId === activeConversationId ? 'bg-orange-50' : ''
                    }`}
                  >
                    <div className="relative shrink-0">
                      {profile?.avatarUrl ? (
                        <img src={profile.avatarUrl} alt={profile.fullName} className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                          <span className="text-orange-600 font-semibold text-lg">
                            {profile?.fullName?.charAt(0)?.toUpperCase() ?? '?'}
                          </span>
                        </div>
                      )}
                      {isOnline && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white rounded-full" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate">
                        {profile?.fullName ?? 'Người dùng'}
                      </p>
                      <p className="text-xs text-gray-400">{isOnline ? 'Đang hoạt động' : 'Ngoại tuyến'}</p>
                    </div>
                  </button>
                );
              })
            )
          ) : convsLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-orange-400 animate-spin" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <MessageCircle className="w-12 h-12 text-gray-200 mb-3" />
              <p className="text-gray-500 font-medium text-sm">
                {sidebarFilter === 'unread' ? 'Không có tin nhắn chưa đọc' :
                 sidebarFilter === 'groups' ? 'Bạn chưa tham gia nhóm nào' :
                 'Chưa có tin nhắn nào'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {sidebarFilter === 'unread' ? 'Tất cả tin nhắn đã được đọc' :
                 sidebarFilter === 'groups' ? 'Tạo nhóm mới để bắt đầu trò chuyện' :
                 'Chat với người bán từ trang sản phẩm'}
              </p>
            </div>
          ) : (
            filteredItems.map((item) => {
              if (item.kind === 'conv' && item.conv) {
                const conv = item.conv;
                const otherId = conv.conversationType === 'DIRECT' ? conv.sellerId : (isSeller ? conv.userId : conv.sellerId);
                const otherProfile = otherId ? profileCache[otherId] : undefined;
                return (
                  <ConversationItem
                    key={conv.id}
                    conversation={conv}
                    isActive={conv.id === activeConversationId}
                    currentUserId={user?.id ?? ''}
                    onClick={() => handleSelectConversation(conv.id)}
                    otherParticipantName={otherProfile?.fullName}
                    otherParticipantAvatar={otherProfile?.avatarUrl}
                    isOnline={!!(otherId && presenceByUserId[otherId])}
                  />
                );
              }
              if (item.group) {
                return (
                  <GroupConversationItem
                    key={item.group.groupId}
                    group={item.group}
                    isActive={item.group.groupId === activeGroupId}
                    onClick={() => handleSelectGroup(item.group!.groupId)}
                  />
                );
              }
              return null;
            })
          )}
        </div>
      </div>

      {/* ── Right: Chat window ── */}
      <div className={`flex-1 flex flex-col min-w-0 relative ${!activeConversationId && !activeGroupId && !aiActive ? 'hidden md:flex' : 'flex'}`}>
        {/* AI chat panel */}
        {aiActive && <AiChatPanel />}

        {/* Group chat window */}
        {!aiActive && activeGroupId && !activeConversationId && (() => {
          const activeGroup = groups.find((g) => g.groupId === activeGroupId);
          if (!activeGroup) return null;
          return (
            <GroupChatWindow
              group={activeGroup}
              onStartDM={(userId) => {
                setActiveGroup(null);
                // Find or open DM with this user
                const dm = conversations?.find((c) => c.conversationType === 'DIRECT' && (c.sellerId === userId || c.userId === userId));
                if (dm) setActiveConversation(dm.id);
              }}
              callDisabled={groupCallState.status === 'in_call' && groupCallState.groupId === activeGroup.groupId}
              activeCall={groupCallState.activeCallsByGroup[activeGroup.groupId] ?? null}
              onAudioCall={() => initiateGroupCall(activeGroup.groupId, activeGroup.name, 'audio')}
              onVideoCall={() => initiateGroupCall(activeGroup.groupId, activeGroup.name, 'video')}
              onJoinCall={() => {
                const call = groupCallState.activeCallsByGroup[activeGroup.groupId];
                if (call) joinGroupCall(activeGroup.groupId, activeGroup.name, call.callId, call.callType);
              }}
            />
          );
        })()}

        {/* 1-1 chat window */}
        {!aiActive && activeConversationId ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center gap-3 px-5 py-4 bg-white border-b border-gray-200 shadow-sm">
              <button
                onClick={() => setActiveConversation(null)}
                className="md:hidden p-1.5 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <button
                onClick={() => activeOtherParticipantId && setViewProfileUserId(activeOtherParticipantId)}
                className="relative shrink-0 group"
              >
                <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600 group-hover:ring-2 group-hover:ring-orange-300 transition-all">
                  {activeOtherProfile?.avatarUrl ? (
                    <img src={activeOtherProfile.avatarUrl} alt={activeParticipantName} className="w-full h-full object-cover" />
                  ) : (
                    activeParticipantName.charAt(0).toUpperCase()
                  )}
                </div>
                {activeParticipantOnline && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-white rounded-full" />
                )}
              </button>

              <div className="flex-1 min-w-0">
                <button
                  onClick={() => activeOtherParticipantId && setViewProfileUserId(activeOtherParticipantId)}
                  className="text-sm font-bold text-gray-900 truncate hover:text-orange-500 transition-colors flex items-center gap-1.5"
                >
                  {activeConversation?.conversationType !== 'DIRECT'
                    && !!activeConversation?.sellerId
                    && activeConversation.sellerId !== user?.id && (
                    <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-orange-100 text-orange-600">
                      Shop
                    </span>
                  )}
                  <span className="truncate">{activeParticipantName}</span>
                </button>
                <p className="text-xs text-gray-500">
                  {someoneTyping ? (
                    <span className="text-orange-500 animate-pulse">đang nhập...</span>
                  ) : (
                    <span>{activeParticipantOnline ? 'Đang hoạt động' : 'Ngoại tuyến'}</span>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {/* Audio call */}
                <button
                  onClick={() => activeConversationId && initiateCall(activeConversationId, 'audio')}
                  disabled={call.callStatus !== 'idle'}
                  className="p-2 rounded-full text-gray-500 hover:bg-gray-100 disabled:opacity-40 transition-colors"
                  title="Gọi thoại"
                >
                  <Phone className="w-4 h-4" />
                </button>
                {/* Video call */}
                <button
                  onClick={() => activeConversationId && initiateCall(activeConversationId, 'video')}
                  disabled={call.callStatus !== 'idle'}
                  className="p-2 rounded-full text-gray-500 hover:bg-gray-100 disabled:opacity-40 transition-colors"
                  title="Gọi video"
                >
                  <Video className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowMsgSearch((v) => !v)}
                  className={`p-2 rounded-full transition-colors ${showMsgSearch ? 'text-orange-500 bg-orange-50' : 'text-gray-500 hover:bg-gray-100'}`}
                  title="Tìm kiếm trong cuộc hội thoại"
                >
                  <Search className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowChatPolicyModal(true)}
                  className="p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
                  title="Chính sách chat"
                >
                  <Info className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    if (activeConversationId && window.confirm('Xoá cuộc trò chuyện này?')) {
                      deleteConversation.mutate(activeConversationId, {
                        onSuccess: () => setActiveConversation(null),
                      });
                    }
                  }}
                  className="p-2 rounded-full text-gray-500 hover:text-red-500 hover:bg-red-50 transition-colors"
                  title="Xoá cuộc trò chuyện"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Message Search Panel */}
            {showMsgSearch && (
              <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-gray-100 shadow-sm">
                <Search className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  ref={msgSearchInputRef}
                  type="text"
                  placeholder="Tìm kiếm trong cuộc trò chuyện..."
                  value={msgSearchQuery}
                  onChange={(e) => setMsgSearchQuery(e.target.value)}
                  className="flex-1 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none"
                />
                {/* Match count & navigation */}
                {msgSearchQuery.trim() && (
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {searchMatches.length === 0
                        ? 'Không tìm thấy'
                        : `${msgSearchIndex + 1} / ${searchMatches.length}`}
                    </span>
                    <button
                      onClick={() => setMsgSearchIndex((i) => Math.max(0, i - 1))}
                      disabled={searchMatches.length === 0 || msgSearchIndex === 0}
                      className="p-1 rounded text-gray-400 hover:text-gray-600 disabled:opacity-30 transition-colors"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setMsgSearchIndex((i) => Math.min(searchMatches.length - 1, i + 1))}
                      disabled={searchMatches.length === 0 || msgSearchIndex === searchMatches.length - 1}
                      className="p-1 rounded text-gray-400 hover:text-gray-600 disabled:opacity-30 transition-colors"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <button
                  onClick={() => setShowMsgSearch(false)}
                  className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Messages */}
            <div ref={messagesContainerRef} onScroll={handleMessagesScroll} className="flex-1 overflow-y-auto px-6 py-4 bg-gray-50 relative">
              {msgsLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 text-orange-400 animate-spin" />
                </div>
              ) : activeMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  {/* User side: show FAQ menu if seller has configured FAQs */}
                  {!isSeller && shopFaqs.length > 0 ? (
                    <FaqMenuPanel
                      faqs={shopFaqs}
                      onSelect={handleFaqSelect}
                      shopName={activeParticipantName}
                      isLoading={faqLoading}
                    />
                  ) : (
                    <>
                      <MessageCircle className="w-10 h-10 text-gray-300 mb-2" />
                      <p className="text-sm text-gray-400">Hãy bắt đầu cuộc trò chuyện!</p>
                    </>
                  )}
                </div>
              ) : (
                messageGroups.map((group, gi) => (
                  <div key={gi}>
                    <div className="flex items-center gap-3 my-4">
                      <div className="flex-1 h-px bg-gray-200" />
                      <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">
                        {formatDateSeparator(group.date)}
                      </span>
                      <div className="flex-1 h-px bg-gray-200" />
                    </div>
                    {group.messages.map((msg) => (
                      <div
                        key={msg.id}
                        ref={(el) => { msgRefs.current[msg.id] = el; }}
                        className={currentMatchId === msg.id ? 'ring-2 ring-orange-300 ring-offset-1 rounded-2xl' : ''}
                      >
                       <MessageBubble
                          message={msg}
                          isMine={msg.senderId === user?.id}
                          searchQuery={showMsgSearch ? msgSearchQuery : ''}
                          friendshipStatus={activeConversation?.friendshipStatus}
                          onRecall={handleRecall}
                          onDelete={handleDelete}
                          onForward={setForwardMsg}
                          onReact={handleReact}
                          onAcceptFriendRequest={(convId) => acceptFriendRequest.mutate(convId)}
                          onReport={handleReport}
                        />
                      </div>
                    ))}
                  </div>
                ))
              )}
              {/* Typing indicator bubble */}
              {someoneTyping && (
                <div className="flex items-end gap-2 mb-2">
                  <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">
                    {activeParticipantName.charAt(0).toUpperCase()}
                  </div>
                  <div className="px-4 py-3 bg-white border border-gray-100 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  </div>
                </div>
              )}
              {/* "Đã xem" receipt — below last my message when other party has read */}
              {(() => {
                if (!activeConversationId) return null;
                const convMsgs = messages[activeConversationId] ?? [];
                const lastMine = [...convMsgs].reverse().find((m) => m.senderId === user?.id && !m.recalled);
                if (!lastMine) return null;
                const readers = readState[activeConversationId];
                const otherHasRead = readers && [...readers].some((uid) => uid !== user?.id);
                if (!otherHasRead) return null;
                const activeConv = conversations?.find((c) => c.id === activeConversationId);
                const otherId = activeConv
                  ? (activeConv.conversationType === 'DIRECT' || user?.role !== 'SELLER' ? activeConv.sellerId : activeConv.userId)
                  : null;
                const otherProfile = otherId ? profileCache[otherId] : null;
                return (
                  <div className="flex justify-end items-center gap-1 pr-3 -mt-1 mb-1">
                    {otherProfile?.avatarUrl ? (
                      <img src={otherProfile.avatarUrl} alt="" className="w-3.5 h-3.5 rounded-full object-cover" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full bg-gray-300 flex items-center justify-center text-[8px] font-bold text-white">
                        {(otherProfile?.fullName || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="text-[10px] text-gray-400">Đã xem</span>
                  </div>
                );
              })()}
              <div ref={messagesEndRef} />
            </div>

            {/* Jump to latest button (nút V) — hiện khi user đang xem tin cũ */}
            {showJumpToLatest && (
              <div className="absolute bottom-24 right-6 z-10">
                <button
                  type="button"
                  onClick={() => scrollToBottom('smooth')}
                  className="relative flex h-12 w-12 items-center justify-center rounded-full bg-white text-gray-700 shadow-lg ring-1 ring-gray-200 transition hover:bg-gray-50 hover:text-orange-500"
                  aria-label="Xuống tin nhắn mới nhất"
                >
                  <ArrowDown className="h-6 w-6" />
                  {unreadWhileScrolledUp > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full bg-orange-500 text-white text-[11px] font-bold flex items-center justify-center shadow">
                      {unreadWhileScrolledUp > 99 ? '99+' : unreadWhileScrolledUp}
                    </span>
                  )}
                </button>
              </div>
            )}

            {/* FAQ Toggle bar — user side, only when chat has messages */}
            {!isSeller && shopFaqs.length > 0 && activeMessages.length > 0 && (
              <div className="border-t border-gray-100 bg-white">
                <button
                  onClick={() => setShowFaqToggle((v) => !v)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold text-orange-600 hover:bg-orange-50 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Câu hỏi nhanh</span>
                    <span className="bg-orange-100 text-orange-500 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {shopFaqs.length}
                    </span>
                  </div>
                  {showFaqToggle
                    ? <ChevronDown className="w-3.5 h-3.5" />
                    : <ChevronUp className="w-3.5 h-3.5" />}
                </button>
                {showFaqToggle && (
                  <FaqMenuPanel
                    faqs={shopFaqs}
                    onSelect={handleFaqSelect}
                    compact
                  />
                )}
              </div>
            )}

            {/* Input */}
            {isBanned ? (
              <div className="border-t border-gray-200 bg-red-50 px-4 py-6 text-center text-red-600 font-semibold text-sm">
                Tài khoản của bạn đã bị khóa vĩnh viễn.
              </div>
            ) : isMuted ? (
              <div className="border-t border-gray-200 bg-orange-50 px-4 py-6 text-center text-orange-600 font-semibold text-sm">
                Bạn đang bị hạn chế chat đến {formattedMuteUntil}
              </div>
            ) : (
              <ChatInput
                onSend={handleSend}
                onUploadFile={handleUploadFile}
                onTyping={(isTyping) => { if (isTyping) emitTyping(); }}
                onOpenInvoice={() => setShowInvoiceModal(true)}
                onOpenVoucher={
                  isSeller && activeOtherParticipantId
                    ? () => setShowVoucherModal(true)
                    : undefined
                }
                disabled={sendMessage.isPending}
              />
            )}
          </>
        ) : (
          !activeGroupId && !aiActive && (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-8 bg-gray-50">
              <div className="w-20 h-20 rounded-2xl bg-orange-50 flex items-center justify-center mb-4">
                <MessageCircle className="w-10 h-10 text-orange-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Chọn cuộc trò chuyện</h3>
              <p className="text-sm text-gray-400 max-w-xs">
                Chọn một cuộc trò chuyện ở bên trái hoặc chat với người bán từ trang sản phẩm
              </p>
            </div>
          )
        )}

        {/* Seller FAQ Settings Panel — overlays the chat window */}
        {showFaqSettings && user && (
          <SellerFaqSettingsPanel
            sellerId={user.id}
            onClose={() => setShowFaqSettings(false)}
          />
        )}
        {/* User Profile Panel */}
        {viewProfileUserId && (
          <UserProfilePanel
            userId={viewProfileUserId}
            onClose={() => setViewProfileUserId(null)}
          />
        )}
      </div>

      {/* Forward Modal */}
      {forwardMsg && conversations && (
        <ForwardModal
          message={forwardMsg}
          conversations={conversations}
          currentConversationId={activeConversationId ?? ''}
          profileCache={profileCache}
          isSeller={isSeller}
          onForward={handleForward}
          onClose={() => setForwardMsg(null)}
        />
      )}

      {/* Report Conversation Modal */}
      {reportTargetMessage && activeConversationId && (
        <ReportConversationModal
          conversationId={activeConversationId}
          targetMessage={reportTargetMessage}
          onClose={() => setReportTargetMessage(null)}
        />
      )}

      {/* Invoice Modal */}
      {showInvoiceModal && (
        <InvoiceModal
          onSend={handleSendInvoice}
          onClose={() => setShowInvoiceModal(false)}
        />
      )}

      {/* Voucher Modal */}
      {showVoucherModal && activeOtherParticipantId && (
        <SendVoucherModal
          targetUserId={activeOtherParticipantId}
          onSend={handleSendVoucher}
          onClose={() => setShowVoucherModal(false)}
        />
      )}

      {/* Find Friend Modal */}
      {showFindFriendModal && (
        <FindFriendModal onClose={() => setShowFindFriendModal(false)} />
      )}

      {/* Create Group Modal */}
      {showCreateGroupModal && (
        <CreateGroupModal onClose={() => setShowCreateGroupModal(false)} profileCache={profileCache} />
      )}

      {/* Video / Audio Call Modal */}
      {(call.callStatus === 'calling' || call.callStatus === 'in_call') && (
        <VideoCallModal
          localStream={localStream}
          remoteStream={remoteStream}
          participantName={activeParticipantName}
          callType={call.callType}
          callStatus={call.callStatus}
          isInitiator={call.isInitiator}
          onHangUp={hangUp}
          onToggleMute={toggleMute}
          onToggleCamera={toggleCamera}
        />
      )}

      {/* Incoming call notification — rendered here for ChatPage context */}
      {call.callStatus === 'incoming' && (
        <IncomingCallFromChatPage
          callerName={call.callerName || 'Người dùng'}
          callType={call.callType}
          onAccept={() => pendingOfferRef.current && answerCall(pendingOfferRef.current)}
          onReject={rejectCall}
        />
      )}

      {groupCallState.status === 'in_call' && (
        <GroupVideoCallModal
          localStream={groupLocalStream}
          participants={groupParticipants}
          groupName={groupCallState.groupName || currentCallGroup?.name || 'Nhóm chat'}
          callType={groupCallState.callType}
          localUserName={user?.fullName || user?.email || 'Bạn'}
          onHangUp={cleanupGroupCall}
          onToggleMute={toggleGroupMute}
          onToggleCamera={toggleGroupCamera}
        />
      )}

      {groupCallState.status === 'ringing' && (
        <GroupIncomingCallNotification
          onAccept={() => {
            if (!groupCallState.groupId || !groupCallState.callId) return;
            setActiveConversation(null);
            setActiveGroup(groupCallState.groupId);
            joinGroupCall(groupCallState.groupId, groupCallState.groupName || '', groupCallState.callId, groupCallState.callType);
          }}
          onReject={() => {
            if (groupCallState.groupId && groupCallState.callId) {
              getSocket()?.emit('group_call_reject', {
                groupId: groupCallState.groupId,
                callId: groupCallState.callId,
              });
            }
            groupCallState.endGroupCall();
          }}
        />
      )}

      {/* Chat Policy Modal */}
      {showChatPolicyModal && (
        <div className="fixed inset-0 bg-black/60 z-[200] backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-orange-500" />
                <h2 className="text-lg font-bold text-gray-900">Quy định & Chính sách Chat</h2>
              </div>
              <button
                onClick={() => setShowChatPolicyModal(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors focus:outline-none"
                aria-label="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <p className="text-xs text-gray-500 leading-relaxed">
                Để đảm bảo môi trường giao dịch an toàn và minh bạch, vui lòng tuân thủ các quy định giao tiếp của chúng tôi dưới đây:
              </p>

              <div className="space-y-3.5">
                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-orange-50 flex items-center justify-center text-orange-500 font-bold text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-800">Lịch sự & Tôn trọng</h4>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                      Sử dụng từ ngữ văn minh, lịch sự. Nghiêm cấm mọi hành vi xúc phạm, quấy rối, đe dọa hoặc ngôn từ kích động thù địch.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-orange-50 flex items-center justify-center text-orange-500 font-bold text-xs shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-800">Không giao dịch ngoài sàn</h4>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                      Nghiêm cấm lôi kéo giao dịch, thanh toán bên ngoài hệ thống. Chúng tôi sẽ không thể bảo vệ quyền lợi hoặc hỗ trợ giải quyết tranh chấp đối với các đơn hàng này.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-orange-50 flex items-center justify-center text-orange-500 font-bold text-xs shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-800">Bảo mật thông tin cá nhân</h4>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                      Không chia sẻ mật khẩu, mã OTP, số thẻ tín dụng hoặc thông tin cá nhân nhạy cảm trong hội thoại chat.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-orange-50 flex items-center justify-center text-orange-500 font-bold text-xs shrink-0 mt-0.5">
                    4
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-800">Nội dung lành mạnh</h4>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                      Không gửi hình ảnh đồi trụy, spam link quảng cáo, thông tin lừa đảo, hoặc các nội dung vi phạm pháp luật.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-red-50 border border-red-100 rounded-xl p-3.5 mt-2">
                <p className="text-2xs text-red-600 font-medium leading-relaxed">
                  <strong>⚠️ Lưu ý vi phạm:</strong> Các hành vi vi phạm chính sách sẽ bị hệ thống khóa tính năng chat tạm thời đến vĩnh viễn hoặc khóa tài khoản vĩnh viễn tùy mức độ nghiêm trọng.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end shrink-0">
              <button
                onClick={() => setShowChatPolicyModal(false)}
                className="px-5 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold shadow-sm transition-all focus:outline-none"
              >
                Đã hiểu quy định
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Inline incoming call UI — only for when user is already on ChatPage
function IncomingCallFromChatPage({
  callerName,
  callType,
  onAccept,
  onReject,
}: {
  callerName: string;
  callType: 'video' | 'audio';
  onAccept: () => void;
  onReject: () => void;
}) {
  return (
    <div className="fixed bottom-6 right-6 z-[200] animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-gray-900 rounded-2xl shadow-2xl border border-gray-700 p-5 w-72">
        <div className="flex items-center gap-4 mb-5">
          <div className="relative">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-xl font-bold text-white shrink-0">
              {callerName.charAt(0).toUpperCase()}
            </div>
            <span className="absolute inset-0 rounded-full bg-orange-400/30 animate-ping" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">{callerName}</p>
            <div className="flex items-center gap-1.5 mt-1">
              {callType === 'video'
                ? <Video className="w-3.5 h-3.5 text-orange-400" />
                : <Phone className="w-3.5 h-3.5 text-orange-400" />}
              <p className="text-gray-400 text-xs">
                {callType === 'video' ? 'Cuộc gọi video đến' : 'Cuộc gọi thoại đến'}
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onReject}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors"
          >
            <Phone className="w-4 h-4 rotate-[135deg]" />
            Từ chối
          </button>
          <button
            onClick={onAccept}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-semibold transition-colors"
          >
            {callType === 'video' ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
            Nhận
          </button>
        </div>
      </div>
    </div>
  );
}
