import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, FlatList, Image, TextInput, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { X, Search, User, Check, Users } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../../constants';
import apiClient from '../../../api/client';
import { useAuthStore } from '../../../contexts/authContext';

interface AddMemberModalProps {
  visible: boolean;
  onClose: () => void;
  groupId: string;
  existingMemberIds: string[];
  onMemberAdded?: () => void;
}

export default function AddMemberModal({ visible, onClose, groupId, existingMemberIds, onMemberAdded }: AddMemberModalProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [friends, setFriends] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const loadFriends = async () => {
    setLoading(true);
    try {
      // 1. Get 1-1 conversations to find potential friends
      const convsRes = await apiClient.get('/chat/conversations');
      const convs = convsRes.data?.data || convsRes.data || [];
      
      // 2. Get accepted friends list
      let friendsList: any[] = [];
      try {
        const friendsRes = await apiClient.get('/chat/friends');
        friendsList = friendsRes.data?.data || friendsRes.data || [];
      } catch (e) {
        console.warn('Failed to load friends list from /chat/friends', e);
      }

      // Map conversations to a common shape
      const mappedConvs = convs.map((conv: any) => ({
        userId: conv.participantId || conv.userId || conv.sellerId,
        name: conv.participantName || conv.userName || conv.sellerName,
        avatar: conv.participantAvatar || conv.userAvatar || conv.sellerAvatar
      }));

      // Map friends list to a common shape
      const mappedFriends = friendsList.map((item: any) => {
        const targetId = item.userId === user?.id ? item.sellerId : item.userId;
        const fullName = item.participantName || item.sellerName || item.fullName || targetId;
        const avatarUrl = item.participantAvatar || item.sellerAvatar || item.avatarUrl;
        return {
          userId: targetId,
          name: fullName,
          avatar: avatarUrl
        };
      });

      // Merge both lists and exclude current user and existing group members
      const merged = [...mappedFriends, ...mappedConvs]
        .filter((f: any) => f.userId && f.userId !== user?.id && !existingMemberIds.includes(f.userId));

      // Remove duplicates
      const unique = merged.filter((v: any, i: any, a: any) => 
        a.findIndex((t: any) => t.userId === v.userId) === i
      );

      // Resolve profiles/names in background for users who only have raw UUIDs as names
      const unresolved = unique.filter(f => f.name === f.userId);
      if (unresolved.length > 0) {
        Promise.all(unresolved.slice(0, 10).map(async (f) => {
          try {
            const userRes = await apiClient.get(`/users/${f.userId}`);
            const userData = userRes.data?.data || userRes.data;
            if (userData && userData.fullName) {
              setFriends(prev => prev.map(item => item.userId === f.userId ? { ...item, name: userData.fullName } : item));
            }
          } catch (e) {}
        }));
      }

      setFriends(unique);
    } catch (error) {
      console.warn('Failed to load friends', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadFriends();
      setSelectedIds([]);
      setSearch('');
    }
  }, [visible, existingMemberIds]);

  const toggleSelect = (userId: string) => {
    setSelectedIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleAddMembers = async () => {
    if (selectedIds.length === 0 || submitting) return;
    
    setSubmitting(true);
    try {
      const res = await apiClient.post(`/chat/groups/${groupId}/members`, { userIds: selectedIds });
      const result = res.data?.data || res.data;
      
      const addedCount = result?.added?.length || 0;
      const pendingCount = result?.pending?.length || 0;

      if (pendingCount > 0) {
        if (addedCount > 0) {
          Alert.alert(
            'Kết quả thêm thành viên',
            `Đã thêm trực tiếp ${addedCount} thành viên vào nhóm. Còn lại ${pendingCount} thành viên cần chờ Trưởng nhóm phê duyệt.`
          );
        } else {
          Alert.alert(
            'Chờ duyệt',
            `Yêu cầu thêm ${pendingCount} thành viên đã được gửi đi và đang chờ Trưởng nhóm phê duyệt.`
          );
        }
      } else {
        Alert.alert('Thành công', `Đã thêm ${addedCount} thành viên vào nhóm thành công!`);
      }

      // Successfully added / requested
      onMemberAdded?.();
      onClose();
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.error || error.response?.data?.message || 'Không thể thêm thành viên vào nhóm');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = friends.filter(f => 
    f.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View className="flex-1 bg-black/50 justify-end">
        <View 
          className="bg-white rounded-t-[40px] h-[85%]"
          style={{ paddingBottom: Math.max(insets.bottom, 20) }}
        >
          {/* Header */}
          <View className="px-5 py-6 flex-row items-center justify-between border-b border-gray-50">
            <View>
              <Text className="text-xl font-black text-secondary">Thêm thành viên</Text>
              <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-1">
                Chọn bạn bè để mời vào nhóm
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} className="bg-gray-100 p-2 rounded-full">
              <X size={20} color={COLORS.secondary} />
            </TouchableOpacity>
          </View>

          {/* Selected Chips List */}
          {selectedIds.length > 0 && (
            <View className="px-5 py-3 border-b border-gray-50 max-h-[80px]">
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, alignItems: 'center' }}>
                {selectedIds.map(id => {
                  const friend = friends.find(f => f.userId === id);
                  const name = friend?.name || id;
                  return (
                    <View 
                      key={id} 
                      className="flex-row items-center bg-orange-50 border border-orange-100 px-3 py-1.5 rounded-full"
                    >
                      <Text className="text-xs font-bold text-orange-600 mr-1.5" numberOfLines={1}>{name}</Text>
                      <TouchableOpacity onPress={() => toggleSelect(id)} className="bg-orange-200/50 p-0.5 rounded-full">
                        <X size={12} color={COLORS.primary} />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Search */}
          <View className="px-5 py-4">
            <View className="flex-row items-center bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3">
              <Search size={18} color="#9ca3af" />
              <TextInput
                className="flex-1 ml-2 text-sm font-medium text-secondary"
                placeholder="Tìm bạn bè..."
                value={search}
                onChangeText={setSearch}
              />
            </View>
          </View>

          {loading ? (
            <ActivityIndicator color={COLORS.primary} className="mt-10" />
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.userId}
              className="flex-1 px-5"
              ListEmptyComponent={
                <View className="items-center justify-center py-20 px-10">
                   <Users size={48} color="#e5e7eb" strokeWidth={1} />
                   <Text className="text-gray-400 text-center mt-4 font-medium text-sm">
                      {search ? 'Không tìm thấy kết quả nào' : 'Tất cả bạn bè đã ở trong nhóm này'}
                   </Text>
                </View>
              }
              renderItem={({ item }) => {
                const isSelected = selectedIds.includes(item.userId);
                return (
                  <TouchableOpacity 
                     onPress={() => toggleSelect(item.userId)}
                     className="flex-row items-center py-4 border-b border-gray-50"
                  >
                    <View className="w-12 h-12 rounded-full bg-orange-50 items-center justify-center mr-4 border border-orange-100">
                      {item.avatar ? (
                        <Image source={{ uri: item.avatar }} className="w-full h-full rounded-full" />
                      ) : (
                        <User size={24} color={COLORS.primary} />
                      )}
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-bold text-secondary">{item.name}</Text>
                    </View>
                    <View className={`w-6 h-6 rounded-full border items-center justify-center ${isSelected ? 'bg-primary border-primary' : 'border-gray-300'}`}>
                      {isSelected && <Check size={14} color="white" />}
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          )}

          {/* Action button at the bottom */}
          {selectedIds.length > 0 && (
            <View className="px-5 py-4 border-t border-gray-100">
              <TouchableOpacity
                onPress={handleAddMembers}
                disabled={submitting}
                className="bg-primary py-4 rounded-2xl items-center justify-center flex-row shadow-lg shadow-orange-500/20 active:opacity-90"
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text className="text-white text-base font-black uppercase tracking-wider">
                    Thêm ({selectedIds.length}) thành viên
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
