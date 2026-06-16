import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, TextInput, ActivityIndicator } from 'react-native';
import { Search, Users, User } from 'lucide-react-native';
import apiClient from '../../../api/client';
import { COLORS } from '../../../constants';
import { useAuthStore } from '../../../contexts/authContext';
import { useChatStore } from '../../../store/chatStore';
import { useGroupStore } from '../../../store/groupStore';

interface ConversationPickerProps {
  excludeId?: string;
  selectedMessage: any;
}

export default function ConversationPicker({ excludeId, selectedMessage }: ConversationPickerProps) {
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const { user } = useAuthStore();
  
  // Track button states per item: Record of pickerId to status
  const [buttonStates, setButtonStates] = useState<Record<string, {
    status: 'idle' | 'sending' | 'countdown' | 'sent';
    timeLeft?: number;
    sentMessageId?: string;
    intervalId?: any;
  }>>({});

  const loadData = async () => {
    try {
      const convsRes = await apiClient.get('/chat/conversations').catch(() => ({ data: [] }));
      let groupsRes: any = { data: [] };
      try {
        groupsRes = await apiClient.get('/chat/groups');
      } catch (e) {
        console.warn('Cannot fetch groups', e);
      }

      const rawConvs = convsRes.data?.data || convsRes.data;
      const apiConvs = Array.isArray(rawConvs) ? rawConvs : [];
      
      const participantIds = apiConvs.map((conv: any) => 
        conv.userId === user?.id ? conv.sellerId : conv.userId
      ).filter(Boolean);

      const uniqueIds = [...new Set(participantIds)];
      const profileMap: Record<string, any> = {};

      if (uniqueIds.length > 0) {
        await Promise.all(uniqueIds.map(async (id: any) => {
          try {
            const res = await apiClient.get(`/users/${id}`);
            profileMap[id] = res.data.data || res.data;
          } catch (e) {}
        }));
      }

      const convs = apiConvs.map((c: any) => {
        const isBuyer = c.userId === user?.id;
        const otherId = isBuyer ? c.sellerId : c.userId;
        const profile = otherId ? profileMap[otherId] : null;

        return {
          ...c,
          pickerType: 'DIRECT',
          pickerId: c.id || c.conversationId,
          pickerName: profile?.fullName || (isBuyer ? c.sellerName : c.userName) || 'Người dùng ZORA',
          pickerAvatar: profile?.avatarUrl || (isBuyer ? c.sellerAvatar : c.userAvatar)
        };
      });

      const rawGroups = groupsRes.data?.data || groupsRes.data?.groups || groupsRes.data;
      const safeGroups = Array.isArray(rawGroups) ? rawGroups : [];

      const groups = safeGroups.map((g: any) => ({
        ...g,
        pickerType: 'GROUP',
        pickerId: g.groupId,
        pickerName: g.name,
        pickerAvatar: g.avatarUrl
      }));

      let all = [...convs, ...groups];
      setItems(all);
    } catch (error) {
      console.warn('Failed to load recipients', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Cleanup active intervals on unmount
    return () => {
      setButtonStates(prev => {
        Object.values(prev).forEach(state => {
          if (state.intervalId) clearInterval(state.intervalId);
        });
        return {};
      });
    };
  }, []);

  const handleSend = async (item: any) => {
    if (!selectedMessage) return;
    const key = `${item.pickerType}-${item.pickerId}`;
    
    setButtonStates(prev => ({
      ...prev,
      [key]: { status: 'sending' }
    }));

    const originalSenderName = selectedMessage.resolvedSenderName || 
      (selectedMessage.senderId === user?.id ? 'Bạn' : (selectedMessage.sender?.fullName || selectedMessage.senderName || 'Thành viên'));

    try {
      let res;
      if (item.pickerType === 'GROUP') {
        res = await apiClient.post(`/chat/groups/${item.pickerId}/messages`, {
          content: selectedMessage.content,
          type: selectedMessage.type,
          isForwarded: true,
          forwardedFrom: originalSenderName
        });
      } else {
        res = await apiClient.post(`/chat/conversations/${item.pickerId}/messages`, {
          content: selectedMessage.content,
          type: selectedMessage.type,
          isForwarded: true,
          forwardedFrom: originalSenderName
        });
      }

      const data = res.data?.data || res.data;
      const sentMessageId = data?.messageId || data?.id || data?.message_id;

      if (!sentMessageId) {
        setButtonStates(prev => ({
          ...prev,
          [key]: { status: 'sent' }
        }));
        return;
      }

      // Start countdown of 5 seconds
      const intervalId = setInterval(() => {
        setButtonStates(prev => {
          const current = prev[key];
          if (!current || current.status !== 'countdown') {
            clearInterval(intervalId);
            return prev;
          }
          const nextTime = (current.timeLeft || 5) - 1;
          if (nextTime <= 0) {
            clearInterval(intervalId);
            return {
              ...prev,
              [key]: { status: 'sent' }
            };
          }
          return {
            ...prev,
            [key]: { ...current, timeLeft: nextTime }
          };
        });
      }, 1000);

      setButtonStates(prev => ({
        ...prev,
        [key]: { status: 'countdown', timeLeft: 5, sentMessageId, intervalId }
      }));

    } catch (e) {
      console.warn('Forward message failed', e);
      setButtonStates(prev => ({
        ...prev,
        [key]: { status: 'idle' }
      }));
    }
  };

  const handleUndo = async (item: any) => {
    const key = `${item.pickerType}-${item.pickerId}`;
    const state = buttonStates[key];
    if (!state || state.status !== 'countdown' || !state.sentMessageId) return;

    if (state.intervalId) {
      clearInterval(state.intervalId);
    }

    setButtonStates(prev => ({
      ...prev,
      [key]: { status: 'idle' }
    }));

    // Optimistically delete the message locally so it disappears instantly
    if (item.pickerType === 'GROUP') {
      useGroupStore.getState().deleteGroupMessage(item.pickerId, state.sentMessageId);
    } else {
      useChatStore.getState().deleteMessage(item.pickerId, state.sentMessageId);
    }

    try {
      if (item.pickerType === 'GROUP') {
        await apiClient.delete(`/chat/groups/${item.pickerId}/messages/${state.sentMessageId}`);
      } else {
        await apiClient.delete(`/chat/conversations/${item.pickerId}/messages/${state.sentMessageId}`);
      }
    } catch (e) {
      console.warn('Undo delete failed', e);
    }
  };

  const filtered = items.filter(item => {
    const name = item.pickerName || '';
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const renderItem = ({ item }: { item: any }) => {
    const key = `${item.pickerType}-${item.pickerId}`;
    const btnState = buttonStates[key] || { status: 'idle' };

    return (
      <View className="flex-row items-center p-4 border-b border-gray-50 bg-white justify-between">
        <View className="flex-row items-center flex-1">
          <View className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center mr-3 overflow-hidden">
            {item.pickerAvatar ? (
              <Image source={{ uri: item.pickerAvatar }} className="w-full h-full" />
            ) : item.pickerType === 'GROUP' ? (
              <Users size={20} color="#9ca3af" />
            ) : (
              <User size={20} color="#9ca3af" />
            )}
          </View>
          <View className="flex-1 mr-2">
            <Text className="text-sm font-bold text-secondary" numberOfLines={1}>
              {item.pickerName || 'Hội thoại'}
            </Text>
            <Text className="text-[10px] text-gray-400 mt-0.5 font-medium uppercase tracking-wider">
              {item.pickerType === 'GROUP' ? 'Nhóm' : 'Cá nhân'}
            </Text>
          </View>
        </View>

        {/* Dynamic Buttons */}
        <View>
          {btnState.status === 'idle' && (
            <TouchableOpacity
              onPress={() => handleSend(item)}
              className="bg-orange-500 rounded-full px-5 py-1.5 shadow-sm shadow-orange-500/20"
            >
              <Text className="text-white text-xs font-bold">Gửi</Text>
            </TouchableOpacity>
          )}

          {btnState.status === 'sending' && (
            <ActivityIndicator size="small" color="#f97316" className="px-5 py-1.5" />
          )}

          {btnState.status === 'countdown' && (
            <TouchableOpacity
              onPress={() => handleUndo(item)}
              className="bg-orange-50 border border-orange-200 rounded-full px-3 py-1.5"
            >
              <Text className="text-orange-500 text-xs font-bold">
                Hoàn tác
              </Text>
            </TouchableOpacity>
          )}

          {btnState.status === 'sent' && (
            <View className="bg-gray-100 rounded-full px-4 py-1.5">
              <Text className="text-gray-400 text-xs font-bold">ĐÃ GỬI</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return <ActivityIndicator color={COLORS.primary} className="mt-10" />;
  }

  return (
    <View className="flex-1">
      <View className="px-4 py-3 bg-gray-50">
        <View className="flex-row items-center bg-white border border-gray-200 rounded-2xl px-3 py-2">
          <Search size={18} color="#9ca3af" />
          <TextInput
            className="flex-1 ml-2 text-sm text-secondary font-medium"
            placeholder="Tìm kiếm người nhận..."
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => `${item.pickerType}-${item.pickerId}`}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
}
