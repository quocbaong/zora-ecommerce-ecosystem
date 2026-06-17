import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert,
  RefreshControl 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, Plus, ChevronRight, Home, Briefcase, MoreVertical, Trash2, Edit2 } from 'lucide-react-native';
import { userApi } from '../../features/user/api';
import { ShippingAddress } from '../../types';
import { COLORS } from '../../constants';

export default function AddressListScreen({ route, navigation }: any) {
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAddresses = async () => {
    try {
      const data = await userApi.getAddresses();
      setAddresses(data || []);
    } catch (error) {
      console.error('Fetch addresses error:', error);
      Alert.alert('Lỗi', 'Không thể lấy danh sách địa chỉ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAddresses();
    setRefreshing(false);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Xóa địa chỉ', 'Bạn có chắc chắn muốn xóa địa chỉ này?', [
      { text: 'Hủy', style: 'cancel' },
      { 
        text: 'Xóa', 
        style: 'destructive', 
        onPress: async () => {
          try {
            await userApi.deleteAddress(id);
            fetchAddresses();
          } catch (error) {
            Alert.alert('Lỗi', 'Không thể xóa địa chỉ');
          }
        } 
      },
    ]);
  };

  const isSelectionMode = route.params?.isSelectionMode || false;

  const handleSelect = (item: any) => {
    if (isSelectionMode) {
      navigation.navigate('Checkout', { selectedAddress: item });
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      activeOpacity={isSelectionMode ? 0.7 : 1}
      onPress={() => handleSelect(item)}
      className="bg-white p-5 rounded-[32px] mb-4 shadow-sm border border-gray-100"
    >
      <View className="flex-row items-start">
        <View className="bg-orange-50 p-3 rounded-2xl mr-4">
           {item.type === 'OFFICE' ? <Briefcase size={20} color={COLORS.primary} /> : <Home size={20} color={COLORS.primary} />}
        </View>
        <View className="flex-1">
          <View className="flex-row justify-between items-center mb-1">
            <Text className="text-secondary font-bold text-base tracking-tight">{item.receiverName || item.fullName}</Text>
            {item.default && (
               <View className="bg-green-50 px-2 py-1 rounded-lg">
                  <Text className="text-green-600 text-[8px] font-bold uppercase">Mặc định</Text>
               </View>
            )}
          </View>
          <Text className="text-gray-400 text-xs font-medium mb-2">{item.phone || item.phoneNumber}</Text>
          <Text className="text-secondary text-sm leading-5 font-medium pr-8">
            {item.street}, {item.ward}, {item.district}, {item.province}
          </Text>
        </View>
      </View>

      <View className="flex-row mt-4 pt-4 border-t border-gray-50 justify-between items-center">
         <View className="flex-row">
            <TouchableOpacity 
               onPress={() => handleDelete(item.id)}
               className="bg-red-50 p-2.5 rounded-xl mr-3"
            >
               <Trash2 size={16} color="#ef4444" />
            </TouchableOpacity>
            <TouchableOpacity 
               onPress={() => navigation.navigate('AddressForm', { address: item })}
               className="bg-gray-50 p-2.5 rounded-xl"
            >
               <Edit2 size={16} color={COLORS.secondary} />
            </TouchableOpacity>
         </View>
         
         {!item.default && (
            <TouchableOpacity className="bg-secondary px-4 py-2 rounded-xl">
               <Text className="text-white font-bold text-[10px]">Đặt mặc định</Text>
            </TouchableOpacity>
         )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="flex-1 bg-gray-50/50">
        <View className="px-6 pt-6 pb-6 bg-white rounded-b-[40px] shadow-sm flex-row justify-between items-end border-b border-gray-50">
           <View>
             <Text className="text-secondary font-bold text-3xl tracking-tighter">Sổ địa chỉ</Text>
             <Text className="text-gray-400 font-medium text-xs mt-1">Nơi nhận hàng của bạn</Text>
           </View>
           <TouchableOpacity 
              onPress={() => navigation.navigate('AddAddress')}
              className="bg-primary p-3 rounded-2xl shadow-lg shadow-orange-500/20"
            >
              <Plus size={20} color="#fff" />
           </TouchableOpacity>
        </View>

        {loading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <FlatList
            data={addresses}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
            ListEmptyComponent={() => (
              <View className="py-24 items-center justify-center">
                <View className="bg-gray-50 p-10 rounded-full mb-6">
                  <MapPin size={64} color="#e5e7eb" strokeWidth={1} />
                </View>
                <Text className="text-secondary font-bold text-xl tracking-tight">Chưa có địa chỉ nào</Text>
                <Text className="text-gray-400 mt-2 font-medium text-center px-10 leading-5">Vui lòng thêm địa chỉ nhận hàng để ZORA có thể phục vụ bạn tốt nhất!</Text>
                <TouchableOpacity 
                  onPress={() => navigation.navigate('AddAddress')}
                  className="mt-8 bg-primary px-8 py-3 rounded-2xl shadow-lg shadow-orange-500/20"
                >
                   <Text className="text-white font-bold uppercase tracking-widest text-xs">Thêm địa chỉ mới</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
