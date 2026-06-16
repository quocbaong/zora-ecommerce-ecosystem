import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  Alert,
  Keyboard,
  Modal,
  TouchableWithoutFeedback,
  Animated,
  Dimensions,
  ScrollView
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../contexts/authContext';
import apiClient from '../../api/client';
import { getLocalMessages, saveMessages, saveMessage } from '../../services/sqlite/database';
import socketService from '../../services/socket/socketService';
import { pickAndUploadImages, uploadAudio, pickAndUploadDocument } from '../../services/upload/attachmentService';
import VoucherBubble from '../../features/chat/components/VoucherBubble';
import { useChatStore } from '../../store/chatStore';
import { Send, Image as ImageIcon, ChevronLeft, MoreVertical, CheckCheck, Smile, Phone, Video, ShoppingBag, Clock, Truck, XCircle, PhoneMissed, FileText, Mic, Play, Pause, X, Download, Paperclip, Reply, Plus, Trash2, Search, Pencil, UserPlus, UserCheck, PhoneCall } from 'lucide-react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { COLORS } from '../../constants';
import dayjs from 'dayjs';
import InvoiceModal from './InvoiceModal';
import UserProfileModal from '../../features/chat/components/UserProfileModal';
import ImageEditorModal from '../../features/user/components/ImageEditorModal';
import { Video as ExpoVideo, ResizeMode } from 'expo-av';
import MessageActionModal from '../../features/chat/components/MessageActionModal';
import ReportMessageModal from '../../features/chat/components/ReportMessageModal';
import ConversationPicker from '../../features/chat/components/ConversationPicker';
import { useGroupStore } from '../../store/groupStore';
import PinnedBanner from '../../features/chat/components/PinnedBanner';
import PinnedMessagesListModal from '../../features/chat/components/PinnedMessagesListModal';
import AsyncStorage from '@react-native-async-storage/async-storage';

import StickerPicker from '../../features/chat/components/StickerPicker';
import GifPickerPanel from '../../features/chat/components/GifPickerPanel';
import SendVoucherModal from '../../features/chat/components/SendVoucherModal';
import FaqMenuPanel from '../../features/chat/components/FaqMenuPanel';
import { Sticker, Smile as SmileIcon, Trash2 as Trash2Icon, Reply as ReplyIcon, Forward as ForwardIcon, CornerUpRight, Film, Ticket } from 'lucide-react-native';
import { useGroupCallStore } from '../../store/groupCallStore';
import AudioPlayer from '../../features/chat/components/AudioPlayer';

const EMPTY_ARRAY: any[] = [];

