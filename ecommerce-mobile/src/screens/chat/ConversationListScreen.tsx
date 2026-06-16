import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, RefreshControl, ActivityIndicator, TextInput, Alert, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../contexts/authContext';
import apiClient from '../../api/client';
import { getLocalConversations, saveConversation } from '../../services/sqlite/database';
import { MessageSquare, Search, ChevronRight, Settings, Trash2, Users, UserPlus, Sparkles, BellOff, MessageSquarePlus } from 'lucide-react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { COLORS } from '../../constants';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import { useGroupStore } from '../../store/groupStore';
import { useChatStore } from '../../store/chatStore';
import SellerFaqSettingsModal from '../../features/chat/components/SellerFaqSettingsModal';

dayjs.locale('vi');

function formatLastMessagePreview(msg: any): string {
  if (!msg) return 'Chưa có tin nhắn';
  
  // If msg is stringified JSON, try to parse it
  if (typeof msg === 'string') {
    try {
      const parsed = JSON.parse(msg);
      if (parsed && typeof parsed === 'object') {
        msg = parsed;
      }
    } catch (e) {}
  }
  
  if (typeof msg === 'object' && msg !== null) {
    if (msg.type === 'STICKER') return '[Nhãn dán]';
    if (msg.type === 'GIF') return '[Ảnh GIF]';
    if (msg.type === 'IMAGE' || msg.type === 'PICTURE') return '[Hình ảnh]';
    if (msg.type === 'VIDEO') return '[Video]';
    if (msg.type === 'VOICE' || msg.type === 'AUDIO') return '[Tin nhắn thoại]';
    if (msg.type === 'FILE' || msg.type === 'PDF' || msg.type === 'DOCUMENT') return '[Tệp tin]';
    if (msg.type === 'INVOICE') return '[Hóa đơn]';
    if (msg.type === 'VOUCHER') return '[Voucher]';
    if (msg.type === 'PRODUCT') return '[Sản phẩm]';
    if (msg.type === 'ORDER') return '[Hóa đơn]';
    if (msg.type === 'CALL') return '[Cuộc gọi]';
    if (msg.type === 'FRIEND_REQUEST') return '[Lời mời kết bạn]';
    if (msg.type === 'FRIEND_ACCEPT') return '[Đã kết bạn]';
    if (msg.type === 'POLL') return '[Bình chọn]';
    if (msg.type === 'REMINDER') return '[Nhắc hẹn]';
    if (msg.type === 'SYSTEM') return '[Hệ thống] Thông báo';
    if (msg.type === 'CONTACT') return '[Danh thiếp]';
  }

  let text = msg;
  if (typeof msg === 'object' && msg !== null) {
    text = msg.content || JSON.stringify(msg);
  }

  if (typeof text !== 'string') return String(text);

  const lowerText = text.toLowerCase();
  
  // Detect GIF or Sticker from raw URL strings
  if (lowerText.includes('giphy.com') || lowerText.endsWith('.gif')) {
    if (lowerText.includes('sticker')) {
      return '[Nhãn dán]';
    }
    return '[Ảnh GIF]';
  }
  if (lowerText.includes('sticker')) {
    return '[Nhãn dán]';
  }

  // Detect based on URL file extensions or paths if lastMessage is a raw URL string
  if (
    lowerText.endsWith('.jpg') ||
    lowerText.endsWith('.jpeg') ||
    lowerText.endsWith('.png') ||
    lowerText.endsWith('.webp') ||
    lowerText.endsWith('.heic') ||
    lowerText.endsWith('.bmp') ||
    lowerText.includes('/uploads/image')
  ) {
    return '[Hình ảnh]';
  }

  if (
    lowerText.endsWith('.mp3') ||
    lowerText.endsWith('.wav') ||
    lowerText.endsWith('.aac') ||
    lowerText.endsWith('.m4a') ||
    lowerText.endsWith('.ogg') ||
    lowerText.endsWith('.caf') ||
    lowerText.includes('/uploads/audio') ||
    lowerText.includes('/uploads/voice')
  ) {
    return '[Tin nhắn thoại]';
  }

  if (
    lowerText.endsWith('.pdf') ||
    lowerText.endsWith('.doc') ||
    lowerText.endsWith('.docx') ||
    lowerText.endsWith('.xls') ||
    lowerText.endsWith('.xlsx') ||
    lowerText.endsWith('.ppt') ||
    lowerText.endsWith('.pptx') ||
    lowerText.endsWith('.txt') ||
    lowerText.endsWith('.zip') ||
    lowerText.endsWith('.rar') ||
    lowerText.includes('/uploads/document') ||
    lowerText.includes('/uploads/file')
  ) {
    return '[Tệp tin]';
  }

  if (
    lowerText.endsWith('.mp4') ||
    lowerText.endsWith('.mov') ||
    lowerText.endsWith('.avi') ||
    lowerText.endsWith('.mkv') ||
    lowerText.endsWith('.webm') ||
    lowerText.includes('/uploads/video')
  ) {
    return '[Video]';
  }

  if (text.startsWith('{"id":') || text.includes('"productid":') || text.includes('"price":')) return '[Sản phẩm]';
  if (text.includes('"voucherid":')) return '[Voucher]';
  if (text.includes('"orderid":')) return '[Hóa đơn]';
  if (text.includes('"calltype":')) return '[Cuộc gọi]';

  try {
    let data = JSON.parse(text);
    if (typeof data === 'string') {
      data = JSON.parse(data);
    }
    if (data && typeof data === 'object') {
      if (data.id || data.productId) return '[Sản phẩm]';
      if (data.voucherId) return '[Voucher]';
      if (data.orderId) return '[Hóa đơn]';
      if (data.callType) return '[Cuộc gọi]';
      if (data.url && data.name) return '[Tệp tin]';
    }
  } catch (e) {}
  
  return text;
}

