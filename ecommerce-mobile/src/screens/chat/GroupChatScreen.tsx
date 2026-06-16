import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Image, Alert, Linking, Modal, Keyboard
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAuthStore } from '../../contexts/authContext';
import { useGroupStore } from '../../store/groupStore';
import { useChatStore } from '../../store/chatStore';
import { useGroupCallStore } from '../../store/groupCallStore';
import { COLORS } from '../../constants';
import dayjs from 'dayjs';
import { Audio } from 'expo-av';
import {
  ChevronLeft, MoreVertical, Send, Smile, Info, Phone, Video,
  Users as GroupIcon, FileText, Mic, Trash2, X, Play, Pause, Plus, Image as ImageIcon, Paperclip,
  Reply, Search, XCircle, Download, ClipboardList, CheckCircle2, PhoneCall, PhoneMissed
} from 'lucide-react-native';
import ReplyPreview from '../../features/chat/components/ReplyPreview';
import UserProfileModal from '../../features/chat/components/UserProfileModal';
import { Video as ExpoVideo, ResizeMode } from 'expo-av';
import { pickAndUploadImages, uploadAudio, pickAndUploadDocument } from '../../services/upload/attachmentService';
import VoucherBubble from '../../features/chat/components/VoucherBubble';
import MessageActionModal from '../../features/chat/components/MessageActionModal';
import GroupInfoModal from '../../features/chat/components/GroupInfoModal';
import ConversationPicker from '../../features/chat/components/ConversationPicker';
import socketService from '../../services/socket/socketService';
import { ScrollView } from 'react-native-gesture-handler';
import apiClient from '../../api/client';
import StickerPicker from '../../features/chat/components/StickerPicker';
import GifPickerPanel from '../../features/chat/components/GifPickerPanel';
import SendVoucherModal from '../../features/chat/components/SendVoucherModal';
import { Sticker, Pencil, Pin, CornerUpRight, Film, Ticket } from 'lucide-react-native';
import ImageEditorModal from '../../features/user/components/ImageEditorModal';
import PinnedBanner from '../../features/chat/components/PinnedBanner';
import PinnedMessagesListModal from '../../features/chat/components/PinnedMessagesListModal';
import MessageDetailsModal from '../../features/chat/components/MessageDetailsModal';
import PollModal from '../../features/chat/components/PollModal';
import ReminderModal from '../../features/chat/components/ReminderModal';
import AudioPlayer from '../../features/chat/components/AudioPlayer';
import { Bell, Clock } from 'lucide-react-native';