export default function ChatScreen({ route, navigation }: any) {
  const { conversationId, participantName } = route.params;
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const messages = useChatStore(state => state.messages[conversationId] || EMPTY_ARRAY);
  const [content, setContent] = useState('');
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewVideo, setPreviewVideo] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [editorImage, setEditorImage] = useState<string | null>(null);
  const [draftImage, setDraftImage] = useState<{ uri: string, localUri: string } | null>(null);
  const [nextKey, setNextKey] = useState<string | null>(null);
  const [showStickers, setShowStickers] = useState(false);
  const [showGifs, setShowGifs] = useState(false);
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [shopId, setShopId] = useState<string | null>(null);
  const [claimedVouchers, setClaimedVouchers] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [pinnedMessages, setPinnedMessages] = useState<any[]>([]);
  const [showPinnedListModal, setShowPinnedListModal] = useState(false);
  const [unreadCountLimit] = useState<number>(route.params?.unreadCount || 0);
  const [entryTime] = useState(dayjs().format('HH:mm'));

  // FAQ states
  const [shopFaqs, setShopFaqs] = useState<any[]>([]);
  const [faqSellerId, setFaqSellerId] = useState<string | null>(null);
  const isSendingFaq = useRef(false);

  const isTyping = useChatStore(state => {
    // Check if the participant is typing in this conversation
    // We can't easily map typing to conversationId without backend support, 
    // but we can at least filter by the participant's userId if we had it.
    // Assuming for 1-1 chat, any typing user is the participant.
    return Object.values(state.typingUsers).some(Boolean);
  });

  const sheetAnim = useRef(new Animated.Value(Dimensions.get('window').height)).current;
  const flatListRef = useRef<FlatList>(null);

  const readState = useChatStore(state => state.readState[conversationId]);
  const activeReadState = readState || [];

  const EMOJI_LIST = ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😜', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '😔', '😞', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺'];
  const REACTIONS = ['❤️', '😆', '😮', '😢', '😠', '👍'];

  const loadMessages = async (isLoadMore = false) => {
    if (isLoadMore && !nextKey) return;
    try {
      if (!isLoadMore) {
        const localMsgs = await getLocalMessages(conversationId);
        if (localMsgs.length > 0) useChatStore.getState().setMessages(conversationId, localMsgs);
      }

      const url = `/chat/conversations/${conversationId}/messages${isLoadMore && nextKey ? `?lastKey=${encodeURIComponent(nextKey)}` : ''}`;
      const response = await apiClient.get(url);

      const apiMsgs = response.data.messages.map((m: any) => ({
        ...m,
        id: m.messageId,
        createdAt: new Date(m.createdAt || Date.now()).getTime()
      }));

      if (!isLoadMore && apiMsgs.length > 0) {
        await saveMessages(apiMsgs);
      }

      const mergedMsgs = isLoadMore ? [...messages, ...apiMsgs.reverse()] : apiMsgs.reverse();
      // Deduplicate by message ID
      const seen = new Set<string>();
      const uniqueMsgs = mergedMsgs.filter((m: any) => {
        if (seen.has(m.id)) return false;
        seen.add(m.id);
        return true;
      });

      useChatStore.getState().setMessages(conversationId, uniqueMsgs);


      setNextKey(response.data.nextKey || null);

      if (!isLoadMore) {
        // Mark as read in backend
        try {
          await apiClient.put(`/chat/conversations/${conversationId}/read`);
        } catch (e) { }
      }
    } catch (error) {
      console.error('Fetch messages error:', error);
    } finally {
      if (!isLoadMore) setLoading(false);
    }
  };

  const handleAcceptFriendRequest = async (targetConvId: string) => {
    try {
      await apiClient.post('/chat/friends/accept', { conversationId: targetConvId });
      Alert.alert('Thành công', 'Các bạn đã trở thành bạn bè!');
      loadMessages();
    } catch (error: any) {
      console.error('Accept friend error:', error);
      Alert.alert('Lỗi', 'Không thể chấp nhận lời mời kết bạn.');
    }
  };

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    loadMessages();
    socketService.joinConversation(conversationId);
    useChatStore.getState().setActiveConversation(conversationId);
    // Clear stale typing state when entering conversation
    useChatStore.getState().clearTyping();

    const fetchShopId = async () => {
      try {
        const res = await apiClient.get('/chat/conversations');
        const list = res.data || [];
        const currentConv = list.find((c: any) => (c.id || c.conversationId) === conversationId);
        if (currentConv) {
          const iAmBuyer = String(currentConv.userId) === String(user?.id);
          const sId = iAmBuyer ? currentConv.sellerId : currentConv.userId;
          setShopId(sId || null);
          // If I'm the buyer, fetch FAQs for this seller
          if (iAmBuyer && currentConv.sellerId) {
            setFaqSellerId(currentConv.sellerId);
            try {
              const faqRes = await apiClient.get(`/chat/faqs/${currentConv.sellerId}`);
              const raw = faqRes.data;
              let faqs: any[] = [];
              if (Array.isArray(raw)) faqs = raw;
              else if (Array.isArray(raw?.data)) faqs = raw.data;
              else if (Array.isArray(raw?.faqs)) faqs = raw.faqs;
              setShopFaqs(faqs);
            } catch (e) { /* no FAQs configured */ }
          } else if (!iAmBuyer) {
            // I'm the seller — store my own sellerId for settings panel
            setFaqSellerId(currentConv.sellerId || user?.id || null);
          }
        }
      } catch (e) {
        console.warn('Failed to load conversation for shopId', e);
      }
    };
    fetchShopId();

    const handleMessageUpdated = (payload: any) => {
      if (payload.conversationId === conversationId) {
        useChatStore.getState().updateMessage(conversationId, payload.messageId, payload.content);
      }
    };

    socketService.socket?.on('message_updated', handleMessageUpdated);

    return () => {
      useChatStore.getState().setActiveConversation(null);
      useChatStore.getState().clearTyping();
      socketService.socket?.off('message_updated', handleMessageUpdated);
    };
  }, [conversationId]);

  useEffect(() => {
    const loadPinned = async () => {
      try {
        const stored = await AsyncStorage.getItem(`pins_${conversationId}`);
        if (stored) {
          setPinnedMessages(JSON.parse(stored));
        } else {
          setPinnedMessages([]);
        }
      } catch (e) {
        console.warn('Failed to load pinned messages from AsyncStorage:', e);
      }
    };
    loadPinned();
  }, [conversationId]);

  useEffect(() => {
    socketService.markAsRead(conversationId);
  }, [conversationId]);

  const handleSend = async () => {
    if (!content.trim() && !draftImage) return;

    if (draftImage) {
      setUploading(true);
      try {
        // Handle caption if exists
        if (content.trim()) {
          socketService.sendMessage(conversationId, content.trim(), 'TEXT');
          setContent('');
        }
        socketService.sendMessage(conversationId, draftImage.uri, 'IMAGE');
        setDraftImage(null);
      } catch (e) {
        Alert.alert('Lỗi', 'Không thể gửi ảnh');
      } finally {
        setUploading(false);
      }
      return;
    }

    if (isEditing && editingMsgId) {
      try {
        await apiClient.put(`/chat/conversations/${conversationId}/messages/${editingMsgId}`, { content: content.trim() });
        setIsEditing(false);
        setEditingMsgId(null);
        setContent('');
      } catch (e) {
        Alert.alert('Lỗi', 'Không thể sửa tin nhắn');
      }
      return;
    }

    socketService.sendMessage(conversationId, content, 'TEXT');
    setContent('');
  }

  const handleFaqSelect = async (faq: any) => {
    if (isSendingFaq.current) return;
    isSendingFaq.current = true;

    // Dismiss keyboard
    Keyboard.dismiss();

    // Send the FAQ question as the user's message
    socketService.sendMessage(conversationId, faq.question, 'TEXT');

    // Trigger auto-reply from seller after a short delay to ensure order consistency
    setTimeout(async () => {
      try {
        await apiClient.post(`/chat/conversations/${conversationId}/faq-reply`, { faqId: faq.id });
      } catch (e) {
        console.warn('FAQ auto-reply failed', e);
      } finally {
        setTimeout(() => {
          isSendingFaq.current = false;
        }, 1000);
      }
    }, 500);
  };

  const handleUpload = async () => {
    setUploading(true);
    const results = await pickAndUploadImages();

    if (results.length === 1) {
      const result = results[0];
      if (result && result.success && result.url) {
        if (result.type === 'VIDEO') {
          socketService.sendMessage(conversationId, result.url, 'VIDEO');
        } else {
          setDraftImage({ uri: result.url, localUri: result.localUri || result.url });
        }
      }
      setUploading(false);
      return;
    }

    for (const result of results) {
      if (result && result.success && result.url) {
        socketService.sendMessage(conversationId, result.url, result.type);
      }
    }
    setUploading(false);
  };

  const handleEditorDone = async (uri: string, caption?: string) => {
    setEditorImage(null);
    setUploading(true);
    try {
      const formData = new FormData();
      const filename = uri.split('/').pop() || 'edited_image.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;

      // @ts-ignore
      formData.append('file', { uri, name: filename, type });

      const response = await apiClient.post('/chat/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.url) {
        setDraftImage({ uri: response.data.url, localUri: uri });
        if (caption) setContent(caption);
      }
    } catch (error) {
      console.error('Upload edited image error:', error);
      Alert.alert('Lỗi', 'Không thể lưu ảnh đã chỉnh sửa');
    } finally {
      setUploading(false);
    }
  };

  const handleDocumentUpload = async () => {
    setUploading(true);

    const result = await pickAndUploadDocument();
    if (result && result.success && result.url) {
      socketService.sendMessage(conversationId, result.url, 'PDF');
    }
    setUploading(false);
  };

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') return;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setIsRecording(true);
      setRecordingDuration(0);

      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecordingAndDiscard = async () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setRecordingDuration(0);
    if (!recording) return;
    setIsRecording(false);
    setRecording(null);
    try {
      await recording.stopAndUnloadAsync();
    } catch (err) { }
  };

  const stopRecording = async () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setRecordingDuration(0);
    if (!recording) return;
    setIsRecording(false);
    setRecording(null);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    if (uri) {
      let replyMsgData = undefined;
      if (replyingTo) {
        replyMsgData = {
          id: replyingTo.id || replyingTo.messageId,
          content: replyingTo.content,
          type: replyingTo.type,
          senderId: replyingTo.senderId
        };
      }

      const res = await uploadAudio(uri);
      if (res && res.success && res.url) {
        socketService.sendMessage(conversationId, res.url, 'AUDIO');
      }
    }
  };

  const handleSendInvoice = (content: string) => {
    socketService.sendMessage(conversationId, content, 'INVOICE');
  };

  const handleLongPress = (message: any) => {
    if (message.isRecalled) return;
    setSelectedMessage(message);
    setShowActionSheet(true);
  };

  const closeActionSheet = () => {
    Animated.timing(sheetAnim, {
      toValue: Dimensions.get('window').height,
      duration: 250,
      useNativeDriver: true
    }).start(() => setShowActionSheet(false));
  };

  const handleAction = async (action: string) => {
    if (!selectedMessage) return;

    switch (action) {
      case 'copy':
        import('expo-clipboard').then(({ setStringAsync }) => {
          setStringAsync(selectedMessage.content);
        });
        break;
      case 'forward':
        setSelectedMessage({
          ...selectedMessage,
          resolvedSenderName: selectedMessage.senderId === user?.id ? 'Bạn' : (participantName || 'Người dùng')
        });
        setShowForwardModal(true);
        break;
      case 'report':
        setShowReportModal(true);
        break;
      case 'delete':
        apiClient.delete(`/chat/conversations/${conversationId}/messages/${selectedMessage.id}`)
          .then(() => useChatStore.getState().deleteMessage(conversationId, selectedMessage.id));
        break;
      case 'recall':
        socketService.socket?.emit('recall_message', { conversationId, messageId: selectedMessage.id });
        // Optimistically update the UI immediately
        useChatStore.getState().recallMessage(conversationId, selectedMessage.id);
        break;
      case 'edit':
        setIsEditing(true);
        setEditingMsgId(selectedMessage.id);
        setContent(selectedMessage.content);
        break;
      case 'pin': {
        const msgId = selectedMessage.id || selectedMessage.messageId;
        const isAlreadyPinned = pinnedMessages.some(p => p.messageId === msgId);
        if (isAlreadyPinned) break;
        const newPin = {
          messageId: msgId,
          conversationId,
          pinnedBy: user?.id,
          pinnedAt: new Date().toISOString(),
          senderId: selectedMessage.senderId,
          type: selectedMessage.type,
          content: selectedMessage.content,
          sender: {
            fullName: selectedMessage.senderId === user?.id ? 'Bạn' : (participantName || 'Người dùng'),
          }
        };
        const newList = [newPin, ...pinnedMessages];
        setPinnedMessages(newList);
        AsyncStorage.setItem(`pins_${conversationId}`, JSON.stringify(newList)).catch(() => { });
        break;
      }
      case 'unpin': {
        const msgId = selectedMessage.id || selectedMessage.messageId;
        const newList = pinnedMessages.filter(p => p.messageId !== msgId);
        setPinnedMessages(newList);
        AsyncStorage.setItem(`pins_${conversationId}`, JSON.stringify(newList)).catch(() => { });
        break;
      }
    }
  };

  const handleReaction = (emoji: string) => {
    socketService.socket?.emit('add_reaction', { conversationId, messageId: selectedMessage.id, emoji });
  };

  const handleForward = async (item: any) => {
    if (!selectedMessage) return;
    try {
      if (item.pickerType === 'GROUP') {
        await apiClient.post(`/chat/groups/${item.pickerId}/messages`, {
          content: selectedMessage.content,
          type: selectedMessage.type
        });
      } else {
        await apiClient.post(`/chat/conversations/${item.pickerId}/messages`, {
          content: selectedMessage.content,
          type: selectedMessage.type
        });
      }
      setShowForwardModal(false);
      Alert.alert('Thành công', 'Đã chuyển tiếp tin nhắn');
    } catch (e) {
      console.warn('Forward failed', e);
    }
  };

  const renderInvoice = (content: string, isMe: boolean) => {
    let data;
    try { data = JSON.parse(content); } catch { return null; }
    if (!data) return null;

    const formatCurrency = (n: number) => n.toLocaleString('vi-VN') + '₫';
    return (
      <View className={`rounded-[18px] overflow-hidden shadow-sm w-64 border ${isMe ? 'border-orange-500/30 bg-orange-500/10' : 'border-gray-200 bg-white'}`}>
        <View className="px-4 py-3 flex-row items-center border-b border-gray-100/10">
          <ShoppingBag size={14} color={isMe ? '#fff' : COLORS.primary} />
          <Text className={`text-[12px] font-bold ml-2 ${isMe ? 'text-white' : 'text-primary'}`}>Hoá đơn đơn hàng</Text>
        </View>
        <View className={`px-4 py-3 ${isMe ? 'bg-primary' : 'bg-gray-50/50'}`}>
          <Text className={`text-[11px] mb-2 ${isMe ? 'text-white/70' : 'text-gray-500'}`}>Mã đơn: <Text className={isMe ? 'text-white font-mono' : 'text-gray-800 font-mono'}>#{data.orderId.slice(-8).toUpperCase()}</Text></Text>
          {data.items?.slice(0, 2).map((it: any, i: number) => (
            <View key={i} className="flex-row justify-between mb-1">
              <Text className={`text-[11px] max-w-[120px] ${isMe ? 'text-white/90' : 'text-gray-600'}`} numberOfLines={1}>{it.productName} x{it.quantity}</Text>
              <Text className={`text-[11px] ${isMe ? 'text-white/90' : 'text-gray-600'}`}>{formatCurrency(it.price)}</Text>
            </View>
          ))}
          {data.items?.length > 2 && <Text className={`text-[10px] italic ${isMe ? 'text-white/60' : 'text-gray-400'}`}>+{data.items.length - 2} sản phẩm khác</Text>}
          <View className="flex-row justify-between items-center mt-2 pt-2 border-t border-gray-200/20">
            <Text className={`text-[11px] font-medium ${isMe ? 'text-white/80' : 'text-gray-600'}`}>Tổng</Text>
            <Text className={`text-[13px] font-bold ${isMe ? 'text-white' : 'text-gray-900'}`}>{formatCurrency(data.totalPrice)}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderProductBubble = (content: string, isMe: boolean) => {
    let data;
    try { data = JSON.parse(content); } catch { return null; }
    if (!data) return null;

    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('Home', { screen: 'ProductDetail', params: { productId: data.id } })}
        className={`w-56 rounded-[22px] border shadow-sm overflow-hidden ${isMe ? 'bg-white border-orange-500/20' : 'bg-white border-gray-100'}`}
      >
        <View className="p-2 pb-0">
          <Image source={{ uri: data.image }} className="w-full h-36 rounded-[16px] bg-gray-100" resizeMode="cover" />
        </View>
        <View className="p-3">
          <Text className="text-[13px] font-bold text-gray-800 leading-5" numberOfLines={2}>{data.name}</Text>
          <Text className="text-[15px] font-bold text-primary mt-1">₫{Number(data.price).toLocaleString()}</Text>
          <View className="mt-3 bg-gray-50 py-2 rounded-xl items-center border border-gray-100 flex-row justify-center">
            <ShoppingBag size={14} color={COLORS.secondary} className="mr-1" />
            <Text className="text-[11px] font-bold text-secondary ml-1">Xem sản phẩm</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderCall = (content: string, isMe: boolean) => {
    let data;
    try { data = JSON.parse(content); } catch { return null; }
    if (!data) return null;

    const isVideo = data.callType === 'video';
    const isMissed = data.status === 'missed';
    const Icon = isMissed ? PhoneMissed : isVideo ? Video : Phone;
    const label = isMissed ? (isVideo ? 'Cuộc gọi video nhỡ' : 'Cuộc gọi thoại nhỡ') : (isVideo ? 'Cuộc gọi video' : 'Cuộc gọi thoại');

    return (
      <View
        className={`rounded-[24px] border min-w-[230px] overflow-hidden ${
          isMe 
            ? 'bg-orange-500 border-orange-600/10' 
            : 'bg-white border-gray-100 shadow-sm shadow-gray-100/50'
        }`}
      >
        <View className="flex-row items-center px-4 py-3.5">
          <View className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${isMe ? 'bg-white/20' : 'bg-orange-50'}`}>
            <Icon size={18} color={isMe ? '#ffffff' : isMissed ? '#ef4444' : '#f97316'} />
          </View>
          <View className="flex-1">
            <Text className={`text-[13px] font-black tracking-tight ${isMe ? 'text-white' : 'text-secondary'}`}>
              {label}
            </Text>
            <Text className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 ${isMe ? 'text-white/80' : 'text-gray-400'}`}>
              {isMissed ? 'Không trả lời' : `${Math.floor(data.duration / 60)}m ${data.duration % 60}s`}
            </Text>
          </View>
        </View>

        <View
          className={`flex-row items-center justify-center py-2.5 border-t ${
            isMe 
              ? 'bg-white/10 border-white/10' 
              : 'bg-gray-50 border-gray-100'
          }`}
        >
          <PhoneCall size={12} color={isMe ? '#ffffff' : '#f97316'} />
          <Text className={`text-[10px] font-black tracking-wider ml-1.5 uppercase ${isMe ? 'text-white' : 'text-orange-600'}`}>
            Gọi lại
          </Text>
        </View>
      </View>
    );
  };

  const renderFriendRequest = (isMe: boolean) => {
    return (
      <View
        className={`flex-row items-center px-4 py-4 rounded-[24px] border min-w-[230px] ${isMe
            ? 'bg-orange-500 border-orange-600/10'
            : 'bg-white border-gray-100 shadow-sm shadow-gray-100/50'
          }`}
      >
        <View className={`w-11 h-11 rounded-full items-center justify-center mr-3 ${isMe ? 'bg-white/20' : 'bg-orange-50'}`}>
          <UserPlus size={20} color={isMe ? '#fff' : '#f97316'} />
        </View>
        <View className="flex-1">
          <Text className={`text-[14px] font-black tracking-tight ${isMe ? 'text-white' : 'text-secondary'}`}>
            Lời mời kết bạn
          </Text>
          {isMe ? (
            <Text className="text-[11px] text-white/80 font-bold uppercase tracking-widest mt-1">
              Đã gửi yêu cầu
            </Text>
          ) : (
            <TouchableOpacity
              onPress={() => handleAcceptFriendRequest(conversationId)}
              activeOpacity={0.9}
              className="mt-3.5 bg-orange-500 py-2.5 rounded-2xl items-center flex-row justify-center shadow-md shadow-orange-500/25 active:bg-orange-600"
            >
              <UserCheck size={14} color="#fff" />
              <Text className="text-white text-[11px] font-black ml-2 uppercase tracking-widest">
                Đồng ý
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderFriendAccept = (isMe: boolean) => {
    return (
      <View
        className={`flex-row items-center px-4 py-4 rounded-[24px] border min-w-[230px] ${isMe
            ? 'bg-orange-500 border-orange-600/10'
            : 'bg-white border-gray-100 shadow-sm shadow-gray-100/50'
          }`}
      >
        <View className={`w-11 h-11 rounded-full items-center justify-center mr-3 ${isMe ? 'bg-white/20' : 'bg-green-50'}`}>
          <UserCheck size={20} color={isMe ? '#fff' : '#22c55e'} />
        </View>
        <View className="flex-1">
          <Text className={`text-[14px] font-black tracking-tight ${isMe ? 'text-white' : 'text-secondary'}`}>
            Đã kết bạn
          </Text>
          <Text className={`text-[11px] font-bold uppercase tracking-widest mt-1 ${isMe ? 'text-white/80' : 'text-gray-400'}`}>
            Các bạn đã là bạn bè
          </Text>
        </View>
      </View>
    );
  };

  const renderAudio = (url: string, isMe: boolean) => {
    return <AudioPlayer url={url} isMe={isMe} />;
  };

  const renderVoucherBubble = (contentStr: string, isMe: boolean) => {
    return (
      <VoucherBubble
        contentStr={contentStr}
        isMe={isMe}
      />
    );
  };

  const renderMessage = ({ item, index }: { item: any; index: number }) => {
    const isMe = item.senderId === user?.id;
    const prevMsg = messages[index + 1];
    const nextMsg = messages[index - 1];

    const showAvatar = !isMe && (!nextMsg || nextMsg.senderId !== item.senderId);
    const isLastInGroup = !nextMsg || nextMsg.senderId !== item.senderId;
    const isNextConsecutive = nextMsg &&
      nextMsg.senderId === item.senderId &&
      Math.abs(dayjs(nextMsg.createdAt).diff(dayjs(item.createdAt), 'minute')) < 5;
    const showTime = !isNextConsecutive;

    // Types that should NOT be wrapped in a bubble
    const isBubbleless = ['IMAGE', 'VIDEO', 'AUDIO', 'INVOICE', 'PDF', 'GIF', 'STICKER', 'PRODUCT', 'VOUCHER', 'CALL', 'FRIEND_REQUEST', 'FRIEND_ACCEPT'].includes(item.type);
    const isRecalled = item.isRecalled || item.recalled;

    if (isRecalled && item.isForwarded) {
      if (index === unreadCountLimit - 1) {
        return (
          <View className="w-full">
            <View className="flex-row items-center my-6 px-4">
              <View className="flex-1 h-[1px] bg-gray-200" />
              <View className="mx-4 px-4 py-1.5 bg-gray-500 rounded-full flex-row items-center">
                <Text className="text-white font-bold text-[11px] uppercase tracking-widest">
                  Tin nhắn mới • {entryTime}
                </Text>
              </View>
              <View className="flex-1 h-[1px] bg-gray-200" />
            </View>
          </View>
        );
      }
      return null;
    }

    // Whether other user has seen the messages
    const isReadByOther = isMe && index === 0 && activeReadState.some(uid => uid !== user?.id);

    return (
      <View className="w-full">
        {/* Separator - visually above the oldest unread message */}
        {index === unreadCountLimit - 1 && (
          <View className="flex-row items-center my-6 px-4">
            <View className="flex-1 h-[1px] bg-gray-200" />
            <View className="mx-4 px-4 py-1.5 bg-gray-500 rounded-full flex-row items-center">
              <Text className="text-white font-bold text-[11px] uppercase tracking-widest">
                Tin nhắn mới • {entryTime}
              </Text>
            </View>
            <View className="flex-1 h-[1px] bg-gray-200" />
          </View>
        )}

        <View className={`mb-1 px-4 ${isMe ? 'items-end' : 'items-start'} ${isLastInGroup ? 'mb-4' : 'mb-1'}`}>
        <View className={`flex-row items-end ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
          {!isMe && (
            <TouchableOpacity
              className="w-8 mr-2"
              activeOpacity={0.8}
              onPress={() => {
                setSelectedUserId(item.senderId);
                setShowProfile(true);
              }}
            >
              {showAvatar && (
                <View className="w-8 h-8 rounded-full bg-orange-100 items-center justify-center border border-orange-200">
                  <Text className="text-primary text-[10px] font-bold">{participantName?.charAt(0)}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          {/* Bubbleless and standard bubbles wrapped in a single container */}
          <View className="max-w-[75%]">
            {item.isForwarded && (
              <View className={`flex-row items-center mb-1 px-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                <Text className="text-[11px] text-gray-400 mr-1">➡</Text>
                <Text className="text-[11px] text-gray-400 font-medium">
                  {(() => {
                    const currentSender = isMe ? 'Bạn' : (item.sender?.fullName || participantName || 'Người dùng');
                    const originalSender = item.forwardedFrom;
                    if (!originalSender || originalSender === currentSender) {
                      return `${currentSender} đã chuyển tiếp một tin nhắn`;
                    }
                    return `${currentSender} đã chuyển tiếp tin nhắn từ ${originalSender}`;
                  })()}
                </Text>
              </View>
            )}

            {!isRecalled && isBubbleless ? (
              <TouchableOpacity
                onPress={() => {
                  if (item.type === 'IMAGE') {
                    setPreviewImage(item.content);
                  } else if (item.type === 'VIDEO') {
                    setPreviewVideo(item.content);
                  } else if (item.type === 'PDF') {
                    try {
                      const data = JSON.parse(item.content);
                      if (data.url) require('react-native').Linking.openURL(data.url);
                    } catch {
                      require('react-native').Linking.openURL(item.content);
                    }
                  } else if (item.type === 'CALL') {
                    if (useChatStore.getState().call.callStatus !== 'idle' || useGroupCallStore.getState().status !== 'idle') return;
                    let callData;
                    try { callData = JSON.parse(item.content); } catch {}
                    if (callData) {
                      navigation.navigate('VideoCallModal', {
                        conversationId,
                        participantName,
                        callType: callData.callType || 'audio'
                      });
                    }
                  }
                }}
                onLongPress={() => handleLongPress(item)}
                activeOpacity={0.8}
                className="w-full"
              >
                {item.type === 'IMAGE' ? (
                  <Image source={{ uri: item.content }} className="w-52 h-52 rounded-2xl" resizeMode="cover" />
                ) : item.type === 'VIDEO' ? (
                  <View className="w-52 h-52 rounded-2xl bg-black items-center justify-center relative overflow-hidden">
                    <Image source={{ uri: item.content }} className="w-full h-full opacity-60" resizeMode="cover" />
                    <View className="absolute bg-black/40 p-3 rounded-full border border-white/20">
                      <Play size={24} color="#fff" fill="#fff" />
                    </View>
                    <View className="absolute bottom-2 right-2 bg-black/60 px-1.5 py-0.5 rounded">
                      <Text className="text-white text-[8px] font-bold">VIDEO</Text>
                    </View>
                  </View>
                ) : item.type === 'AUDIO' ? (
                  renderAudio(item.content, isMe)
                ) : item.type === 'INVOICE' ? (
                  renderInvoice(item.content, isMe)
                ) : item.type === 'PDF' ? (
                  <View className="flex-row items-center bg-gray-100 p-3 rounded-2xl border border-gray-200">
                    <FileText size={24} color={COLORS.primary} className="shrink-0" />
                    <View className="ml-2 max-w-[150px]">
                      <Text className="text-[13px] font-medium text-gray-800" numberOfLines={1}>
                        {(() => {
                          try {
                            const data = JSON.parse(item.content);
                            return data.name || 'Tài liệu PDF';
                          } catch {
                            const last = item.content.split('/').pop() || '';
                            const raw = last.split('_').slice(2).join('_');
                            try { return decodeURIComponent(raw) || 'Tài liệu PDF'; } catch { return raw || 'Tài liệu PDF'; }
                          }
                        })()}
                      </Text>
                      <Text className="text-[10px] text-gray-400 mt-0.5" numberOfLines={1}>Nhấn để xem</Text>
                    </View>
                  </View>
                ) : item.type === 'GIF' || item.type === 'STICKER' ? (
                  <Image
                    source={{ uri: item.content }}
                    className="w-40 h-40"
                    resizeMode="contain"
                  />
                ) : item.type === 'PRODUCT' ? (
                  renderProductBubble(item.content, isMe)
                ) : item.type === 'VOUCHER' ? (
                  renderVoucherBubble(item.content, isMe)
                ) : item.type === 'CALL' ? (
                  renderCall(item.content, isMe)
                ) : item.type === 'FRIEND_REQUEST' ? (
                  renderFriendRequest(isMe)
                ) : item.type === 'FRIEND_ACCEPT' ? (
                  renderFriendAccept(isMe)
                ) : null}
                {showTime && (
                  <View className={`flex-row mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <Text className="text-[9px] text-gray-400 font-bold">{dayjs(item.createdAt).format('HH:mm')}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ) : (
              /* Bubble wrapper for text, recalled types */
              <TouchableOpacity
                onLongPress={() => handleLongPress(item)}
                activeOpacity={0.8}
                className={`w-full min-w-[85px] px-4 py-3 rounded-[22px] shadow-sm ${isRecalled
                    ? (isMe ? 'bg-orange-200/60 rounded-tr-none' : 'bg-gray-100 rounded-tl-none border border-gray-100')
                    : isMe
                      ? 'bg-orange-400 rounded-tr-none shadow-orange-400/20'
                      : 'bg-white rounded-tl-none border border-gray-100 shadow-gray-200/50'
                  }`}
              >
                {isRecalled ? (
                  <Text className={`text-[13px] italic ${isMe ? 'text-orange-700/70' : 'text-gray-400'}`}>
                    Tin nhắn đã được thu hồi
                  </Text>
                ) : (
                  <Text className={`text-[13px] leading-5 ${isMe ? 'text-white font-medium' : 'text-secondary font-medium'}`}>
                    {searchQuery ? (
                      item.content.split(new RegExp(`(${searchQuery})`, 'gi')).map((part: string, i: number) =>
                        part.toLowerCase() === searchQuery.toLowerCase()
                          ? <Text key={i} className="bg-yellow-300 text-black">{part}</Text>
                          : part
                      )
                    ) : item.content}
                    {(item.isEdited || item.edited) && <Text className={`text-[9px] italic ${isMe ? 'text-white/50' : 'text-gray-400'}`}> (đã sửa)</Text>}
                  </Text>
                )}

                {showTime && (
                  <View className="flex-row justify-end items-center mt-1.5 min-w-[40px]">
                    <Text className={`text-[8px] font-bold opacity-60 ${isMe ? 'text-white' : 'text-gray-400'}`}>
                      {dayjs(item.createdAt).format('HH:mm')}
                    </Text>
                    {isMe && (
                      <View className="ml-1 opacity-80">
                        <CheckCheck size={10} color={isReadByOther ? '#60a5fa' : '#fff'} />
                      </View>
                    )}
                  </View>
                )}

                {/* Reactions */}
                {item.reactions && Object.keys(item.reactions).length > 0 && (
                  <View className="flex-row flex-wrap mt-1 gap-1">
                    {Object.entries(item.reactions).map(([emoji, users]: [string, any]) => {
                      if (!users || users.length === 0) return null;
                      return (
                        <View key={emoji} className="flex-row items-center bg-white border border-gray-100 rounded-full px-1.5 py-0.5 shadow-sm">
                          <Text className="text-[10px]">{emoji}</Text>
                          {users.length > 1 && <Text className="text-[9px] text-gray-500 ml-0.5">{users.length}</Text>}
                        </View>
                      );
                    })}
                  </View>
                )}
              </TouchableOpacity>
            )}
          </View>

          {!isRecalled && (
            <TouchableOpacity
              onPress={() => {
                const enriched = {
                  ...item,
                  resolvedSenderName: item.senderId === user?.id ? 'Bạn' : (participantName || 'Người dùng')
                };
                setSelectedMessage(enriched);
                setShowForwardModal(true);
              }}
              className="mx-2 p-1.5 rounded-full bg-gray-100/80 active:bg-orange-50 border border-gray-200/20 items-center justify-center self-center"
              style={{ opacity: 0.7 }}
            >
              <CornerUpRight size={14} color="#666" />
            </TouchableOpacity>
          )}
        </View>

        {/* Read Receipt - show below the latest message from me */}
        {isReadByOther && (
          <View className="flex-row justify-end items-center mt-1 pr-1">
            <View className="w-4 h-4 rounded-full bg-blue-100 border border-blue-200 items-center justify-center">
              <Text className="text-[7px] font-bold text-blue-500">{participantName?.charAt(0)}</Text>
            </View>
            <Text className="text-[10px] text-blue-400 ml-1 font-semibold">Đã xem</Text>
          </View>
        )}
        </View>
      </View>
    );
  };

  return (
    <>
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : (isKeyboardVisible ? 'padding' : undefined)}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 25}
          className="flex-1"
        >
          {/* Premium Header */}
          <View className="bg-white px-5 py-4 flex-row items-center justify-between border-b border-gray-50 shadow-sm z-10">
            <View className="flex-row items-center flex-1">
              <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3 bg-gray-50 p-2.5 rounded-2xl border border-gray-100">
                <ChevronLeft size={20} color={COLORS.secondary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowProfile(true)} className="flex-1">
                <Text className="text-secondary font-bold text-base tracking-tight" numberOfLines={1}>{participantName || 'Người dùng'}</Text>
                <View className="flex-row items-center">
                  <View className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5" />
                  <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Trực tuyến</Text>
                </View>
              </TouchableOpacity>

            </View>
            <View className="flex-row items-center">
              <TouchableOpacity
                className={`bg-gray-50 p-2.5 rounded-2xl border border-gray-100 mr-2 ${(useChatStore.getState().call.callStatus !== 'idle' || useGroupCallStore.getState().status !== 'idle') ? 'opacity-50' : ''
                  }`}
                onPress={() => {
                  if (useChatStore.getState().call.callStatus !== 'idle' || useGroupCallStore.getState().status !== 'idle') return;
                  navigation.navigate('VideoCallModal', { conversationId, participantName, callType: 'audio' });
                }}
                disabled={useChatStore.getState().call.callStatus !== 'idle' || useGroupCallStore.getState().status !== 'idle'}
              >
                <Phone size={20} color={COLORS.secondary} />
              </TouchableOpacity>
              <TouchableOpacity
                className={`bg-gray-50 p-2.5 rounded-2xl border border-gray-100 mr-2 ${(useChatStore.getState().call.callStatus !== 'idle' || useGroupCallStore.getState().status !== 'idle') ? 'opacity-50' : ''
                  }`}
                onPress={() => {
                  if (useChatStore.getState().call.callStatus !== 'idle' || useGroupCallStore.getState().status !== 'idle') return;
                  navigation.navigate('VideoCallModal', { conversationId, participantName, callType: 'video' });
                }}
                disabled={useChatStore.getState().call.callStatus !== 'idle' || useGroupCallStore.getState().status !== 'idle'}
              >
                <Video size={20} color={COLORS.secondary} />
              </TouchableOpacity>
              <TouchableOpacity
                className="bg-gray-50 p-2.5 rounded-2xl border border-gray-100 mr-2"
                onPress={() => setIsSearching(!isSearching)}
              >
                <Search size={20} color={isSearching ? COLORS.primary : COLORS.secondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Search Bar Row (When active) */}
          {isSearching && (
            <View className="bg-white px-5 pb-3 border-b border-gray-50">
              <View className="flex-row items-center bg-gray-50 rounded-2xl border border-gray-100 px-4 py-2.5">
                <Search size={18} color={COLORS.secondary} />
                <TextInput
                  className="flex-1 ml-3 text-sm font-bold text-secondary"
                  placeholder="Tìm kiếm tin nhắn..."
                  placeholderTextColor="#9ca3af"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoFocus
                />
                <TouchableOpacity onPress={() => { setIsSearching(false); setSearchQuery(''); }}>
                  <XCircle size={18} color="#9ca3af" />
                </TouchableOpacity>
              </View>
            </View>
          )}


          {/* Chat Content */}
          <View className="flex-1 bg-gray-50/20">
            <View className="absolute inset-0" pointerEvents="none">
              <Image
                source={{ uri: 'https://www.transparenttextures.com/patterns/cubes.png' }}
                className="w-full h-full opacity-[0.03]"
                style={{ tintColor: COLORS.secondary }}
              />
            </View>
            <PinnedBanner
              pinnedMessages={pinnedMessages}
              isAdmin={true}
              onPress={(msg) => {
                console.log('[PIN] Pinned message pressed:', msg.messageId);
                let index = messages.findIndex(m => m.id === msg.messageId || m.messageId === msg.messageId);
                if (index === -1 && msg.content) {
                  index = messages.findIndex(m => m.content === msg.content);
                }
                if (index !== -1) {
                  try {
                    flatListRef.current?.scrollToIndex({ index, animated: true });
                  } catch (err) {
                    flatListRef.current?.scrollToOffset({ offset: index * 60, animated: true });
                  }
                }
              }}
              onUnpin={(msgId) => {
                const newList = pinnedMessages.filter(p => p.messageId !== msgId);
                setPinnedMessages(newList);
                AsyncStorage.setItem(`pins_${conversationId}`, JSON.stringify(newList)).catch(() => { });
              }}
              onShowList={() => setShowPinnedListModal(true)}
            />

            {loading ? (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator color={COLORS.primary} size="large" />
              </View>
            ) : messages.length === 0 && user?.role !== 'SELLER' && shopFaqs.length > 0 ? (
              // Empty chat — show FAQ full panel for buyer
              <FaqMenuPanel
                faqs={shopFaqs}
                onSelect={handleFaqSelect}
                shopName={participantName}
              />
            ) : (
              <FlatList
                ref={flatListRef}
                data={searchQuery
                  ? messages.filter(m => m.type === 'TEXT' && m.content.toLowerCase().includes(searchQuery.toLowerCase()))
                  : messages
                }
                renderItem={renderMessage}
                keyExtractor={(item, index) => item.id?.toString() || `msg-${index}-${item.createdAt}`}
                inverted
                contentContainerStyle={{ paddingVertical: 20 }}
                showsVerticalScrollIndicator={false}
                onEndReached={() => loadMessages(true)}
                onEndReachedThreshold={0.5}
                onScrollToIndexFailed={(info) => {
                  flatListRef.current?.scrollToOffset({ offset: info.highestMeasuredFrameIndex * 50, animated: true });
                  setTimeout(() => {
                    try {
                      flatListRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.5 });
                    } catch (e) { }
                  }, 100);
                }}
              />
            )}

            {/* Typing Indicator */}
            {isTyping && (
              <View className="px-4 pb-3">
                <View className="flex-row items-center bg-white rounded-2xl px-4 py-3 self-start shadow-sm border border-gray-100" style={{ maxWidth: '70%' }}>
                  <View className="flex-row items-center mr-2">
                    <View className="w-2 h-2 rounded-full bg-primary mr-1" />
                    <View className="w-2 h-2 rounded-full bg-primary/60 mr-1" />
                    <View className="w-2 h-2 rounded-full bg-primary/30" />
                  </View>
                  <Text className="text-secondary text-[13px] font-semibold">{participantName} đang nhập...</Text>
                </View>
              </View>
            )}
          </View>

          {isEditing && (
            <View className="bg-orange-50 px-4 py-2 flex-row justify-between items-center border-t border-orange-100">
              <View className="flex-row items-center">
                <Pencil size={12} color={COLORS.primary} />
                <Text className="text-[11px] text-primary font-bold ml-2">Đang chỉnh sửa bản tin</Text>
              </View>
              <TouchableOpacity onPress={() => { setIsEditing(false); setEditingMsgId(null); setContent(''); }}>
                <XCircle size={16} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
          )}

          {/* Compact FAQ pill row — buyer side, when conversation already has messages */}
          {user?.role !== 'SELLER' && shopFaqs.length > 0 && messages.length > 0 && (
            <FaqMenuPanel
              faqs={shopFaqs}
              onSelect={handleFaqSelect}
              compact
            />
          )}

          {/* Modern Input Bar */}
          <View
            className="bg-white px-4 pt-3 border-t border-gray-50"
            style={{ paddingBottom: isKeyboardVisible ? 12 : Math.max(insets.bottom, 12) }}
          >
            <View className="flex-row items-end">
              <TouchableOpacity
                onPress={() => setShowAttachmentMenu(!showAttachmentMenu)}
                className="p-3.5 bg-gray-50 rounded-2xl mb-1 mr-2 border border-gray-100"
              >
                <Plus size={20} color={COLORS.secondary} style={{ transform: [{ rotate: showAttachmentMenu ? '45deg' : '0deg' }] }} />
              </TouchableOpacity>

              {isRecording ? (
                <View className="flex-1 bg-red-50 rounded-[28px] px-5 py-3.5 flex-row items-center justify-between border border-red-100 mr-2 mb-1 h-[48px]">
                  <View className="flex-row items-center">
                    <View className="w-2.5 h-2.5 bg-red-500 rounded-full mr-2 animate-pulse" />
                    <Text className="text-red-500 font-bold text-sm">
                      Đang ghi âm ({Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')})
                    </Text>
                  </View>
                  <TouchableOpacity onPress={stopRecordingAndDiscard} className="p-1">
                    <Trash2 size={20} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View className="flex-1 bg-gray-50 rounded-[28px] px-2 py-2 flex-col justify-center border border-gray-100">
                  {draftImage && (
                    <View className="mb-2 px-3 py-2 flex-row items-center bg-white/50 rounded-2xl mx-1 border border-gray-100">
                      <TouchableOpacity
                        onPress={() => setEditorImage(draftImage.localUri)}
                        className="relative"
                      >
                        <Image source={{ uri: draftImage.localUri }} className="w-16 h-16 rounded-xl" />
                        <View className="absolute inset-0 bg-black/20 items-center justify-center rounded-xl">
                          <Pencil size={16} color="#fff" />
                        </View>
                      </TouchableOpacity>
                      <View className="flex-1 ml-3">
                        <Text className="text-secondary font-bold text-[11px]">Chạm để chỉnh sửa</Text>
                        <Text className="text-gray-400 text-[10px]">1 ảnh đã chọn</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => setDraftImage(null)}
                        className="bg-gray-100 p-2 rounded-full"
                      >
                        <X size={16} color="#666" />
                      </TouchableOpacity>
                    </View>
                  )}
                  <View className="flex-row items-center px-3 py-1.5">
                    <TextInput
                      className="flex-1 text-secondary text-sm font-bold text-left"
                      placeholder="Nhập tin nhắn..."
                      placeholderTextColor="#9ca3af"
                      multiline
                      value={content}
                      onChangeText={(text) => {
                        setContent(text);
                        if (text.length > 0) {
                          socketService.socket?.emit('typing', { conversationId });
                        }
                      }}
                      style={{ maxHeight: 100 }}
                    />
                    <TouchableOpacity
                      className="ml-2"
                      onPress={() => setShowEmojiPicker(!showEmojiPicker)}
                    >
                      <Smile size={20} color={showEmojiPicker ? COLORS.primary : "#9ca3af"} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <TouchableOpacity
                onPress={isRecording ? stopRecording : handleSend}
                className={`ml-1 w-12 h-12 rounded-[22px] bg-primary items-center justify-center shadow-lg shadow-orange-500/40 mb-1 ${(!content.trim() && !isRecording) ? 'opacity-50' : ''}`}
                disabled={!content.trim() && !isRecording}
              >
                <Send size={18} color="#fff" strokeWidth={3} />
              </TouchableOpacity>
            </View>

            {/* Attachment Menu */}
            {showAttachmentMenu && (
              <View className="flex-row flex-wrap pt-4 pb-1 mt-2 border-t border-gray-100">
                <TouchableOpacity
                  onPress={() => { setShowAttachmentMenu(false); handleUpload(); }}
                  className="w-[20%] items-center justify-center mb-3"
                >
                  <View className="w-11 h-11 bg-blue-50 rounded-full items-center justify-center mb-1">
                    <ImageIcon size={20} color="#3b82f6" />
                  </View>
                  <Text className="text-[10px] text-gray-600 font-bold text-center">Hình ảnh</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={async () => {
                    if (isRecording) {
                      await stopRecording();
                    } else {
                      setShowAttachmentMenu(false);
                      await startRecording();
                    }
                  }}
                  className="w-[20%] items-center justify-center mb-3"
                >
                  <View className={`w-11 h-11 rounded-full items-center justify-center mb-1 ${isRecording ? 'bg-red-100' : 'bg-green-50'}`}>
                    <Mic size={20} color={isRecording ? "#ef4444" : "#10b981"} />
                  </View>
                  <Text className="text-[10px] text-gray-600 font-bold text-center">{isRecording ? "Dừng ghi" : "Ghi âm"}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => { setShowAttachmentMenu(false); handleDocumentUpload(); }}
                  className="w-[20%] items-center justify-center mb-3"
                >
                  <View className="w-11 h-11 bg-purple-50 rounded-full items-center justify-center mb-1">
                    <Paperclip size={20} color="#a855f7" />
                  </View>
                  <Text className="text-[10px] text-gray-600 font-bold text-center">Tài liệu</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => { setShowAttachmentMenu(false); setShowStickers(true); }}
                  className="w-[20%] items-center justify-center mb-3"
                >
                  <View className="w-11 h-11 bg-pink-50 rounded-full items-center justify-center mb-1">
                    <Sticker size={20} color="#ec4899" />
                  </View>
                  <Text className="text-[10px] text-gray-600 font-bold text-center">Nhãn dán</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => { setShowAttachmentMenu(false); setShowGifs(true); }}
                  className="w-[20%] items-center justify-center mb-3"
                >
                  <View className="w-11 h-11 bg-violet-50 rounded-full items-center justify-center mb-1">
                    <Film size={20} color="#8b5cf6" />
                  </View>
                  <Text className="text-[10px] text-gray-600 font-bold text-center">Ảnh GIF</Text>
                </TouchableOpacity>

                {user?.role === 'SELLER' && (
                  <TouchableOpacity
                    onPress={() => { setShowAttachmentMenu(false); setShowVoucherModal(true); }}
                    className="w-[20%] items-center justify-center mb-3"
                  >
                    <View className="w-11 h-11 bg-orange-50 rounded-full items-center justify-center mb-1">
                      <Ticket size={20} color="#f97316" />
                    </View>
                    <Text className="text-[10px] text-gray-600 font-bold text-center">Khuyến mãi</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  onPress={() => { setShowAttachmentMenu(false); setShowInvoiceModal(true); }}
                  className="w-[20%] items-center justify-center mb-3"
                >
                  <View className="w-11 h-11 bg-orange-50 rounded-full items-center justify-center mb-1">
                    <ShoppingBag size={20} color={COLORS.primary} />
                  </View>
                  <Text className="text-[10px] text-gray-600 font-bold text-center">Hóa đơn</Text>
                </TouchableOpacity>
              </View>
            )}

          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Image Editor */}
      <ImageEditorModal
        visible={!!editorImage}
        imageUri={editorImage || ''}
        onCancel={() => setEditorImage(null)}
        onDone={handleEditorDone}
      />

      {/* Profile Modal */}
      <UserProfileModal
        visible={showProfile}
        userId={selectedUserId || ''}
        onClose={() => setShowProfile(false)}
        onStartDM={(id) => { }}
      />

      {/* Action Modal */}
      <MessageActionModal
        visible={showActionSheet}
        onClose={() => setShowActionSheet(false)}
        message={selectedMessage}
        isMe={selectedMessage?.senderId === user?.id}
        onAction={handleAction}
        onReact={handleReaction}
        isAdmin={true}
        isPinned={pinnedMessages.some(m => m.messageId === selectedMessage?.id || m.messageId === selectedMessage?.messageId)}
      />

      <PinnedMessagesListModal
        visible={showPinnedListModal}
        onClose={() => setShowPinnedListModal(false)}
        groupId={conversationId}
        isAdmin={true}
        localPinnedList={pinnedMessages}
        onSelect={(msg) => {
          let index = messages.findIndex(m => m.id === msg.messageId || m.messageId === msg.messageId);
          if (index === -1 && msg.content) {
            index = messages.findIndex(m => m.content === msg.content);
          }
          if (index !== -1) {
            try {
              flatListRef.current?.scrollToIndex({ index, animated: true });
            } catch (err) {
              flatListRef.current?.scrollToOffset({ offset: index * 60, animated: true });
            }
          }
        }}
        onUnpin={(msgId) => {
          const newList = pinnedMessages.filter(p => p.messageId !== msgId);
          setPinnedMessages(newList);
          AsyncStorage.setItem(`pins_${conversationId}`, JSON.stringify(newList)).catch(() => { });
        }}
      />

      {/* Forward Modal */}
      <Modal visible={showForwardModal} animationType="slide">
        <SafeAreaView className="flex-1 bg-white">
          <View className="px-5 py-4 flex-row items-center justify-between border-b border-gray-50">
            <TouchableOpacity onPress={() => setShowForwardModal(false)}>
              <Text className="text-orange-500 font-bold text-sm">Xong</Text>
            </TouchableOpacity>
            <Text className="text-sm font-black text-secondary">Gửi đến</Text>
            <TouchableOpacity onPress={() => {
              setShowForwardModal(false);
              navigation.navigate('CreateGroup');
            }}>
              <Text className="text-orange-500 font-bold text-sm">Tạo nhóm</Text>
            </TouchableOpacity>
          </View>
          <ConversationPicker
            excludeId={conversationId}
            selectedMessage={selectedMessage}
          />
        </SafeAreaView>
      </Modal>

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <View style={{ height: 250 + insets.bottom, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingBottom: insets.bottom }}>
          <ScrollView contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', padding: 10 }}>
            {EMOJI_LIST.map((emoji, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => setContent(prev => prev + emoji)}
                style={{ width: '12.5%', height: 40, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ fontSize: 24 }}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <InvoiceModal
        visible={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        onSend={handleSendInvoice}
      />


      {/* Full-Screen Video Viewer */}
      <Modal visible={!!previewVideo} transparent animationType="slide">
        <View className="flex-1 bg-black items-center justify-center">
          <TouchableOpacity
            className="absolute top-12 right-6 z-20 p-2 bg-white/20 rounded-full"
            onPress={() => setPreviewVideo(null)}
          >
            <X size={24} color="#fff" />
          </TouchableOpacity>

          {previewVideo && (
            <ExpoVideo
              source={{ uri: previewVideo }}
              rate={1.0}
              volume={1.0}
              isMuted={false}
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay
              useNativeControls
              style={{ width: '100%', height: '100%' }}
            />
          )}
        </View>
      </Modal>

      {/* Sticker Picker Modal */}
      <Modal
        visible={showStickers}
        animationType="slide"
        transparent
        onRequestClose={() => setShowStickers(false)}
      >
        <View className="flex-1 bg-black/40 justify-end">
          <View className="h-[70%]">
            <StickerPicker
              onSelect={(url) => {
                socketService.sendMessage(conversationId, url, 'STICKER');
                setShowStickers(false);
              }}
              onClose={() => setShowStickers(false)}
            />
          </View>
        </View>
      </Modal>
      <ReportMessageModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        conversationId={conversationId}
        targetMessage={selectedMessage}
      />

      {/* Gif Picker Modal */}
      <Modal
        visible={showGifs}
        animationType="slide"
        transparent
        onRequestClose={() => setShowGifs(false)}
      >
        <View className="flex-1 bg-black/40 justify-end">
          <View className="h-[70%]">
            <GifPickerPanel
              onSelect={(url) => {
                socketService.sendMessage(conversationId, url, 'GIF');
                setShowGifs(false);
              }}
              onClose={() => setShowGifs(false)}
            />
          </View>
        </View>
      </Modal>

      {/* Send Voucher Modal */}
      <SendVoucherModal
        visible={showVoucherModal}
        onClose={() => setShowVoucherModal(false)}
        shopId={shopId}
        onSend={(voucher) => {
          socketService.sendMessage(conversationId, JSON.stringify(voucher), 'VOUCHER');
          setShowVoucherModal(false);
        }}
      />
    </>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
// (Removed internal AudioPlayer - now using shared component)