function resolveAvatarUrl(avatar: string | null | undefined): string | null {
  if (!avatar) return null;
  if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
    return avatar;
  }
  const baseURL = apiClient.defaults.baseURL || 'https://47-130-20-137.sslip.io/api';
  const host = baseURL.replace('/api', '');
  return `${host}${avatar.startsWith('/') ? '' : '/'}${avatar}`;
}

export default function ConversationListScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const { userStatuses } = useChatStore();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'groups'>('all');
  const [showFaqSettings, setShowFaqSettings] = useState(false);

  const loadData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      // 1. Fetch 1-1 Conversations
      const chatRes = await apiClient.get('/chat/conversations');
      const apiConversations = chatRes.data.data || chatRes.data || [];

      // 2. Fetch Group Conversations
      let groupConversations = [];
      try {
        const groupRes = await apiClient.get('/chat/groups');
        groupConversations = groupRes.data.data || groupRes.data || [];
      } catch (err) {
        console.warn('Cannot fetch groups', err);
      }

      // 3. Collect unique IDs for profile fetching
      const participantIdsToFetch = apiConversations.map((conv: any) => 
        String(conv.userId) === String(user?.id) ? conv.sellerId : conv.userId
      ).filter(Boolean);

      const uniqueIds = [...new Set(participantIdsToFetch)];
      const profileMap: Record<string, any> = {};

      // Lấy profile thực tế trừ khi đã có trong biến
      if (uniqueIds.length > 0) {
        await Promise.all(uniqueIds.map(async (id: any) => {
          try {
            const res = await apiClient.get(`/users/${id}`);
            profileMap[id] = res.data.data || res.data;
          } catch (e) {}
        }));
      }

      // 4. Process 1-1 chats
      const processedChats = await Promise.all(apiConversations.map(async (conv: any) => {
        const convId = conv.id || conv.conversationId;
        const otherParticipantId = String(conv.userId) === String(user?.id) ? conv.sellerId : conv.userId;
        const profile = otherParticipantId ? profileMap[otherParticipantId] : null;
        let otherName = profile?.fullName || (String(conv.userId) === String(user?.id) ? conv.sellerName : conv.userName);
        let otherAvatar = profile?.avatarUrl || profile?.avatar || (String(conv.userId) === String(user?.id) ? conv.sellerAvatar : conv.userAvatar);

        // Try getting last message from local store first
        const localMsgs = useChatStore.getState().messages[convId] || [];
        let lastMsgObj = conv.lastMessage;
        if (localMsgs.length > 0) {
          const sorted = [...localMsgs].sort((a, b) => {
            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return timeB - timeA;
          });
          lastMsgObj = sorted[0];
        }

        // If not in local store, fetch latest message dynamically
        if (!localMsgs.length) {
          try {
            const msgRes = await apiClient.get(`/chat/conversations/${convId}/messages?limit=1`);
            const msgs = msgRes.data?.data?.messages || msgRes.data?.messages || msgRes.data?.data || msgRes.data || [];
            const msgsArray = Array.isArray(msgs) ? msgs : (msgs.messages || []);
            if (msgsArray.length > 0) {
              lastMsgObj = msgsArray[0];
            }
          } catch (e) {
            console.warn('Failed to fetch last message for direct conv', convId, e);
          }
        }

        return {
          id: convId,
          type: 'DIRECT',
          name: otherName || 'Người dùng ZORA',
          avatar: resolveAvatarUrl(otherAvatar),
          lastMessage: formatLastMessagePreview(lastMsgObj),
          lastMessageTime: conv.lastMessageAt || Date.now(),
          unreadCount: String(conv.userId) === String(user?.id) ? (conv.unreadUser || 0) : (conv.unreadSeller || 0),
          role: String(conv.userId) === String(user?.id) ? 'USER' : 'SELLER',
          otherUserId: otherParticipantId
        };
      }));

      // 5. Process Groups
      const processedGroups = await Promise.all(groupConversations.map(async (group: any) => {
        const groupId = group.groupId || group.id;

        // Try getting last message from local store first
        const localMsgs = useGroupStore.getState().groupMessages[groupId] || [];
        let lastMsgObj = group.lastMessage || null;
        if (localMsgs.length > 0) {
          const sorted = [...localMsgs].sort((a, b) => {
            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return timeB - timeA;
          });
          lastMsgObj = sorted[0];
        } else if (!lastMsgObj) {
          // If not in local store, fetch latest message dynamically
          try {
            const msgRes = await apiClient.get(`/chat/groups/${groupId}/messages?limit=1`);
            const msgs = msgRes.data?.data?.messages || msgRes.data?.messages || msgRes.data?.data || msgRes.data || [];
            const msgsArray = Array.isArray(msgs) ? msgs : (msgs.messages || []);
            if (msgsArray.length > 0) {
              lastMsgObj = msgsArray[0];
            }
          } catch (e) {
            console.warn('Failed to fetch last message for group', groupId, e);
          }
        }

        return {
          id: groupId,
          type: 'GROUP',
          name: group.name,
          avatar: resolveAvatarUrl(group.avatarUrl || group.avatar || group.groupAvatar),
          lastMessage: formatLastMessagePreview(lastMsgObj),
          lastMessageTime: group.lastMessageAt || group.updatedAt || Date.now(),
          unreadCount: group.memberMeta?.unreadCount || 0,
          mutedUntil: group.memberMeta?.mutedUntil,
        };
      }));

      // Join socket rooms for all groups to ensure we receive incoming calls globally
      import('../../services/socket/socketService').then(({ default: socketService }) => {
        processedGroups.forEach((g: any) => {
          socketService.joinGroup(g.id);
        });
      });

      // 5. Merge and Sort
      const merged = [...processedChats, ...processedGroups].sort((a, b) => 
        new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
      );

      setConversations(merged);
    } catch (error) {
      console.error('Fetch conversations error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();

    let debounceTimeout: NodeJS.Timeout;
    const handleNewEvent = () => {
      clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(() => {
        loadData(false);
      }, 500);
    };

    import('../../services/socket/socketService').then(({ default: socketService }) => {
      socketService.socket?.on('new_notification', handleNewEvent);
      socketService.socket?.on('new_message', handleNewEvent);
      socketService.socket?.on('new_group_message', handleNewEvent);
    });

    const unsubscribe = navigation.addListener('focus', () => {
      // Delay refresh on focus to allow backend to process mark_read
      setTimeout(() => loadData(false), 600);
    });

    return () => {
      unsubscribe();
      clearTimeout(debounceTimeout);
      import('../../services/socket/socketService').then(({ default: socketService }) => {
        socketService.socket?.off('new_notification', handleNewEvent);
        socketService.socket?.off('new_message', handleNewEvent);
        socketService.socket?.off('new_group_message', handleNewEvent);
      });
    };
  }, []);

  const filteredConversations = conversations.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (activeFilter === 'unread') {
      return c.unreadCount > 0;
    } else if (activeFilter === 'groups') {
      return c.type === 'GROUP';
    }
    return true;
  });

  const renderItem = ({ item }: { item: any }) => {
    const renderRightActions = (progress: any, dragX: any) => {
      const trans = dragX.interpolate({
        inputRange: [-80, 0],
        outputRange: [1, 0],
        extrapolate: 'clamp',
      });
      return (
        <TouchableOpacity
          onPress={async () => {
            try {
              await apiClient.delete(`/chat/conversations/${item.id}`);
              setConversations(prev => prev.filter(c => c.id !== item.id));
            } catch (e) {
              Alert.alert('Lỗi', 'Không thể xóa cuộc trò chuyện lúc này');
            }
          }}
          className="bg-red-500 justify-center items-center rounded-r-[32px] mb-3 mr-4 pr-3 pl-5 shadow-sm"
          style={{ width: 80 }}
        >
          <Animated.View style={{ transform: [{ scale: trans }] }}>
            <Trash2 color="#fff" size={24} />
          </Animated.View>
        </TouchableOpacity>
      );
    };

    const isMuted = !!(
      item.mutedUntil &&
      (item.mutedUntil === 'FOREVER' || new Date(item.mutedUntil) > new Date())
    );

    const isOnline = item.type === 'DIRECT' && item.otherUserId && userStatuses[item.otherUserId] === 'online';

    return (
      <Swipeable renderRightActions={renderRightActions} overshootRight={false}>
        <TouchableOpacity 
          activeOpacity={0.7}
          onPress={() => {
            // Immediately clear unread in local state
            setConversations(prev => prev.map(c => c.id === item.id ? { ...c, unreadCount: 0 } : c));
            if (item.type === 'GROUP') {
               navigation.navigate('GroupChatScreen', { groupId: item.id, groupName: item.name, unreadCount: item.unreadCount });
            } else {
               navigation.navigate('ChatDetail', { conversationId: item.id, participantName: item.name, unreadCount: item.unreadCount });
            }
          }}
          className="flex-row items-center p-5 mb-3 mx-4 rounded-[32px] bg-white border border-gray-100 shadow-sm"
        >
      <View className="relative">
        <View className={`w-16 h-16 rounded-[24px] overflow-hidden border shadow-sm items-center justify-center ${
          item.avatar 
            ? 'bg-gray-50 border-gray-100' 
            : 'bg-orange-50 border-orange-100'
        }`}>
          {item.avatar ? (
            <Image source={{ uri: item.avatar }} className="w-full h-full" />
          ) : item.type === 'GROUP' ? (
            <Users size={28} color={COLORS.primary} strokeWidth={1.5} />
          ) : (
            <MessageSquare size={28} color={COLORS.primary} strokeWidth={1.5} />
          )}
        </View>
        {item.unreadCount > 0 && (
          <View className="absolute -top-1 -right-1 bg-primary w-6 h-6 rounded-full items-center justify-center border-4 border-white">
            <Text className="text-white text-[9px] font-bold">
              {item.unreadCount > 9 ? '9+' : item.unreadCount}
            </Text>
          </View>
        )}
        
        {isOnline && (
          <View className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-sm" />
        )}
      </View>

      <View className="flex-1 ml-4 justify-center">
        <View className="flex-row justify-between items-center mb-1">
          <Text className="text-secondary font-bold text-base flex-1 tracking-tight mr-2" numberOfLines={1}>
            {item.name}
          </Text>
          <View className="relative items-center">
            <Text className="text-gray-300 text-[10px] font-bold">
              {dayjs(item.lastMessageTime).format('HH:mm')}
            </Text>
            {isMuted && (
              <View className="absolute top-5 left-0 right-0 items-center">
                <BellOff size={16} color="#9ca3af" />
              </View>
            )}
          </View>
        </View>
        <Text className={`text-xs ${item.unreadCount > 0 ? 'text-secondary font-bold' : 'text-gray-400 font-medium'}`} numberOfLines={1}>
          {item.unreadCount > 1 && (
            <Text className="text-red-500 font-bold">
              {item.unreadCount > 9 ? '9+' : `${item.unreadCount}`}{' '}
            </Text>
          )}
          {item.unreadCount > 1 ? 'Tin nhắn mới' : item.lastMessage}
        </Text>
      </View>
        <View className="bg-gray-50 p-1.5 rounded-full ml-2">
           <ChevronRight size={14} color="#d1d5db" />
        </View>
      </TouchableOpacity>
    </Swipeable>
  )};

  return (
    <>
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="flex-1 bg-gray-50/30">
        <View className="px-6 pt-6 pb-6 bg-white rounded-b-[40px] shadow-sm flex-row justify-between items-end border-b border-gray-50">
           <View>
             <Text className="text-secondary font-bold text-3xl tracking-tighter">Trò chuyện</Text>
             <Text className="text-gray-400 font-medium text-xs mt-1">Kết nối trực tiếp với người bán</Text>
           </View>
            <View className="flex-row">
              <TouchableOpacity className="bg-orange-50 p-3 rounded-2xl border border-orange-100 mr-2" onPress={() => navigation.navigate('AiChatScreen')}>
                 <Sparkles size={20} color={COLORS.primary} />
              </TouchableOpacity>
              <TouchableOpacity className="bg-gray-50 p-3 rounded-2xl border border-gray-100 mr-2" onPress={() => navigation.navigate('CreateGroup')}>
                 <Users size={20} color={COLORS.secondary} />
              </TouchableOpacity>
              <TouchableOpacity className="bg-gray-50 p-3 rounded-2xl border border-gray-100 mr-2" onPress={() => navigation.navigate('FriendsScreen')}>
                 <UserPlus size={20} color={COLORS.secondary} />
              </TouchableOpacity>
              {/* FAQ Settings — seller only */}
              {user?.role === 'SELLER' && (
                <TouchableOpacity
                  className={`p-3 rounded-2xl border ${
                    showFaqSettings ? 'bg-orange-50 border-orange-300' : 'bg-gray-50 border-gray-100'
                  }`}
                  onPress={() => setShowFaqSettings(true)}
                >
                  <MessageSquarePlus size={20} color={showFaqSettings ? COLORS.primary : COLORS.secondary} />
                </TouchableOpacity>
              )}
            </View>
        </View>

        <View className="px-5 mt-4">
           <View className="bg-white flex-row items-center px-4 py-3.5 rounded-2xl border border-gray-100 shadow-sm">
              <Search size={18} color="#9ca3af" />
              <TextInput 
                placeholder="Tìm kiếm hội thoại..." 
                className="ml-3 flex-1 text-sm font-medium"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
           </View>
        </View>

        {/* Filter Tabs */}
        <View className="flex-row px-5 mt-4 justify-between">
           {[
             { id: 'all', label: 'Tất cả' },
             { id: 'unread', label: 'Chưa đọc' },
             { id: 'groups', label: 'Nhóm' }
           ].map((tab) => {
             const isActive = activeFilter === tab.id;
             return (
               <TouchableOpacity
                 key={tab.id}
                 onPress={() => setActiveFilter(tab.id as any)}
                 activeOpacity={0.8}
                 className={`flex-1 py-2.5 mx-1.5 rounded-2xl border items-center justify-center shadow-sm ${
                   isActive 
                     ? 'bg-primary border-primary shadow-primary/20' 
                     : 'bg-white border-gray-100'
                 }`}
               >
                 <Text 
                   className={`text-xs font-bold ${
                     isActive ? 'text-white' : 'text-secondary'
                   }`}
                 >
                   {tab.label}
                 </Text>
               </TouchableOpacity>
             );
           })}
        </View>

        {loading && conversations.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <FlatList
            data={filteredConversations}
            renderItem={renderItem}
            keyExtractor={(item, index) => item?.id?.toString() || index.toString()}
            contentContainerStyle={{ paddingVertical: 20, paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(false)} tintColor={COLORS.primary} />}
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center py-24 p-12">
                <View className="bg-orange-50 p-10 rounded-full mb-6">
                  <MessageSquare size={64} color={COLORS.primary} strokeWidth={1} />
                </View>
                <Text className="text-secondary font-bold text-xl tracking-tight">Chưa có tin nhắn</Text>
                <Text className="text-gray-400 text-center mt-3 leading-5">
                  Mọi thắc mắc về sản phẩm sẽ được giải đáp tại đây. Hãy bắt đầu ngay!
                </Text>
                <TouchableOpacity 
                   onPress={() => navigation.navigate('Home')}
                   className="mt-10 bg-primary px-10 py-3 rounded-2xl shadow-lg shadow-orange-500/20"
                >
                   <Text className="text-white font-bold uppercase tracking-widest text-[10px]">Mua sắm ngay</Text>
                </TouchableOpacity>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>

    {/* Seller FAQ Settings Modal — accessible from top-level chat list */}
    {user?.role === 'SELLER' && (
      <SellerFaqSettingsModal
        visible={showFaqSettings}
        sellerId={user.id}
        onClose={() => setShowFaqSettings(false)}
      />
    )}
  </>
  );
}