export default function GroupChatScreen({ route, navigation }: any) {
  const { groupId, groupName: initialGroupName } = route.params;
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [groupName, setGroupName] = useState(initialGroupName);
  const [groupAvatar, setGroupAvatar] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  const activeCall = useGroupCallStore(state => state.activeCallsByGroup[groupId]);
  const groupCallStatus = useGroupCallStore(state => state.status);

  const groupMessagesState = useGroupStore(state => state.groupMessages[groupId]);
  const groupMessages = groupMessagesState || [];
  const addGroupMessage = useGroupStore(state => state.addGroupMessage);
  const setGroupMessages = useGroupStore(state => state.setGroupMessages);
  const groupMembersState = useGroupStore(state => state.groupMembers[groupId]);
  const groupMembers = groupMembersState || [];
  const groupTypingUsers = useGroupStore(state => state.groupTypingUsers[groupId]);
  const typingUsers = groupTypingUsers || {};

  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewVideo, setPreviewVideo] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showMessageDetails, setShowMessageDetails] = useState(false);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [showGifs, setShowGifs] = useState(false);
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [claimedVouchers, setClaimedVouchers] = useState<string[]>([]);
  const [editorImage, setEditorImage] = useState<string | null>(null);
  const [draftImage, setDraftImage] = useState<{ uri: string, localUri: string } | null>(null);
  const [unreadCountLimit] = useState<number>(route.params?.unreadCount || 0);
  const [entryTime] = useState(dayjs().format('HH:mm'));
  const [showPollModal, setShowPollModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [votingMsgId, setVotingMsgId] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showPinnedListModal, setShowPinnedListModal] = useState(false);
  const [profileCache, setProfileCache] = useState<Record<string, { name: string; avatarUrl?: string }>>({});
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  const EMOJI_LIST = [
    '😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😍', '🥰', '😘', '😗', '😙',
    '😚', '😋', '😛', '😜', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '😐', '😑', '😶', '😏', '😒',
    '🙄', '😬', '😔', '😞', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤',
    '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '💀', '👻',
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘',
    '💝', '👍', '👎', '👏', '🙌', '🤝', '🤜', '🤛', '✊', '👊', '🤞', '✌️', '🤟', '🤘', '👌', '🔥',
    '⭐', '🌟', '💫', '✨', '🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '💯', '🎯', '👀', '💪', '🙏', '🫶',
  ];

  const groupReadStateRaw = useGroupStore(state => state.groupReadState[groupId]);
  const groupReadState = groupReadStateRaw || [];
  const pinnedMessagesRaw = useGroupStore(state => state.pinnedMessages[groupId]);
  const pinnedMessages = pinnedMessagesRaw || [];
  const setPinnedMessages = useGroupStore(state => state.setPinnedMessages);
  const polls = useGroupStore(state => state.polls[groupId]) || {};

  const loadMessages = async () => {
    try {
      // Try primary endpoint
      let response = await apiClient.get(`/chat/groups/${groupId}/messages`);

      // If primary fails or is empty, try alternative common endpoint
      if (!response.data || (Array.isArray(response.data) && response.data.length === 0)) {
        try {
          const altRef = await apiClient.get(`/chat/messages/group/${groupId}`);
          if (altRef.data) response = altRef;
        } catch (e) { /* ignore alt failed */ }
      }

      const resBody = response.data;
      const rawMsgs = resBody?.messages || resBody?.data?.messages || resBody?.data || resBody?.content || (Array.isArray(resBody) ? resBody : []);
      const msgs = Array.isArray(rawMsgs) ? rawMsgs : [];

      if (msgs.length > 0) {
        setGroupMessages(groupId, [...msgs].reverse());
        // Extract and upsert polls from history, or fetch if missing
        msgs.forEach(async (m: any) => {
          if (m.type === 'POLL') {
            if (m.poll) {
              useGroupStore.getState().upsertPoll(groupId, m.poll);
            } else {
              // Fallback: fetch poll details if missing in history
              try {
                const pRes = await apiClient.get(`/chat/groups/${groupId}/polls/${m.content}`);
                const pData = pRes.data?.data || pRes.data;
                if (pData) useGroupStore.getState().upsertPoll(groupId, pData);
              } catch (e) { }
            }
          }
        });
      }
    } catch (error) {
      console.warn('Failed to load group messages history', error);
    } finally {
      setLoading(false);
    }
  };

  const loadGroupDetails = async () => {
    try {
      const response = await apiClient.get(`/chat/groups/${groupId}`);
      const data = response.data?.data || response.data;
      if (data?.name) setGroupName(data.name);
      if (data?.avatarUrl) setGroupAvatar(data.avatarUrl);
    } catch (e) { }
  };

  const loadGroupMembers = async () => {
    try {
      const response = await apiClient.get(`/chat/groups/${groupId}/members`);
      const membersData = response.data?.members || response.data?.data || (Array.isArray(response.data) ? response.data : []);
      const rawMembers = Array.isArray(membersData) ? membersData : [];
      const members = rawMembers.map((m: any) => ({
        ...m,
        role: m.role === 'DEPUTY' ? 'ADMIN' : m.role
      }));
      useGroupStore.getState().setGroupMembers(groupId, members);
    } catch (e) {
      console.warn('Failed to load group members', e);
    }
  };

  const loadPinnedMessages = async () => {
    try {
      const response = await apiClient.get(`/chat/groups/${groupId}/pins`);
      const rawPinned = response.data?.data || response.data?.messages || (Array.isArray(response.data) ? response.data : []);
      setPinnedMessages(groupId, Array.isArray(rawPinned) ? rawPinned : []);
    } catch (e) {
      console.warn('Failed to load pinned messages', e);
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

  // Fetch display names for all group members
  useEffect(() => {
    if (groupMembers.length === 0) return;
    const missing = groupMembers
      .filter(m => m && m.userId)
      .map((m) => m.userId)
      .filter((id) => !profileCache[id]);
    if (missing.length === 0) return;

    missing.forEach((id) => {
      apiClient.get(`/users/${id}`)
        .then((res) => {
          const p = res.data?.data || res.data;
          setProfileCache((prev) => ({ ...prev, [id]: { name: p?.fullName || id, avatarUrl: p?.avatarUrl } }));
        })
        .catch(() => setProfileCache((prev) => ({ ...prev, [id]: { name: id } })));
    });
  }, [groupMembers]);

  useEffect(() => {
    loadMessages();
    loadGroupDetails();
    loadGroupMembers();
    loadPinnedMessages();
    socketService.joinGroup(groupId);
    socketService.queryActiveGroupCall(groupId);
    setTimeout(() => socketService.queryActiveGroupCall(groupId), 500);
    socketService.markGroupAsRead(groupId);

    // Also hit the API to clear unread counts on server
    apiClient.put(`/chat/groups/${groupId}/read`).catch(e => console.error('Failed to mark group as read', e));

    // Fix Android keyboard auto-pop issue
    if (Platform.OS === 'android') {
      setTimeout(() => {
        Keyboard.dismiss();
      }, 500);
    }

    const handleMessageUpdated = (payload: any) => {
      if (payload.groupId === groupId) {
        useGroupStore.getState().updateGroupMessage(groupId, payload.messageId, payload.content);
      }
    };
    socketService.socket?.on('group_message_updated', handleMessageUpdated);

    // Extra reaction listeners for alternative server event names
    const handleGroupReaction = ({ messageId, groupId: gId, reactions }: any) => {
      if (gId === groupId) {
        useGroupStore.getState().updateGroupReactions(groupId, messageId, reactions);
      }
    };
    socketService.socket?.on('group_reaction', handleGroupReaction);
    socketService.socket?.on('group_reaction_updated', handleGroupReaction);
    socketService.socket?.on('reaction_updated', handleGroupReaction);

    return () => {
      socketService.socket?.off('group_message_updated', handleMessageUpdated);
      socketService.socket?.off('group_reaction', handleGroupReaction);
      socketService.socket?.off('group_reaction_updated', handleGroupReaction);
      socketService.socket?.off('reaction_updated', handleGroupReaction);
    };
  }, [groupId]);

  // Re-join socket room and re-query active call every time screen is focused
  useFocusEffect(
    useCallback(() => {
      socketService.joinGroup(groupId);
      socketService.queryActiveGroupCall(groupId);
    }, [groupId])
  );

  // Listen directly for call-related events in this screen
  // This is more reliable than relying solely on socketService singleton during hot-reload
  useEffect(() => {
    const socket = socketService.socket;
    if (!socket) return;

    const onCallEnded = (data: any) => {
      if (data?.groupId === groupId) {
        console.log('[GroupChatScreen] group_call_ended for this group → clearing Join button');
        useGroupCallStore.getState().setActiveCallInfo(groupId, null);
      }
    };

    const onActiveCallStatus = (data: any) => {
      if (data?.groupId !== groupId) return;
      if (data.active && data.callId && data.callType) {
        useGroupCallStore.getState().setActiveCallInfo(groupId, {
          groupId,
          callId: data.callId,
          callType: data.callType,
          startedAt: new Date(),
          callerId: data.callerName || '',
        });
      } else {
        console.log('[GroupChatScreen] group_active_call_status active=false → clearing Join button');
        useGroupCallStore.getState().setActiveCallInfo(groupId, null);
      }
    };

    socket.on('group_call_ended', onCallEnded);
    socket.on('group_active_call_status', onActiveCallStatus);

    return () => {
      socket.off('group_call_ended', onCallEnded);
      socket.off('group_active_call_status', onActiveCallStatus);
    };
  }, [groupId]);

  // Poll server every 5s while Join button is showing to detect when call ends
  // This is a reliable fallback in case group_call_ended socket event is missed
  useEffect(() => {
    if (!activeCall) return;
    const callId = activeCall.callId;
    const timer = setInterval(() => {
      socketService.queryActiveGroupCall(groupId);
    }, 5000);
    return () => clearInterval(timer);
  }, [activeCall?.callId, groupId]);

  const handleSend = async () => {
    if (!content.trim() && !draftImage) return;
    const payloadContent = content;
    const mentions = groupMembers
      .filter(m => payloadContent.includes(`@${m.user?.fullName || m.userId}`))
      .map(m => m.userId);

    if (draftImage) {
      setUploading(true);
      try {
        if (payloadContent.trim()) {
          await apiClient.post(`/chat/groups/${groupId}/messages`, {
            content: payloadContent,
            type: 'TEXT',
            replyToId: replyingTo?.messageId || replyingTo?.id || replyingTo?.message_id,
            mentions
          });
          setContent('');
        }
        const imageReplyToId = replyingTo?.messageId || replyingTo?.id || replyingTo?.message_id;
        // If it's a local URI (edited image), upload it first
        let imageUrl = draftImage.uri;
        if (draftImage.uri.startsWith('file://') || draftImage.uri.startsWith('/')) {
          const formData = new FormData();
          const filename = draftImage.uri.split('/').pop() || 'image.jpg';
          const ext = filename.split('.').pop() || 'jpg';
          // @ts-ignore
          formData.append('file', { uri: draftImage.uri, name: filename, type: `image/${ext}` });
          const uploadRes = await apiClient.post('/chat/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          imageUrl = uploadRes.data?.url || draftImage.uri;
        }
        await apiClient.post(`/chat/groups/${groupId}/messages`, {
          content: imageUrl,
          type: 'IMAGE',
          replyToId: imageReplyToId || null
        });
        setDraftImage(null);
        setReplyingTo(null);
      } catch (e) {
        Alert.alert('Lỗi', 'Không thể gửi ảnh');
      } finally {
        setUploading(false);
      }
      return;
    }

    setContent('');
    setShowMentions(false);

    if (isEditing && editingMsgId) {
      try {
        await apiClient.put(`/chat/groups/${groupId}/messages/${editingMsgId}`, { content: payloadContent.trim() });
        setIsEditing(false);
        setEditingMsgId(null);
        setContent('');
      } catch (e) {
        Alert.alert('Lỗi', 'Không thể sửa tin nhắn');
      }
      return;
    }

    try {
      // --- Optimistic update: show message immediately without waiting for socket ---
      const tempId = `temp_${Date.now()}`;
      const optimisticMsg: any = {
        messageId: tempId,
        groupId,
        senderId: user?.id,
        type: 'TEXT',
        content: payloadContent,
        recalled: false,
        isSystem: false,
        createdAt: new Date().toISOString(),
        reactions: {},
        sender: { fullName: user?.fullName, avatarUrl: user?.avatarUrl },
        replyTo: replyingTo || undefined,
      };
      addGroupMessage(groupId, optimisticMsg);
      setReplyingTo(null);

      const res = await apiClient.post(`/chat/groups/${groupId}/messages`, {
        content: payloadContent,
        type: 'TEXT',
        replyToId: replyingTo?.messageId || replyingTo?.id || replyingTo?.message_id,
        mentions
      });

      // Replace the temp message with the real one from server response
      const realMsg = res.data?.data || res.data;
      if (realMsg && realMsg.messageId) {
        // Remove the temp message and let the real one from socket take over
        // The socket 'new_group_message' will add the real message; remove temp to avoid duplication
        useGroupStore.getState().deleteGroupMessage(groupId, tempId);
      }
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể gửi tin nhắn');
    }
  };

  const handleCreatePoll = async (question: string, options: string[], isMultiple: boolean) => {
    try {
      const res = await apiClient.post(`/chat/groups/${groupId}/polls`, {
        question,
        options,
        isMultiple
      });
      if (!res.data) throw new Error('No response');
    } catch (e: any) {
      Alert.alert('Lỗi', 'Không thể tạo bình chọn. Vui lòng thử lại.');
    }
  };

  const handleVote = async (pollId: string, optionId: string) => {
    const poll = useGroupStore.getState().polls[groupId]?.[pollId];
    if (!poll || !!poll.closedAt) return;

    setVotingMsgId(pollId);
    const myVote: string[] = poll.myVote || [];
    const isAlreadyVoted = myVote.includes(optionId);

    try {
      let updatedPoll;
      if (isAlreadyVoted) {
        if (!poll.isMultiple || myVote.length === 1) {
          const res = await apiClient.delete(`/chat/groups/${groupId}/polls/${pollId}/vote`);
          updatedPoll = res.data?.data || res.data;
        } else {
          const nextOptionIds = myVote.filter(id => id !== optionId);
          const res = await apiClient.post(`/chat/groups/${groupId}/polls/${pollId}/vote`, {
            optionIds: nextOptionIds
          });
          updatedPoll = res.data?.data || res.data;
        }
      } else {
        if (poll.isMultiple) {
          const nextOptionIds = [...myVote, optionId];
          const res = await apiClient.post(`/chat/groups/${groupId}/polls/${pollId}/vote`, {
            optionIds: nextOptionIds
          });
          updatedPoll = res.data?.data || res.data;
        } else {
          const res = await apiClient.post(`/chat/groups/${groupId}/polls/${pollId}/vote`, {
            optionIds: [optionId]
          });
          updatedPoll = res.data?.data || res.data;
        }
      }

      if (updatedPoll) {
        const finalPoll = {
          ...updatedPoll,
          myVote: isAlreadyVoted
            ? (poll.isMultiple ? myVote.filter(id => id !== optionId) : [])
            : (poll.isMultiple ? [...myVote, optionId] : [optionId])
        };
        useGroupStore.getState().upsertPoll(groupId, finalPoll);
      }
    } catch (e) {
      console.warn('Vote/Unvote failed', e);
    } finally {
      setVotingMsgId(null);
    }
  };

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') return;
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(recording);
      setIsRecording(true);
      setRecordingDuration(0);

      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) { console.error('Failed to start recording', err); }
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
    try { await recording.stopAndUnloadAsync(); } catch (err) { }
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
      const res = await uploadAudio(uri);
      if (res && res.success && res.url) {
        await apiClient.post(`/chat/groups/${groupId}/messages`, {
          content: res.url,
          type: 'AUDIO',
          replyToId: replyingTo?.messageId || replyingTo?.id || replyingTo?.message_id
        });
        setReplyingTo(null);
      }
    }
  };

  const handleUpload = async () => {
    setUploading(true);
    const results = await pickAndUploadImages();

    if (results.length === 1) {
      const result = results[0];
      if (result && result.success && result.url) {
        if (result.type === 'VIDEO') {
          await apiClient.post(`/chat/groups/${groupId}/messages`, {
            content: result.url,
            type: 'VIDEO',
            replyToId: replyingTo?.messageId || replyingTo?.id || replyingTo?.message_id
          });
        } else {
          setDraftImage({ uri: result.url, localUri: result.localUri || result.url });
        }
      }
      setUploading(false);
      return;
    }

    for (const result of results) {
      if (result && result.success && result.url) {
        await apiClient.post(`/chat/groups/${groupId}/messages`, {
          content: result.url,
          type: result.type,
          replyToId: replyingTo?.messageId || replyingTo?.id || replyingTo?.message_id
        });
      }
    }
    setReplyingTo(null);
    setUploading(false);
  };

  const handleEditorDone = async (uri: string, caption?: string) => {
    setEditorImage(null);
    setUploading(true);
    try {
      const formData = new FormData();
      // ImageManipulator always outputs JPEG; force jpeg MIME to avoid 'File type not allowed'
      const filename = 'edited_' + Date.now() + '.jpg';
      // @ts-ignore
      formData.append('file', { uri, name: filename, type: 'image/jpeg' });
      const uploadRes = await apiClient.post('/chat/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const imageUrl = uploadRes.data?.url;
      if (!imageUrl) throw new Error('No URL returned');

      // Auto-send image immediately after editing
      const replyToId = replyingTo?.messageId || replyingTo?.id || replyingTo?.message_id || null;
      if (caption?.trim()) {
        await apiClient.post(`/chat/groups/${groupId}/messages`, {
          content: caption,
          type: 'TEXT',
          replyToId
        });
      }
      await apiClient.post(`/chat/groups/${groupId}/messages`, {
        content: imageUrl,
        type: 'IMAGE',
        replyToId
      });
      setReplyingTo(null);
    } catch (error: any) {
      console.error('handleEditorDone error:', error?.response?.data || error);
      Alert.alert('Lỗi', 'Không thể gửi ảnh. Vui lòng thử lại.');
    } finally {
      setUploading(false);
    }
  };

  const handleAction = async (action: string) => {
    if (!selectedMessage) return;
    const msgId = selectedMessage.messageId || selectedMessage.id;

    switch (action) {
      case 'reply':
        setReplyingTo(selectedMessage);
        break;
      case 'forward':
        const member = groupMembers.find(m => m.userId === selectedMessage.senderId);
        const senderName = member?.nickname || profileCache[selectedMessage.senderId]?.name || selectedMessage.sender?.fullName || 'Thành viên';
        setSelectedMessage({
          ...selectedMessage,
          resolvedSenderName: selectedMessage.senderId === user?.id ? 'Bạn' : senderName
        });
        setShowForwardModal(true);
        break;
      case 'copy':
        import('expo-clipboard').then(({ setStringAsync }) => {
          setStringAsync(selectedMessage.content);
        });
        break;
      case 'recall':
        apiClient.put(`/chat/groups/${groupId}/messages/${msgId}/recall`)
          .then(() => useGroupStore.getState().recallGroupMessage(groupId, msgId))
          .catch(e => console.error('Recall error:', e));
        break;
      case 'delete':
        apiClient.delete(`/chat/groups/${groupId}/messages/${msgId}`)
          .then(() => useGroupStore.getState().deleteGroupMessage(groupId, msgId));
        break;
      case 'pin':
        apiClient.post(`/chat/groups/${groupId}/messages/${msgId}/pin`)
          .then((res) => {
            const pin = res.data?.data;
            if (pin) {
              useGroupStore.getState().addPin(groupId, pin);
            }
          })
          .catch(e => console.error('Pin error:', e));
        break;
      case 'unpin':
        apiClient.delete(`/chat/groups/${groupId}/messages/${msgId}/pin`)
          .then(() => {
            useGroupStore.getState().removePin(groupId, msgId);
          })
          .catch(e => console.error('Unpin error:', e));
        break;
      case 'edit':
        setIsEditing(true);
        setEditingMsgId(msgId);
        setContent(selectedMessage.content);
        break;
      case 'info':
        setShowMessageDetails(true);
        break;
    }
  };

  const handleReaction = (emoji: string) => {
    if (!selectedMessage) return;
    const msgId = selectedMessage.messageId || selectedMessage.id;

    // 1. Optimistic update — update UI immediately without waiting for server
    const currentReactions = selectedMessage.reactions || {};
    const currentUsers: string[] = Array.isArray(currentReactions[emoji]) ? currentReactions[emoji] : [];
    const userId = user?.id || '';
    const alreadyReacted = currentUsers.includes(userId);
    const newUsers = alreadyReacted
      ? currentUsers.filter((id: string) => id !== userId)  // toggle off
      : [...currentUsers, userId];  // toggle on
    const newReactions = { ...currentReactions, [emoji]: newUsers };
    useGroupStore.getState().updateGroupReactions(groupId, msgId, newReactions);

    // 2. Emit socket event
    socketService.socket?.emit('add_group_reaction', {
      groupId,
      messageId: msgId,
      emoji,
      reaction: emoji
    });

    // 3. REST API fallback in case socket doesn't trigger a response
    apiClient.post(`/chat/groups/${groupId}/messages/${msgId}/reactions`, { emoji })
      .catch(() => {/* silent — socket will handle it if API fails */ });
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

  const renderReadReceipts = (messageId: string, index: number) => {
    // Only fetch the last message from ME that is NOT recalled
    const lastMine = [...groupMessages].slice().reverse().find((m) => m.senderId === user?.id && !m.recalled);

    // Only show the receipt block if THIS message is the last one I sent
    if (!lastMine || lastMine.messageId !== messageId) return null;

    const readers = useGroupStore.getState().groupReadState[groupId] || [];
    if (!readers) return null;

    const readerIds = [...readers].filter((uid) => uid !== user?.id);
    if (readerIds.length === 0) return null;

    return (
      <View className="flex-row justify-end items-center mr-1 mt-1 flex-wrap">
        <View className="flex-row -space-x-1.5 mr-1">
          {readerIds.slice(0, 5).map((uid) => {
            const member = groupMembers.find(m => m.userId === uid);
            const p = profileCache[uid];
            const avatarUrl = p?.avatarUrl;
            const name = member?.nickname || p?.name || uid;

            return avatarUrl ? (
              <Image
                key={uid}
                source={{ uri: avatarUrl }}
                className="w-4 h-4 rounded-full border border-white"
              />
            ) : (
              <View
                key={uid}
                className="w-4 h-4 rounded-full bg-gray-300 items-center justify-center border border-white"
              >
                <Text className="text-[7px] font-bold text-white">
                  {name.charAt(0).toUpperCase()}
                </Text>
              </View>
            );
          })}
        </View>
        {readerIds.length > 5 && (
          <Text className="text-[9px] text-gray-400 font-bold mr-1">+{readerIds.length - 5}</Text>
        )}
        <Text className="text-[9px] text-gray-400">Đã xem</Text>
      </View>
    );
  };

  const renderCall = (content: string, isMe: boolean) => {
    let data;
    try { data = JSON.parse(content); } catch { data = null; }

    if (data && data.callType) {
      const isVideo = data.callType === 'video';
      const isMissed = data.status === 'missed';
      const Icon = isMissed ? PhoneMissed : isVideo ? Video : Phone;
      const label = isMissed ? (isVideo ? 'Video nhóm nhỡ' : 'Thoại nhóm nhỡ') : (isVideo ? 'Gọi video nhóm' : 'Gọi thoại nhóm');

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
                {isMissed ? 'Không phản hồi' : `${Math.floor((data.duration || 0) / 60)}m ${(data.duration || 0) % 60}s`}
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
    }

    // Fallback for simple text string
    const isEnd = content.includes('Kết thúc') || content.includes('nhỡ') || content.includes('ended');
    return (
      <View className={`flex-row items-center px-4 py-3 rounded-[18px] border shadow-sm min-w-[160px] ${isMe ? 'bg-orange-400 border-orange-500/20' : 'bg-white border-gray-100'}`}>
        <View className={`w-8 h-8 rounded-full items-center justify-center mr-2 ${isEnd ? 'bg-gray-100' : 'bg-green-100'}`}>
          <Phone size={14} color={isEnd ? '#9ca3af' : '#10b981'} />
        </View>
        <Text className={`text-[12px] font-bold ${isMe ? 'text-white' : 'text-secondary'}`}>{content.slice(0, 30)}</Text>
      </View>
    );
  };

  const renderInvoice = (content: string, isMe: boolean) => {
    return (
      <View className={`p-4 rounded-2xl ${isMe ? 'bg-white/10' : 'bg-orange-50'} border border-orange-100 min-w-[200px]`}>
        <View className="flex-row items-center mb-2">
          <FileText size={18} color={COLORS.primary} />
          <Text className={`ml-2 font-bold text-sm ${isMe ? 'text-white' : 'text-secondary'}`}>Hóa đơn thanh toán</Text>
        </View>
        <Text className={`text-[12px] mb-3 ${isMe ? 'text-white/80' : 'text-gray-600'}`}>{content}</Text>
        <TouchableOpacity className="bg-primary py-2 rounded-xl items-center">
          <Text className="text-white text-[11px] font-black uppercase tracking-widest">Chi tiết</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderFile = (content: string, fallbackName: string, isMe: boolean) => {
    let fileUrl = content;
    let fileName = fallbackName;
    try {
      const data = JSON.parse(content);
      if (data.url) fileUrl = data.url;
      if (data.name) fileName = data.name;
    } catch (e) {
      // It's a plain string URL
    }

    return (
      <TouchableOpacity
        onPress={() => Linking.openURL(fileUrl)}
        className={`flex-row items-center p-3 rounded-2xl border ${isMe ? 'bg-primary border-orange-600' : 'bg-gray-50 border-gray-100 shadow-sm'} min-w-[200px]`}
      >
        <View className={`w-10 h-10 rounded-xl items-center justify-center ${isMe ? 'bg-white/20' : 'bg-orange-50'}`}>
          <FileText size={20} color={isMe ? '#fff' : COLORS.primary} />
        </View>
        <View className="ml-3 flex-1">
          <Text className={`text-[13px] font-bold ${isMe ? 'text-white' : 'text-secondary'}`} numberOfLines={1}>{fileName || 'Tài liệu PDF'}</Text>
          <Text className={`text-[10px] ${isMe ? 'text-white/80' : 'text-gray-400'}`}>Nhấn để mở tệp</Text>
        </View>
        <Download size={16} color={isMe ? '#fff' : '#9ca3af'} />
      </TouchableOpacity>
    );
  };



  const renderReminder = (item: any, isMe: boolean) => {
    let reminderData: any = {};
    try {
      reminderData = typeof item.content === 'string' ? JSON.parse(item.content) : item.content;
    } catch (e) {
      reminderData = { title: item.content };
    }

    const { reminderId, title, remindAt, participants = [], fired } = reminderData;
    const dateFormatted = remindAt ? dayjs(remindAt).format('DD/MM/YYYY HH:mm') : 'Chưa thiết lập';
    const isDone = reminderData.done;

    return (
      <View
        className={`rounded-2xl p-4 min-w-[240px] max-w-[280px] bg-white border border-orange-100 shadow-sm ${isMe ? 'self-end' : 'self-start'
          }`}
      >
        {/* Card Header */}
        <View className="flex-row items-center border-b border-orange-50/50 pb-2 mb-2">
          <View className="w-7 h-7 rounded-full bg-orange-50 items-center justify-center mr-2">
            <Bell size={14} color="#f97316" />
          </View>
          <View className="flex-1">
            <Text className="text-[11px] font-bold text-orange-500 uppercase tracking-wider">
              {fired ? '⏰ Báo thức nhắc nhở' : '📅 Lịch hẹn nhóm'}
            </Text>
          </View>
        </View>

        {/* Card Body */}
        <Text className="text-sm font-bold text-secondary mb-2" numberOfLines={3}>
          {title || 'Nhắc hẹn'}
        </Text>

        <View className="flex-row items-center mb-1.5">
          <Clock size={12} color="#6b7280" className="mr-1.5" />
          <Text className="text-xs text-gray-500 font-semibold">{dateFormatted}</Text>
        </View>

        {participants.length > 0 && (
          <View className="flex-row items-center mb-3">
            <GroupIcon size={12} color="#6b7280" className="mr-1.5" />
            <Text className="text-[11px] text-gray-500 font-medium" numberOfLines={1}>
              {participants.includes(user?.id)
                ? `Có bạn và ${participants.length - 1} người khác`
                : `${participants.length} thành viên tham gia`}
            </Text>
          </View>
        )}

        {/* Status indicator */}
        <View className="flex-row items-center justify-between mt-2 pt-2 border-t border-gray-50">
          <View className={`px-2 py-0.5 rounded-full ${fired
              ? 'bg-red-50'
              : isDone
                ? 'bg-gray-100'
                : 'bg-green-50'
            }`}>
            <Text className={`text-[10px] font-bold ${fired
                ? 'text-red-500'
                : isDone
                  ? 'text-gray-400'
                  : 'text-green-500'
              }`}>
              {fired ? 'Đã diễn ra' : isDone ? 'Đã hoàn thành' : 'Sắp diễn ra'}
            </Text>
          </View>

          {/* Action buttons */}
          {!fired && !isDone && (
            <TouchableOpacity
              onPress={async () => {
                try {
                  await apiClient.put(`/chat/groups/${groupId}/reminders/${reminderId}/done`);
                  Alert.alert('Thành công', 'Đã đánh dấu nhắc hẹn hoàn thành!');
                } catch (e: any) {
                  Alert.alert('Thông báo', e?.response?.data?.error || 'Bạn không có quyền thực hiện tác vụ này.');
                }
              }}
              className="bg-orange-500 rounded-lg px-2.5 py-1"
            >
              <Text className="text-white text-[10px] font-bold">Xong</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderPoll = (item: any, isMe: boolean) => {
    const pollId = item.content;
    const poll = polls[pollId];
    if (!poll) {
      return (
        <View className="p-4 bg-gray-50 rounded-xl items-center">
          <ActivityIndicator size="small" color={COLORS.primary} />
        </View>
      );
    }

    const totalVotes = (poll.options || []).reduce((acc: number, o: any) => acc + (o.voteCount || 0), 0);
    const myVotes = poll.myVote || [];

    const getOptionText = (text: any) => {
      if (!text) return '';
      if (typeof text === 'string') {
        const trimmed = text.trim();
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
          try {
            const parsed = JSON.parse(trimmed);
            if (parsed && typeof parsed.text === 'string') {
              return parsed.text;
            }
          } catch (e) { }
        }
        return text;
      }
      if (typeof text === 'object') {
        return text.text || text.label || JSON.stringify(text);
      }
      return String(text);
    };

    return (
      <TouchableOpacity
        onLongPress={() => { setSelectedMessage(item); setShowActionModal(true); }}
        delayLongPress={200}
        activeOpacity={0.9}
        className="p-5 rounded-[28px] border border-gray-100 bg-white min-w-[270px]"
        style={{
          shadowColor: '#cbd5e1',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 3,
        }}
      >
        <View className="flex-row items-center mb-4">
          <View className="p-2.5 rounded-2xl bg-orange-50">
            <ClipboardList size={22} color={COLORS.primary} />
          </View>
          <View className="ml-3 flex-1">
            <Text className="font-extrabold text-base leading-tight text-secondary">{poll.question}</Text>
            <Text className="text-[10px] mt-0.5 font-bold uppercase tracking-wider text-orange-500">
              {poll.isMultiple ? 'Chọn nhiều' : 'Chọn một'}
            </Text>
          </View>
        </View>

        {(poll.options || []).map((opt: any) => {
          const percent = totalVotes > 0 ? Math.round((opt.voteCount || 0) / totalVotes * 100) : 0;
          const isVoted = myVotes.includes(opt.optionId);

          return (
            <TouchableOpacity
              key={opt.optionId}
              onPress={() => handleVote(pollId, opt.optionId)}
              disabled={!!poll.closedAt || votingMsgId === pollId}
              className={`mb-3 p-3.5 rounded-2xl border ${isVoted
                ? 'bg-orange-50/50 border-orange-200'
                : 'bg-gray-50 border-gray-100/50'
                }`}
            >
              <View className="flex-row justify-between items-center mb-2">
                <View className="flex-row items-center flex-1">
                  <Text className="text-sm font-bold text-gray-800 mr-2">
                    {getOptionText(opt.text)}
                  </Text>
                  {isVoted && <CheckCircle2 size={14} color="#f97316" />}
                </View>
                <Text className="text-xs font-black text-orange-500">{percent}%</Text>
              </View>

              <View className="h-2 w-full bg-gray-200/40 rounded-full overflow-hidden">
                <View
                  style={{ width: `${percent}%` }}
                  className={`h-full rounded-full ${isVoted ? 'bg-orange-500' : 'bg-gray-300'}`}
                />
              </View>

              <View className="flex-row justify-between items-center mt-2.5">
                <View className="flex-row -space-x-1.5 transform scale-90 origin-left">
                  {[1, 2, 3].slice(0, opt.voteCount).map(i => (
                    <View key={i} className="w-4 h-4 rounded-full bg-gray-200 border border-white" />
                  ))}
                </View>
                <Text className="text-[9px] font-extrabold text-gray-400">
                  {opt.voteCount || 0} bình chọn
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}

        <View className="mt-2 pt-4 border-t border-gray-100 flex-row justify-between items-center">
          <View>
            <Text className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              {poll.closedAt ? 'Đã kết thúc' : `${totalVotes} người đã bình chọn`}
            </Text>
          </View>
          {!poll.closedAt && (
            <View className="bg-orange-500 px-3 py-1 rounded-full">
              <Text className="text-[9px] text-white font-extrabold uppercase">Đang mở</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderTextWithMentions = (text: string, isMe: boolean, isEdited?: boolean) => {
    if (!text) return null;
    const parts = text.split(/(@[\w\s]+)/g);
    return (
      <Text className={`text-[13px] leading-5 ${isMe ? 'text-white font-medium' : 'text-secondary font-medium'}`}>
        {parts.map((part, i) => {
          if (part.startsWith('@')) {
            return (
              <Text key={i} className={isMe ? 'text-orange-200 font-black' : 'text-orange-500 font-black'}>
                {part}
              </Text>
            );
          }
          return part;
        })}
        {isEdited && <Text className={`text-[9px] italic ${isMe ? 'text-white/50' : 'text-gray-400'}`}> (đã sửa)</Text>}
      </Text>
    );
  };

  const renderTextWithSearchHighlight = (text: string, isMe: boolean, isEdited?: boolean) => {
    if (!text) return null;
    if (!searchQuery) return renderTextWithMentions(text, isMe, isEdited);

    const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
    return (
      <Text className={`text-[13px] leading-5 ${isMe ? 'text-white font-medium' : 'text-secondary font-medium'}`}>
        {parts.map((part, i) => {
          if (part.toLowerCase() === searchQuery.toLowerCase()) {
            return <Text key={i} className="bg-yellow-300 text-black">{part}</Text>;
          }
          return part;
        })}
        {isEdited && <Text className={`text-[9px] italic ${isMe ? 'text-white/50' : 'text-gray-400'}`}> (đã sửa)</Text>}
      </Text>
    );
  };

  const renderVoucherBubble = (contentStr: string, isMe: boolean) => {
    return (
      <VoucherBubble
        contentStr={contentStr}
        isMe={isMe}
      />
    );
  };

  const renderMessage = ({ item, index }: { item: any, index: number }) => {
    const isRecalled = item.recalled || item.isRecalled;

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

    const isMe = item.senderId === user?.id;
    const isSystem = item.type === 'SYSTEM' || item.isSystem;

    if (isSystem) {
      let displayContent = item.content;
      try {
        if (typeof item.content === 'string' && item.content.trim().startsWith('{')) {
          const parsed = JSON.parse(item.content);
          if (parsed.action) {
            const resolveName = (uid: string) => {
              if (uid === user?.id) return 'Bạn';
              const member = groupMembers.find(m => m.userId === uid);
              return member?.nickname || profileCache[uid]?.name || uid;
            };

            const userDisplayName = resolveName(parsed.userId);
            const actorDisplayName = parsed.actorId ? resolveName(parsed.actorId) : '';

            if (parsed.action === 'MEMBER_ADDED') {
              if (actorDisplayName && actorDisplayName !== userDisplayName) {
                displayContent = `${actorDisplayName} đã thêm ${userDisplayName} vào nhóm`;
              } else {
                displayContent = `${userDisplayName} đã tham gia nhóm`;
              }
            } else if (parsed.action === 'MEMBER_LEFT' || parsed.action === 'LEAVE') {
              displayContent = `${userDisplayName} đã rời khỏi nhóm`;
            } else if (parsed.action === 'MEMBER_KICKED' || parsed.action === 'KICK') {
              displayContent = `${actorDisplayName || 'Quản trị viên'} đã mời ${userDisplayName} ra khỏi nhóm`;
            } else if (parsed.action === 'GROUP_RENAMED' || parsed.action === 'RENAME') {
              displayContent = `${actorDisplayName || 'Thành viên'} đã đổi tên nhóm`;
            }
          }
        }
      } catch (e) {
        // Fallback to original content
      }

      return (
        <View className="items-center my-3 px-4">
          <View className="bg-gray-200/60 rounded-full px-4 py-1.5">
            <Text className="text-[11px] text-gray-500 font-medium text-center">{displayContent}</Text>
          </View>
        </View>
      );
    }

    const nextMsg = groupMessages[index - 1];
    const isLastInGroup = !nextMsg || nextMsg.senderId !== item.senderId;
    const isNextConsecutive = nextMsg &&
      nextMsg.senderId === item.senderId &&
      Math.abs(dayjs(nextMsg.createdAt).diff(dayjs(item.createdAt), 'minute')) < 5;
    const showTime = !isNextConsecutive;
    const isBubbleless = ['IMAGE', 'VIDEO', 'AUDIO', 'VOICE', 'STICKER', 'GIF', 'POLL', 'INVOICE', 'FILE', 'PDF', 'CALL', 'REMINDER', 'VOUCHER'].includes(item.type);

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
        <View className={`flex-row items-center ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
          {!isMe && (
            <View className="w-9 mr-2">
              {isLastInGroup && (
                <View className="w-9 h-9 rounded-full bg-orange-100 items-center justify-center border border-orange-200 overflow-hidden">
                  {profileCache[item.senderId]?.avatarUrl ? (
                    <Image source={{ uri: profileCache[item.senderId].avatarUrl }} className="w-full h-full" />
                  ) : (
                    <Text className="text-primary text-[12px] font-bold">
                      {(profileCache[item.senderId]?.name || item.sender?.fullName || item.senderId || 'U').charAt(0).toUpperCase()}
                    </Text>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Bubbleless and standard bubbles wrapped in a single container */}
          <View className="max-w-[75%]">
            {item.isForwarded && (
              <View className={`flex-row items-center mb-1 px-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                <Text className="text-[11px] text-gray-400 mr-1">➡</Text>
                <Text className="text-[11px] text-gray-400 font-medium">
                  {(() => {
                    const member = groupMembers.find(m => m.userId === item.senderId);
                    const currentSender = isMe ? 'Bạn' : (member?.nickname || member?.user?.fullName || item.sender?.fullName || 'Thành viên');
                    const originalSender = item.forwardedFrom;
                    if (!originalSender || originalSender === currentSender) {
                      return `${currentSender} đã chuyển tiếp một tin nhắn`;
                    }
                    return `${currentSender} đã chuyển tiếp tin nhắn từ ${originalSender}`;
                  })()}
                </Text>
              </View>
            )}

            {/* Bubbleless types: show content without any wrapper */}
            {!item.recalled && isBubbleless ? (
              <View className="w-full">


                {/* Reply preview - separate bubble above main message, like the screenshot */}
                {item.replyTo && (
                  <View className={`mb-1 ${isMe ? 'items-end' : 'items-start'}`}>
                    <View
                      style={{
                        backgroundColor: isMe ? 'rgba(251,146,60,0.15)' : '#f3f4f6',
                        borderWidth: 1,
                        borderColor: isMe ? 'rgba(251,146,60,0.4)' : '#e5e7eb',
                        borderRadius: 14,
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        maxWidth: '90%',
                        flexDirection: 'row',
                        alignItems: 'center',
                      }}
                    >
                      <Text
                        numberOfLines={1}
                        style={{ fontSize: 11, color: isMe ? '#c2410c' : '#6b7280' }}
                      >
                        <Text style={{ fontWeight: '700', color: isMe ? '#ea580c' : '#374151' }}>
                          {(() => {
                            const senderId = item.replyTo.senderId || item.replyTo.sender?.id;
                            const member = groupMembers.find(m => m.userId === senderId);
                            return member?.nickname || profileCache[senderId]?.name ||
                              item.replyTo.sender?.fullName || item.replyTo.senderName || 'Người dùng';
                          })()}
                        </Text>
                        {': '}
                        {item.replyTo.type && ['IMAGE', 'VIDEO', 'AUDIO', 'VOICE', 'FILE', 'PDF'].includes(item.replyTo.type)
                          ? `[đính kèm]`
                          : (item.replyTo.content?.slice(0, 60) || 'Tin nhắn')}
                      </Text>
                    </View>
                  </View>
                )}

                {item.type === 'IMAGE' || item.type === 'VIDEO' || item.type === 'STICKER' || item.type === 'GIF' ? (
                  <TouchableOpacity
                    onPress={() => item.type === 'IMAGE' ? setPreviewImage(item.content) : item.type === 'VIDEO' ? setPreviewVideo(item.content) : null}
                    onLongPress={() => { setSelectedMessage(item); setShowActionModal(true); }}
                    delayLongPress={200}
                    activeOpacity={0.8}
                  >
                    {item.type === 'IMAGE' ? (
                      <Image source={{ uri: item.content }} className="w-52 h-52 rounded-2xl" resizeMode="cover" />
                    ) : item.type === 'VIDEO' ? (
                      <View className="w-52 h-52 rounded-2xl bg-black items-center justify-center relative overflow-hidden">
                        <Image source={{ uri: item.content }} className="w-full h-full opacity-60" resizeMode="cover" />
                        <View className="absolute bg-black/40 p-3 rounded-full border border-white/20">
                          <Play size={24} color="#fff" fill="#fff" />
                        </View>
                      </View>
                    ) : (
                      <Image source={{ uri: item.content }} className="w-40 h-40" resizeMode="contain" />
                    )}
                  </TouchableOpacity>
                ) : item.type === 'AUDIO' || item.type === 'VOICE' ? (
                  <View>
                    <AudioPlayer url={item.content} isMe={isMe} />
                  </View>
                ) : item.type === 'POLL' ? (
                  renderPoll(item, isMe)
                ) : item.type === 'REMINDER' ? (
                  renderReminder(item, isMe)
                ) : item.type === 'INVOICE' ? (
                  <TouchableOpacity
                    onLongPress={() => { setSelectedMessage(item); setShowActionModal(true); }}
                    delayLongPress={200}
                    activeOpacity={0.9}
                  >
                    {renderInvoice(item.content, isMe)}
                  </TouchableOpacity>
                ) : (item.type === 'FILE' || item.type === 'PDF') ? (
                  <View>
                    {renderFile(item.content, item.name || item.filename || 'Tài liệu', isMe)}
                  </View>
                ) : item.type === 'CALL' ? (
                  <TouchableOpacity
                    onPress={() => {
                      if (useChatStore.getState().call.callStatus !== 'idle' || useGroupCallStore.getState().status !== 'idle') return;
                      let callData;
                      try { callData = JSON.parse(item.content); } catch {}
                      if (callData) {
                        navigation.navigate('GroupVideoCallModal', {
                          groupId,
                          callType: callData.callType || 'audio',
                          groupName
                        });
                      }
                    }}
                    onLongPress={() => { setSelectedMessage(item); setShowActionModal(true); }}
                    delayLongPress={200}
                    activeOpacity={0.9}
                  >
                    {renderCall(item.content, isMe)}
                  </TouchableOpacity>
                ) : item.type === 'VOUCHER' ? (
                  renderVoucherBubble(item.content, isMe)
                ) : null}

                {showTime && (
                  <View className={`flex-row mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <Text className="text-[9px] text-gray-400 font-bold">{dayjs(item.createdAt).format('HH:mm')}</Text>
                  </View>
                )}
              </View>
            ) : (
              /* Bubble wrapper for text and recalled */
              <View className="w-full">

                <TouchableOpacity
                  onLongPress={() => { setSelectedMessage(item); setShowActionModal(true); }}
                  activeOpacity={0.8}
                  className={`w-full min-w-[85px] px-4 py-3 rounded-[22px] shadow-sm ${item.recalled
                    ? (isMe ? 'bg-orange-200/60 rounded-tr-none' : 'bg-gray-100 rounded-tl-none border border-gray-100')
                    : isMe
                      ? 'bg-orange-400 rounded-tr-none shadow-orange-400/20'
                      : 'bg-white rounded-tl-none border border-gray-100 shadow-gray-200/50'
                    }`}
                >

                  {/* Reply bubble - separate pill above the text bubble */}
                  {item.replyTo && (
                    <View
                      style={{
                        backgroundColor: isMe ? 'rgba(251,146,60,0.15)' : '#f3f4f6',
                        borderWidth: 1,
                        borderColor: isMe ? 'rgba(251,146,60,0.4)' : '#e5e7eb',
                        borderRadius: 14,
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        marginBottom: 6,
                        maxWidth: '100%',
                      }}
                    >
                      <Text numberOfLines={1} style={{ fontSize: 11 }}>
                        <Text style={{ fontWeight: '700', color: isMe ? '#ea580c' : '#374151' }}>
                          {(() => {
                            const senderId = item.replyTo.senderId || item.replyTo.sender?.id;
                            const member = groupMembers.find(m => m.userId === senderId);
                            return member?.nickname || profileCache[senderId]?.name ||
                              item.replyTo.sender?.fullName || item.replyTo.senderName || 'Người dùng';
                          })()}
                        </Text>
                        <Text style={{ color: isMe ? '#c2410c' : '#6b7280' }}>
                          {': '}
                          {item.replyTo.type && ['IMAGE', 'VIDEO', 'AUDIO', 'VOICE', 'FILE', 'PDF'].includes(item.replyTo.type)
                            ? '[\u0111ính kèm]'
                            : (item.replyTo.content?.slice(0, 60) || 'Tin nhắn')}
                        </Text>
                      </Text>
                    </View>
                  )}

                  {item.recalled ? (
                    <Text className={`text-[13px] italic ${isMe ? 'text-orange-700/70' : 'text-gray-400'}`}>
                      Tin nhắn đã thu hồi
                    </Text>
                  ) : (
                    renderTextWithSearchHighlight(item.content, isMe, item.isEdited || item.edited)
                  )}

                  {showTime && (
                    <View className={`flex-row mt-1.5 items-center ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <TouchableOpacity onPress={() => setReplyingTo(item)} className="mr-2 opacity-50">
                        <Reply size={10} color={isMe ? '#fff' : COLORS.secondary} />
                      </TouchableOpacity>
                      <Text className={`text-[9px] ${isMe ? 'text-white/70' : 'text-gray-400'} font-bold`}>
                        {dayjs(item.createdAt).format('HH:mm')}
                      </Text>
                    </View>
                  )}

                  {/* Reactions - same pattern as ChatScreen */}
                  {item.reactions && typeof item.reactions === 'object' && Object.keys(item.reactions).length > 0 && (
                    <View className={`flex-row flex-wrap mt-1 gap-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                      {Object.entries(item.reactions).map(([emoji, users]: [string, any]) => {
                        const count = Array.isArray(users) ? users.length : (typeof users === 'number' ? users : 0);
                        if (count === 0) return null;
                        return (
                          <View key={emoji} className="flex-row items-center bg-white border border-gray-100 rounded-full px-1.5 py-0.5 shadow-sm">
                            <Text className="text-[10px]">{emoji}</Text>
                            {count > 1 && <Text className="text-[9px] text-gray-500 ml-0.5">{count}</Text>}
                          </View>
                        );
                      })}
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>

          {!item.recalled && !item.isRecalled && (
            <TouchableOpacity
              onPress={() => {
                const member = groupMembers.find(m => m.userId === item.senderId);
                const senderName = member?.nickname || profileCache[item.senderId]?.name || item.sender?.fullName || 'Thành viên';
                const enriched = {
                  ...item,
                  resolvedSenderName: item.senderId === user?.id ? 'Bạn' : senderName
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
        {renderReadReceipts(item.messageId || item.id, index)}
      </View>
    </View>
  );
};

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : (isKeyboardVisible ? 'padding' : undefined)}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 25}
        className="flex-1"
      >
        {/* Header - Fixed Title Area */}
        <View className="bg-white px-5 py-3.5 flex-row items-center justify-between border-b border-gray-50 z-20 shadow-sm">
          <View className="flex-row items-center flex-1">
            <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
              <ChevronLeft size={24} color={COLORS.secondary} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowGroupInfo(true)}
              className="flex-row items-center flex-1"
            >
              <View className="w-10 h-10 rounded-2xl bg-orange-50 items-center justify-center overflow-hidden border border-orange-100">
                {groupAvatar ? (
                  <Image source={{ uri: groupAvatar }} className="w-full h-full" />
                ) : (
                  <GroupIcon size={20} color={COLORS.primary} />
                )}
              </View>
              <View className="ml-3">
                <Text className="text-[15px] font-black text-secondary" numberOfLines={1}>{groupName || 'Nhóm Chat'}</Text>
                <Text className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{(groupMembers || []).length} thành viên</Text>
              </View>
            </TouchableOpacity>
          </View>

          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => setIsSearching(!isSearching)} className="p-2">
              <Search size={22} color={isSearching ? COLORS.primary : COLORS.secondary} />
            </TouchableOpacity>

            {/* Join active call or start new call */}
            {activeCall && groupCallStatus === 'idle' ? (
              <TouchableOpacity
                onPress={() => {
                  navigation.navigate('GroupVideoCallModal', {
                    groupId,
                    callType: activeCall.callType,
                    groupName,
                    callId: activeCall.callId,
                    isJoining: true
                  });
                }}
                className="flex-row items-center px-3 py-1.5 bg-green-500 rounded-lg mx-1"
              >
                {activeCall.callType === 'video' ? <Video size={16} color="#fff" /> : <Phone size={16} color="#fff" />}
                <Text className="text-white text-xs font-bold ml-1">Tham gia</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  onPress={() => {
                    if (useChatStore.getState().call.callStatus !== 'idle' || groupCallStatus !== 'idle') return;
                    navigation.navigate('GroupVideoCallModal', { groupId, callType: 'audio', groupName });
                  }}
                  className="p-2"
                >
                  <PhoneCall size={20} color={COLORS.secondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    if (useChatStore.getState().call.callStatus !== 'idle' || groupCallStatus !== 'idle') return;
                    navigation.navigate('GroupVideoCallModal', { groupId, callType: 'video', groupName });
                  }}
                  className="p-2"
                >
                  <Video size={22} color={COLORS.secondary} />
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity onPress={() => setShowGroupInfo(true)} className="p-2">
              <Info size={22} color={COLORS.secondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar Row (Appears below header) */}
        {isSearching && (
          <View className="bg-white px-5 py-3 border-b border-gray-50 flex-row items-center shadow-sm">
            <View className="flex-1 flex-row items-center bg-gray-50 px-4 py-2 rounded-2xl border border-gray-100">
              <Search size={16} color="#9ca3af" />
              <TextInput
                className="flex-1 ml-2 text-sm text-secondary font-medium"
                placeholder="Tìm kiếm tin nhắn..."
                placeholderTextColor="#9ca3af"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
              {searchQuery !== '' && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X size={14} color="#9ca3af" />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              onPress={() => { setIsSearching(false); setSearchQuery(''); }}
              className="ml-3"
            >
              <Text className="text-secondary font-bold text-xs">Hủy</Text>
            </TouchableOpacity>
          </View>
        )}

        <View className="flex-1 bg-gray-50/20">
          <PinnedBanner
            pinnedMessages={pinnedMessages}
            isAdmin={(groupMembers || []).find(m => m.userId === user?.id)?.role !== 'MEMBER'}
            onPress={(msg) => {
              const index = groupMessages.findIndex(m => m.messageId === msg.messageId);
              if (index !== -1) {
                flatListRef.current?.scrollToIndex({ index, animated: true });
              }
            }}
            onUnpin={(msgId) => {
              apiClient.delete(`/chat/groups/${groupId}/messages/${msgId}/pin`)
                .then(() => useGroupStore.getState().removePin(groupId, msgId))
                .catch(e => console.error('Unpin error:', e));
            }}
            onShowList={() => setShowPinnedListModal(true)}
          />
          {loading ? (
            <ActivityIndicator color={COLORS.primary} size="large" className="mt-10" />
          ) : (
            <>
              {groupMessages.length === 0 ? (
                <View className="flex-1 items-center justify-center px-10">
                  <View className="bg-orange-50/60 p-8 rounded-[48px] border border-orange-100/50 items-center justify-center shadow-sm mb-6">
                    <Text style={{ fontSize: 72 }}>👋</Text>
                  </View>
                  <Text className="text-lg font-black text-secondary text-center mb-1">
                    Nhóm đã được tạo thành công!
                  </Text>
                  <Text className="text-sm font-medium text-gray-400 text-center">
                    Hãy gửi lời chào đầu tiên!
                  </Text>
                </View>
              ) : (
                <FlatList
                  ref={flatListRef}
                  data={searchQuery
                    ? groupMessages.filter(m => m.type === 'TEXT' && m.content.toLowerCase().includes(searchQuery.toLowerCase()))
                    : groupMessages
                  }
                  renderItem={renderMessage}
                  keyExtractor={(item, index) => item.messageId?.toString() || index.toString()}
                  inverted
                  contentContainerStyle={{ paddingVertical: 20 }}
                  showsVerticalScrollIndicator={false}
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
              {/* Mention Suggestions - Fixed name resolution */}
              {showMentions && (
                <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 max-h-48 shadow-xl">
                  <View className="px-4 py-2 border-b border-gray-50">
                    <Text className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nhắc đến thành viên</Text>
                  </View>
                  <ScrollView keyboardShouldPersistTaps="always">
                    {groupMembers
                      .map(m => ({
                        ...m,
                        displayName: m.nickname || profileCache[m.userId]?.name || m.user?.email || 'Thành viên'
                      }))
                      .filter(m => m.displayName.toLowerCase().includes(mentionSearch.toLowerCase()))
                      .map(m => (
                        <TouchableOpacity
                          key={m.userId}
                          onPress={() => {
                            const lastAt = content.lastIndexOf('@');
                            setContent(content.slice(0, lastAt + 1) + m.displayName + ' ');
                            setShowMentions(false);
                          }}
                          className="flex-row items-center px-4 py-3 border-b border-gray-50 active:bg-orange-50"
                        >
                          <View className="w-9 h-9 rounded-full bg-orange-100 items-center justify-center mr-3 border border-orange-200">
                            {profileCache[m.userId]?.avatarUrl ? (
                              <Image source={{ uri: profileCache[m.userId].avatarUrl }} className="w-full h-full rounded-full" />
                            ) : (
                              <Text className="text-primary font-bold text-[12px]">{m.displayName?.charAt(0)?.toUpperCase()}</Text>
                            )}
                          </View>
                          <View>
                            <Text className="text-sm font-bold text-secondary">{m.displayName}</Text>
                            <Text className="text-[10px] text-gray-400">
                              {m.role === 'ADMIN' ? 'Quản trị viên' : 'Thành viên'}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                  </ScrollView>
                </View>
              )}
            </>
          )}

        </View>

        <ReplyPreview replyingTo={replyingTo} onClear={() => setReplyingTo(null)} />

        {/* Typing indicator - just above input bar */}
        {(() => {
          const typingNames = Object.entries(typingUsers)
            .filter(([uid, isTyping]) => isTyping && uid !== user?.id)
            .map(([uid]) => {
              const m = groupMembers.find(x => x.userId === uid);
              return m?.nickname || profileCache[uid]?.name || m?.user?.fullName || 'Ai đó';
            });
          if (typingNames.length === 0) return null;
          const label = typingNames.length === 1
            ? `${typingNames[0]} đang nhập...`
            : `${typingNames.slice(0, 2).join(', ')} đang nhập...`;
          return (
            <View className="px-5 py-1.5 flex-row items-center bg-white border-t border-gray-50">
              <View className="flex-row items-center mr-2">
                <View className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                <View className="w-1.5 h-1.5 bg-gray-400 rounded-full mx-0.5" />
                <View className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
              </View>
              <Text className="text-gray-400 text-[11px] italic">{label}</Text>
            </View>
          );
        })()}

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
                    className="flex-1 text-secondary text-sm font-bold"
                    placeholder="Tin nhắn nhóm..."
                    autoFocus={false}
                    value={content}
                    onChangeText={(text) => {
                      setContent(text);

                      // Real-time typing logic (Pulse emission matches Web)
                      if (!isTypingRef.current) {
                        isTypingRef.current = true;
                        socketService.socket?.emit('group_typing', { groupId });
                      }

                      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                      typingTimeoutRef.current = setTimeout(() => {
                        isTypingRef.current = false;
                      }, 3000);

                      // @mention logic: close if no @ found or space after @
                      const lastAt = text.lastIndexOf('@');
                      if (lastAt === -1) {
                        if (showMentions) setShowMentions(false);
                      } else {
                        const afterAt = text.slice(lastAt + 1);
                        if (!afterAt.includes(' ')) {
                          setShowMentions(true);
                          setMentionSearch(afterAt);
                        } else {
                          if (showMentions) setShowMentions(false);
                        }
                      }
                    }}
                    onBlur={() => setTimeout(() => setShowMentions(false), 150)}
                    multiline
                    style={{ maxHeight: 100 }}
                    blurOnSubmit={false}
                    disableFullscreenUI={true}
                  />
                  {/* Emoji picker button */}
                  <TouchableOpacity
                    onPress={() => {
                      setShowAttachmentMenu(false);
                      setShowEmojiPicker(prev => !prev);
                    }}
                    className="ml-2 p-1"
                  >
                    <Smile size={20} color={showEmojiPicker ? COLORS.primary : '#9ca3af'} />
                  </TouchableOpacity>
                </View>
              </View>
            )}


            <TouchableOpacity
              onPress={() => {
                setShowEmojiPicker(false);
                isRecording ? stopRecording() : handleSend();
              }}
              className={`ml-1 w-12 h-12 rounded-[22px] bg-primary items-center justify-center shadow-lg shadow-orange-500/40 mb-1 ${(!content.trim() && !isRecording && !draftImage) ? 'opacity-50' : ''}`}
            >
              <Send size={18} color="#fff" strokeWidth={3} />
            </TouchableOpacity>
          </View>

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
                onPress={startRecording}
                className="w-[20%] items-center justify-center mb-3"
              >
                <View className="w-11 h-11 bg-green-50 rounded-full items-center justify-center mb-1">
                  <Mic size={20} color="#10b981" />
                </View>
                <Text className="text-[10px] text-gray-600 font-bold text-center">Ghi âm</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={async () => {
                  setShowAttachmentMenu(false);
                  const res = await pickAndUploadDocument();
                  if (res && res.success && res.url) {
                    const replyToId = replyingTo?.messageId || replyingTo?.id || replyingTo?.message_id || null;
                    try {
                      await apiClient.post(`/chat/groups/${groupId}/messages`, {
                        content: res.url,
                        type: 'PDF',
                        name: res.name,
                        replyToId
                      });
                      setReplyingTo(null);
                    } catch (err) {
                      Alert.alert('Lỗi', 'Không thể gửi tệp. Vui lòng thử lại.');
                    }
                  }
                }}
                className="w-[20%] items-center justify-center mb-3"
              >
                <View className="w-11 h-11 bg-purple-50 rounded-full items-center justify-center mb-1">
                  <FileText size={20} color="#a855f7" />
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
                onPress={() => { setShowAttachmentMenu(false); setShowPollModal(true); }}
                className="w-[20%] items-center justify-center mb-3"
              >
                <View className="w-11 h-11 bg-orange-50 rounded-full items-center justify-center mb-1">
                  <ClipboardList size={20} color={COLORS.primary} />
                </View>
                <Text className="text-[10px] text-gray-600 font-bold text-center">Bình chọn</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => { setShowAttachmentMenu(false); setShowReminderModal(true); }}
                className="w-[20%] items-center justify-center mb-3"
              >
                <View className="w-11 h-11 bg-blue-50 rounded-full items-center justify-center mb-1">
                  <Bell size={20} color="#3b82f6" />
                </View>
                <Text className="text-[10px] text-gray-600 font-bold text-center">Nhắc hẹn</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Parity Modals */}
        <Modal visible={!!previewImage} transparent animationType="fade">
          <View className="flex-1 bg-black items-center justify-center">
            <TouchableOpacity className="absolute top-12 right-6 z-20 p-2 bg-white/10 rounded-full" onPress={() => setPreviewImage(null)}>
              <X size={24} color="#fff" />
            </TouchableOpacity>
            <Image source={{ uri: previewImage || '' }} className="w-full h-full" resizeMode="contain" />
          </View>
        </Modal>

        <PollModal
          visible={showPollModal}
          onClose={() => setShowPollModal(false)}
          onCreated={handleCreatePoll}
        />

        <ReminderModal
          visible={showReminderModal}
          onClose={() => setShowReminderModal(false)}
          groupId={groupId}
        />

        <PinnedMessagesListModal
          visible={showPinnedListModal}
          onClose={() => setShowPinnedListModal(false)}
          groupId={groupId}
          isAdmin={(groupMembers || []).find(m => m.userId === user?.id)?.role !== 'MEMBER'}
          onSelect={(msg) => {
            const index = groupMessages.findIndex(m => m.messageId === msg.messageId);
            if (index !== -1) {
              flatListRef.current?.scrollToIndex({ index, animated: true });
            }
          }}
          onUnpin={(msgId) => {
            apiClient.delete(`/chat/groups/${groupId}/messages/${msgId}/pin`)
              .then(() => useGroupStore.getState().removePin(groupId, msgId))
              .catch(e => console.error('Unpin error:', e));
          }}
        />

        <Modal visible={!!previewVideo} transparent animationType="slide">
          <View className="flex-1 bg-black items-center justify-center">
            <TouchableOpacity className="absolute top-12 right-6 z-20 p-2 bg-white/10 rounded-full" onPress={() => setPreviewVideo(null)}>
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

        <UserProfileModal
          visible={showProfile}
          userId={selectedUserId || ''}
          onClose={() => setShowProfile(false)}
          onStartDM={(id) => { }}
        />

        <MessageActionModal
          visible={showActionModal}
          onClose={() => setShowActionModal(false)}
          message={selectedMessage}
          isMe={selectedMessage?.senderId === user?.id}
          onAction={handleAction}
          onReact={handleReaction}
          isAdmin={groupMembers.find(m => m.userId === user?.id)?.role !== 'MEMBER'}
          isPinned={pinnedMessages.some(m => m.messageId === selectedMessage?.messageId)}
        />

        <GroupInfoModal
          visible={showGroupInfo}
          onClose={() => setShowGroupInfo(false)}
          groupId={groupId}
          groupName={groupName}
          onViewProfile={(uid) => {
            setSelectedUserId(uid);
            setShowProfile(true);
          }}
          onGroupUpdated={() => {
            loadMessages();
            loadGroupDetails();
          }}
          onLeftGroup={() => navigation.goBack()}
          onViewQRCode={() => {
            setShowGroupInfo(false);
            navigation.navigate('GroupQRCodeScreen', { groupId, groupName, isAdmin: groupMembers.find(m => m.userId === user?.id)?.role !== 'MEMBER' });
          }}
        />

        <MessageDetailsModal
          visible={showMessageDetails}
          onClose={() => setShowMessageDetails(false)}
          message={selectedMessage}
          members={groupMembers}
          readState={groupReadState}
        />

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
              excludeId={groupId}
              selectedMessage={selectedMessage}
            />
          </SafeAreaView>
        </Modal>

        <ImageEditorModal
          visible={!!editorImage}
          imageUri={editorImage || ''}
          onCancel={() => setEditorImage(null)}
          onDone={handleEditorDone}
        />

        {/* Emoji Picker - rendered outside KeyboardAvoidingView like ChatScreen */}
        {showEmojiPicker && (
          <View style={{ backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#f0f0f0', maxHeight: 250 + insets.bottom, paddingBottom: insets.bottom }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f9fafb' }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1 }}>Chọn biểu tượng</Text>
              <TouchableOpacity
                onPress={() => setShowEmojiPicker(false)}
                style={{ padding: 6, backgroundColor: '#f3f4f6', borderRadius: 999 }}
              >
                <X size={14} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', padding: 8 }}>
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
                  apiClient.post(`/chat/groups/${groupId}/messages`, {
                    content: url,
                    type: 'STICKER',
                    replyToId: replyingTo?.messageId || replyingTo?.id || null
                  }).then(() => {
                    setReplyingTo(null);
                  }).catch(e => console.warn('Failed to send sticker', e));
                  setShowStickers(false);
                }}
                onClose={() => setShowStickers(false)}
              />
            </View>
          </View>
        </Modal>

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
                  apiClient.post(`/chat/groups/${groupId}/messages`, {
                    content: url,
                    type: 'GIF',
                    replyToId: replyingTo?.messageId || replyingTo?.id || null
                  }).then(() => {
                    setReplyingTo(null);
                  }).catch(e => console.warn('Failed to send GIF', e));
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
          onSend={(voucher) => {
            apiClient.post(`/chat/groups/${groupId}/messages`, {
              content: JSON.stringify(voucher),
              type: 'VOUCHER',
              replyToId: replyingTo?.messageId || replyingTo?.id || null
            }).then(() => {
              setReplyingTo(null);
            }).catch(e => console.warn('Failed to send voucher', e));
            setShowVoucherModal(false);
          }}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
