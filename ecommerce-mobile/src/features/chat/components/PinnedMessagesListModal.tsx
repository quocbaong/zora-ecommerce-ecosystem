import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, FlatList, Image, ActivityIndicator, Pressable, Alert } from 'react-native';
import { X, Pin, Trash2, Calendar, FileText, Image as ImageIcon, Video, Mic } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../../constants';
import apiClient from '../../../api/client';
import type { GroupMessage } from '../../../types/chat';
import dayjs from 'dayjs';

interface PinnedMessagesListModalProps {
  visible: boolean;
  onClose: () => void;
  groupId: string;
  onSelect: (message: GroupMessage) => void;
  onUnpin?: (messageId: string) => void;
  isAdmin?: boolean;
  localPinnedList?: GroupMessage[];
}

export default function PinnedMessagesListModal({
  visible,
  onClose,
  groupId,
  onSelect,
  onUnpin,
  isAdmin,
  localPinnedList,
}: PinnedMessagesListModalProps) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [pinnedList, setPinnedList] = useState<GroupMessage[]>([]);

  const fetchPinnedList = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/chat/groups/${groupId}/pins`);
      setPinnedList(response.data?.data || response.data || []);
    } catch (error) {
      console.warn('Failed to fetch pinned messages:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (localPinnedList) {
      setPinnedList(localPinnedList);
      setLoading(false);
    } else if (visible) {
      fetchPinnedList();
    }
  }, [visible, localPinnedList]);

  const handleUnpin = (messageId: string) => {
    Alert.alert(
      'Gỡ ghim tin nhắn',
      'Bạn có chắc chắn muốn gỡ ghim tin nhắn này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Gỡ ghim',
          style: 'destructive',
          onPress: () => {
            if (onUnpin) {
              onUnpin(messageId);
              setPinnedList(prev => prev.filter(m => m.messageId !== messageId));
            }
          },
        },
      ]
    );
  };

  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'IMAGE':
        return <ImageIcon size={16} color={COLORS.primary} />;
      case 'VIDEO':
        return <Video size={16} color="#3b82f6" />;
      case 'FILE':
        return <FileText size={16} color="#a855f7" />;
      case 'AUDIO':
        return <Mic size={16} color="#10b981" />;
      default:
        return <Pin size={16} color={COLORS.primary} fill={COLORS.primary} />;
    }
  };

  const getMessagePreview = (msg: GroupMessage) => {
    if (msg.type === 'IMAGE') return 'Đã ghim một ảnh';
    if (msg.type === 'VIDEO') return 'Đã ghim một video';
    if (msg.type === 'FILE') return 'Đã ghim một tệp tin';
    if (msg.type === 'AUDIO') return 'Đã ghim một tin nhắn thoại';
    return msg.content || '';
  };

  const renderItem = ({ item }: { item: GroupMessage }) => {
    const timeStr = dayjs(item.createdAt).format('HH:mm DD/MM/YYYY');
    const senderInitial = item.sender?.fullName?.charAt(0).toUpperCase() || 'U';

    return (
      <View className="mb-3.5 bg-gray-50 border border-gray-100 rounded-2xl overflow-hidden shadow-sm flex-row items-stretch">
        <TouchableOpacity
          onPress={() => {
            onSelect(item);
            onClose();
          }}
          className="flex-1 p-4 flex-row items-start active:bg-orange-50/20"
        >
          {/* Sender Avatar */}
          <View className="w-10 h-10 rounded-full bg-orange-100 items-center justify-center mr-3 border border-orange-200">
            {item.sender?.avatarUrl ? (
              <Image source={{ uri: item.sender.avatarUrl }} className="w-full h-full rounded-full" />
            ) : (
              <Text className="text-primary font-bold text-sm">{senderInitial}</Text>
            )}
          </View>

          {/* Details */}
          <View className="flex-1">
            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-sm font-extrabold text-secondary mr-2" numberOfLines={1}>
                {item.sender?.fullName || 'Thành viên'}
              </Text>
              <Text className="text-[10px] text-gray-400 font-medium">{timeStr}</Text>
            </View>

            <View className="flex-row items-center mt-1">
              <View className="mr-1.5">{getMessageIcon(item.type)}</View>
              <Text className="text-xs text-gray-500 font-medium flex-1" numberOfLines={2}>
                {getMessagePreview(item)}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Unpin Action */}
        {isAdmin && onUnpin && (
          <TouchableOpacity
            onPress={() => handleUnpin(item.messageId)}
            className="px-4 justify-center bg-red-50 border-l border-red-100/50 active:bg-red-100"
          >
            <Trash2 size={16} color="#ef4444" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <Pressable className="flex-1 bg-black/40 justify-end" onPress={onClose}>
        <Pressable
          className="bg-white rounded-t-[40px] h-[75%] shadow-2xl"
          onPress={e => e.stopPropagation()}
          style={{ paddingBottom: Math.max(insets.bottom, 20) }}
        >
          {/* Header */}
          <View className="px-5 py-6 flex-row items-center justify-between border-b border-gray-50">
            <View className="flex-row items-center">
              <View className="w-8 h-8 items-center justify-center bg-orange-50 rounded-full mr-3 border border-orange-100">
                <Pin size={16} color={COLORS.primary} fill={COLORS.primary} />
              </View>
              <View>
                <Text className="text-lg font-black text-secondary">Tin nhắn đã ghim</Text>
                <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">
                  {localPinnedList ? 'Lịch sử ghim cuộc trò chuyện' : 'Lịch sử ghim trong nhóm'} ({pinnedList.length})
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} className="bg-gray-100 p-2 rounded-full">
              <X size={20} color={COLORS.secondary} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View className="flex-1 px-5 pt-4">
            {loading ? (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator color={COLORS.primary} size="large" />
                <Text className="text-gray-400 text-xs font-semibold mt-3">Đang tải lịch sử...</Text>
              </View>
            ) : (
              <FlatList
                data={pinnedList}
                renderItem={renderItem}
                keyExtractor={item => item.messageId.toString()}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
                ListEmptyComponent={
                  <View className="flex-1 items-center justify-center py-20">
                    <Pin size={48} color="#e5e7eb" strokeWidth={1} />
                    <Text className="text-gray-400 font-bold text-sm mt-4 text-center">
                      Chưa có tin nhắn nào được ghim
                    </Text>
                    <Text className="text-gray-300 text-[10px] uppercase font-bold tracking-widest mt-1 text-center">
                      Nhấn giữ tin nhắn bất kỳ để ghim
                    </Text>
                  </View>
                }
              />
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
