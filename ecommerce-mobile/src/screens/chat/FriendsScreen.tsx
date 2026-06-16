import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, ActivityIndicator, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, UserPlus, Users, Check, X, ChevronLeft, QrCode, ScanLine } from 'lucide-react-native';
import apiClient from '../../api/client';
import { useAuthStore } from '../../contexts/authContext';
import { COLORS } from '../../constants';

export default function FriendsScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'search'>('friends');
  const [friends, setFriends] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadFriends = async () => {
    setLoading(true);
    try {
      // 1. Get accepted friends list
      const res = await apiClient.get('/chat/friends');
      const rawFriends = res.data?.data || res.data || [];
      
      // 2. Get pending friend requests from conversation list
      const convsRes = await apiClient.get('/chat/conversations');
      const convs = convsRes.data?.data || convsRes.data || [];
      const pendingRequests = convs.filter((c: any) => c.friendshipStatus === 'PENDING');

      // Collect all user IDs that need name resolution
      const userIdsToResolve: string[] = [];

      const tempFriends = rawFriends.map((item: any) => {
        const targetId = item.userId === user?.id ? item.sellerId : item.userId;
        const fullName = item.participantName || item.sellerName || item.fullName || targetId;
        if (targetId) {
          userIdsToResolve.push(targetId);
        }
        return {
          id: targetId,
          fullName,
          conversationId: item.conversationId,
        };
      });

      const tempRequests = pendingRequests.map((c: any) => {
        const isSender = c.requestSentBy === user?.id;
        const targetId = c.userId === user?.id ? c.sellerId : c.userId;
        const peerName = c.participantName || c.sellerName || c.fullName || targetId;
        if (targetId) {
          userIdsToResolve.push(targetId);
        }
        return {
          id: c.conversationId,
          senderId: c.requestSentBy,
          conversationId: c.conversationId,
          peerId: targetId,
          isSender,
          peerName,
        };
      });

      // Resolve profiles/names via API
      const uniqueIds = Array.from(new Set(userIdsToResolve.filter(id => id)));
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
            console.warn(`Resolve user ${id} failed:`, e);
          }
        }));
      }
      // Map with resolved names
      const mappedFriends = tempFriends.map((f: any) => ({
        ...f,
        fullName: resolvedNames[f.id] || f.fullName,
      }));

      const mappedRequests = tempRequests.map((r: any) => {
        const resolvedPeerName = resolvedNames[r.peerId] || r.peerName;
        return {
          id: r.id,
          senderId: r.senderId,
          conversationId: r.conversationId,
          sender: {
            fullName: r.isSender ? user?.fullName : resolvedPeerName,
          },
          receiver: {
            fullName: r.isSender ? resolvedPeerName : user?.fullName,
          }
        };
      });

      setFriends(mappedFriends);
      setRequests(mappedRequests);
    } catch (e) {
      console.warn('Load friends/requests failed:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFriends();
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const res = await apiClient.get(`/chat/users/search?email=${encodeURIComponent(searchQuery.trim())}`);
      const userData = res.data?.data || res.data;
      if (userData && userData.id) {
        if (userData.id !== user?.id) {
          setSearchResults([{
            id: userData.id,
            fullName: userData.fullName || userData.email || 'Người dùng ZORA',
            email: userData.email
          }]);
        } else {
          setSearchResults([]);
          Alert.alert('Thông báo', 'Bạn không thể tìm kiếm chính mình');
        }
      } else {
        setSearchResults([]);
      }
    } catch (e) {
      console.warn(e);
      setSearchResults([]);
      Alert.alert('Không tìm thấy', 'Không tìm thấy người dùng với email này');
    } finally {
      setLoading(false);
    }
  };

  const handleAddFriend = async (userId: string) => {
    try {
      await apiClient.post('/chat/friends/request', { toUserId: userId });
      Alert.alert('Thành công', 'Đã gửi lời mời kết bạn');
      loadFriends();
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể gửi lời mời');
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await apiClient.post('/chat/friends/accept', { conversationId: requestId });
      Alert.alert('Thành công', 'Đã chấp nhận kết bạn');
      loadFriends();
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể chấp nhận');
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await apiClient.delete(`/chat/conversations/${requestId}`);
      loadFriends();
    } catch (e) {
      console.warn(e);
    }
  };

  const renderFriend = ({ item }: { item: any }) => (
    <View className="flex-row items-center justify-between p-4 bg-white border-b border-gray-50">
      <View className="flex-row items-center">
        <View className="w-12 h-12 bg-orange-100 rounded-full items-center justify-center mr-3 border border-orange-200">
          <Text className="text-primary font-bold">{item.fullName?.charAt(0) || 'U'}</Text>
        </View>
        <Text className="text-base font-bold text-gray-800">{item.fullName || 'Người dùng ZORA'}</Text>
      </View>
      <TouchableOpacity
        className="px-4 py-2 bg-primary rounded-xl"
        onPress={() => navigation.navigate('ChatDetail', {
          conversationId: item.conversationId,
          participantName: item.fullName
        })}
      >
        <Text className="text-white text-xs font-bold">Nhắn tin</Text>
      </TouchableOpacity>
    </View>
  );

  const renderRequest = ({ item }: { item: any }) => {
    const isSender = item.senderId === user?.id;
    return (
      <View className="flex-row items-center justify-between p-4 bg-white border-b border-gray-50">
        <View className="flex-row items-center flex-1">
          <View className="w-12 h-12 bg-orange-100 rounded-full items-center justify-center mr-3 border border-orange-200">
            <Text className="text-primary font-bold">{item.sender?.fullName?.charAt(0) || item.receiver?.fullName?.charAt(0) || 'U'}</Text>
          </View>
          <View>
            <Text className="text-base font-bold text-gray-800">{isSender ? item.receiver?.fullName : item.sender?.fullName}</Text>
            <Text className="text-xs text-gray-500">{isSender ? 'Đã gửi lời mời' : 'Đang chờ phản hồi'}</Text>
          </View>
        </View>
        {!isSender ? (
          <View className="flex-row">
            <TouchableOpacity onPress={() => handleAcceptRequest(item.id)} className="w-10 h-10 bg-primary items-center justify-center rounded-full mr-2">
              <Check size={18} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleRejectRequest(item.id)} className="w-10 h-10 bg-gray-100 items-center justify-center rounded-full">
              <X size={18} color={COLORS.secondary} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={() => handleRejectRequest(item.id)} className="px-3 py-1.5 bg-gray-100 rounded-lg">
            <Text className="text-xs text-secondary font-bold">Hủy yêu cầu</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderSearch = ({ item }: { item: any }) => (
    <View className="flex-row items-center justify-between p-4 bg-white border-b border-gray-50">
      <View className="flex-row items-center flex-1">
        <View className="w-12 h-12 bg-orange-100 rounded-full items-center justify-center mr-3 border border-orange-200">
          <Text className="text-primary font-bold">{item.fullName?.charAt(0) || 'U'}</Text>
        </View>
        <Text className="text-base font-bold text-gray-800">{item.fullName || 'Người dùng ZORA'}</Text>
      </View>
      <TouchableOpacity onPress={() => handleAddFriend(item.id)} className="px-4 py-2 bg-orange-100 rounded-xl flex-row items-center">
        <UserPlus size={14} color={COLORS.primary} />
        <Text className="text-primary text-xs font-bold ml-1">Thêm</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-gray-100">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 mr-2">
          <ChevronLeft size={24} color={COLORS.secondary} />
        </TouchableOpacity>
        <Text className="flex-1 text-xl font-bold text-secondary">Bạn bè</Text>
        <View className="flex-row gap-1">
          <TouchableOpacity onPress={() => navigation.navigate('QRScannerScreen')} className="p-2 bg-gray-50 rounded-full">
            <ScanLine size={20} color={COLORS.secondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('MyQRCodeScreen')} className="p-2 bg-orange-50 rounded-full">
            <QrCode size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View className="flex-row px-4 py-3 gap-3">
        <TouchableOpacity
          className={`flex-1 py-3 rounded-2xl items-center ${activeTab === 'friends' ? 'bg-primary' : 'bg-gray-50'}`}
          onPress={() => setActiveTab('friends')}
        >
          <Text className={`font-bold ${activeTab === 'friends' ? 'text-white' : 'text-gray-500'}`}>Danh sách</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`flex-1 py-3 rounded-2xl items-center flex-row justify-center ${activeTab === 'requests' ? 'bg-primary' : 'bg-gray-50'}`}
          onPress={() => setActiveTab('requests')}
        >
          <Text className={`font-bold ${activeTab === 'requests' ? 'text-white' : 'text-gray-500'}`}>Lời mời</Text>
          {requests.length > 0 && activeTab !== 'requests' && (
            <View className="ml-2 w-5 h-5 bg-red-500 rounded-full items-center justify-center">
              <Text className="text-white text-[10px] font-bold">{requests.length}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          className={`flex-1 py-3 rounded-2xl items-center ${activeTab === 'search' ? 'bg-primary' : 'bg-gray-50'}`}
          onPress={() => setActiveTab('search')}
        >
          <Text className={`font-bold ${activeTab === 'search' ? 'text-white' : 'text-gray-500'}`}>Tìm kiếm</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View className="flex-1 bg-gray-50/50 pt-2">
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} className="mt-10" />
        ) : activeTab === 'friends' ? (
          <FlatList data={friends} renderItem={renderFriend} keyExtractor={item => item.id} />
        ) : activeTab === 'requests' ? (
          <FlatList data={requests} renderItem={renderRequest} keyExtractor={item => item.id} />
        ) : (
          <View className="flex-1">
            <View className="px-4 py-2 mb-2">
              <View className="flex-row items-center bg-white px-4 py-3 rounded-2xl border border-gray-200">
                <Search size={18} color="#9ca3af" />
                <TextInput
                  className="flex-1 ml-3 text-sm font-medium"
                  placeholder="Nhập tên hoặc email..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onSubmitEditing={handleSearch}
                />
                <TouchableOpacity onPress={handleSearch}>
                  <Text className="text-primary font-bold ml-2">Tìm</Text>
                </TouchableOpacity>
              </View>
            </View>
            <FlatList data={searchResults} renderItem={renderSearch} keyExtractor={item => item.id} />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
