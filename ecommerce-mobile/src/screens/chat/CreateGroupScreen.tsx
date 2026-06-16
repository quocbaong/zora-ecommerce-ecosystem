import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, ActivityIndicator, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Users, Search, Check, Plus } from 'lucide-react-native';
import apiClient from '../../api/client';
import { COLORS } from '../../constants';
import { useAuthStore } from '../../contexts/authContext';

export default function CreateGroupScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const [groupName, setGroupName] = useState('');
  const [friends, setFriends] = useState<any[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadFriends();
  }, []);

  const loadFriends = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/chat/friends');
      const rawFriends = res.data?.data || res.data || [];
      
      const tempFriends = rawFriends.map((item: any) => {
        const targetId = item.userId === user?.id ? item.sellerId : item.userId;
        const fullName = item.participantName || item.sellerName || item.fullName || targetId;
        return {
          id: targetId,
          fullName,
          conversationId: item.conversationId,
        };
      });

      // Collect unique user IDs to resolve
      const uniqueIds = Array.from(new Set(tempFriends.map((f: any) => f.id).filter(Boolean))) as string[];
      const resolvedNames: Record<string, string> = {};

      if (uniqueIds.length > 0) {
        await Promise.all(uniqueIds.map(async (id) => {
          try {
            const userRes = await apiClient.get(`/users/${id}`);
            const userData = userRes.data?.data || userRes.data;
            if (userData && userData.fullName) {
              resolvedNames[id] = userData.fullName;
            }
          } catch (e) {
            console.warn(`Resolve user ${id} in CreateGroupScreen failed:`, e);
          }
        }));
      }

      // Map with resolved names
      const mappedFriends = tempFriends.map((f: any) => ({
        ...f,
        fullName: resolvedNames[f.id] || f.fullName,
      }));

      setFriends(mappedFriends);
    } catch (e) {
      console.warn('Load friends failed', e);
    } finally {
      setLoading(false);
    }
  };

  const toggleMember = (userId: string) => {
    if (selectedMembers.includes(userId)) {
      setSelectedMembers(prev => prev.filter(id => id !== userId));
    } else {
      setSelectedMembers(prev => [...prev, userId]);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      return Alert.alert('Lỗi', 'Vui lòng nhập tên nhóm');
    }
    if (selectedMembers.length < 2) {
      return Alert.alert('Lỗi', 'Vui lòng chọn ít nhất 2 thành viên khác ngoài bạn');
    }

    setSubmitting(true);
    try {
      const res = await apiClient.post('/chat/groups', {
        name: groupName.trim(),
        initialMemberIds: selectedMembers
      });

      if (res.data.success) {
        Alert.alert('Thành công', 'Đã tạo nhóm thành công');
        navigation.navigate('GroupChatScreen', {
          groupId: res.data.data.groupId || res.data.data.id,
          groupName: groupName.trim()
        });
      }
    } catch (err: any) {
      Alert.alert('Lỗi', err.response?.data?.error || 'Không thể tạo nhóm');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredFriends = friends.filter(f =>
    f.fullName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderFriend = ({ item }: { item: any }) => {
    const isSelected = selectedMembers.includes(item.id);
    return (
      <TouchableOpacity
        onPress={() => toggleMember(item.id)}
        className="flex-row items-center justify-between p-4 bg-white border-b border-gray-50"
      >
        <View className="flex-row items-center">
          <View className="w-12 h-12 bg-orange-100 rounded-full items-center justify-center mr-3 border border-orange-200">
            <Text className="text-primary font-bold">{item.fullName?.charAt(0) || 'U'}</Text>
          </View>
          <Text className="text-base font-bold text-gray-800">{item.fullName || 'Người dùng ZORA'}</Text>
        </View>
        <View className={`w-6 h-6 rounded-full items-center justify-center border-2 ${isSelected ? 'bg-primary border-primary' : 'border-gray-200'}`}>
          {isSelected && <Check size={14} color="#fff" strokeWidth={3} />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-gray-100 justify-between">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 mr-2">
            <ChevronLeft size={24} color={COLORS.secondary} />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-secondary">Tạo nhóm mới</Text>
        </View>
        <TouchableOpacity
          onPress={handleCreateGroup}
          disabled={submitting}
          className={`px-4 py-2 rounded-xl ${(!groupName.trim() || selectedMembers.length < 2) ? 'bg-gray-100' : 'bg-primary'}`}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text className={`font-bold ${(!groupName.trim() || selectedMembers.length < 2) ? 'text-gray-400' : 'text-white'}`}>Tạo</Text>
          )}
        </TouchableOpacity>
      </View>

      <View className="p-4 bg-gray-50/50">
        <View className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex-row items-center">
          <View className="w-16 h-16 bg-gray-50 rounded-2xl items-center justify-center border border-dashed border-gray-300 mr-4">
            <Users size={24} color="#9ca3af" />
          </View>
          <TextInput
            className="flex-1 text-lg font-bold text-secondary"
            placeholder="Tên nhóm..."
            value={groupName}
            onChangeText={setGroupName}
            autoFocus
          />
        </View>
      </View>

      <View className="px-4 py-3 border-b border-gray-100">
        <View className="flex-row items-center bg-gray-50 px-4 py-2.5 rounded-2xl border border-gray-100">
          <Search size={18} color="#9ca3af" />
          <TextInput
            className="flex-1 ml-3 text-sm font-medium"
            placeholder="Tìm bạn bè tham gia..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        {selectedMembers.length > 0 && (
          <Text className="text-[11px] text-gray-400 font-bold mt-2 uppercase tracking-widest pl-1">
            Đã chọn: {selectedMembers.length} thành viên
          </Text>
        )}
      </View>

      <View className="flex-1">
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} className="mt-10" />
        ) : (
          <FlatList
            data={filteredFriends}
            renderItem={renderFriend}
            keyExtractor={item => item.id}
            ListEmptyComponent={
              <View className="items-center justify-center py-10 px-10">
                <Text className="text-gray-400 text-center">Không tìm thấy bạn bè nào để thêm vào nhóm</Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}
