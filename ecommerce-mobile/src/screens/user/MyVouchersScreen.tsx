import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Ticket, Search, CheckCircle2 } from 'lucide-react-native';
import apiClient from '../../api/client';
import { COLORS } from '../../constants';

export default function MyVouchersScreen({ navigation }: any) {
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchVouchers = async () => {
    try {
      // Assuming a mock endpoint or real endpoint for saved vouchers
      // const res = await apiClient.get('/vouchers/saved');
      // setVouchers(res.data?.data || []);
      
      // MOCK DATA for now
      setVouchers([
        { id: '1', code: 'ZORAWELCOME', discountPercent: 20, maxDiscount: 50000, minOrderValue: 0, shopId: null },
        { id: '2', code: 'FREESHIPXTRA', discountPercent: 100, maxDiscount: 30000, minOrderValue: 150000, shopId: null },
      ]);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVouchers();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchVouchers();
    setRefreshing(false);
  };

  const renderItem = ({ item }: { item: any }) => (
    <View className="flex-row bg-white rounded-3xl overflow-hidden mb-4 border border-orange-100 shadow-sm shadow-orange-100">
      <View className="w-24 bg-orange-50 items-center justify-center border-r border-orange-100 border-dashed relative">
         <View className="absolute -top-3 -right-3 w-6 h-6 bg-gray-50 rounded-full" />
         <View className="absolute -bottom-3 -right-3 w-6 h-6 bg-gray-50 rounded-full" />
         <Ticket size={32} color={COLORS.primary} className="mb-2" />
         <Text className="text-primary font-bold text-[10px] uppercase tracking-widest">{item.shopId ? 'Shop' : 'ZORA'}</Text>
      </View>
      <View className="flex-1 p-4 justify-between">
         <View>
            <Text className="text-secondary font-bold text-sm mb-1">Giảm {item.discountPercent}% tối đa {item.maxDiscount/1000}k</Text>
            <Text className="text-gray-400 text-[10px]">Đơn tối thiểu ₫{item.minOrderValue.toLocaleString()}</Text>
         </View>
         <View className="flex-row items-center justify-between mt-3">
            <View className="bg-gray-50 px-2 py-1 rounded-md">
               <Text className="text-gray-500 font-bold text-[9px] tracking-wider">{item.code}</Text>
            </View>
            <TouchableOpacity className="bg-primary px-4 py-1.5 rounded-full shadow-sm shadow-orange-500/30">
               <Text className="text-white font-bold text-[10px]">Dùng ngay</Text>
            </TouchableOpacity>
         </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="flex-1 bg-gray-50/50">
        <View className="px-6 pt-4 pb-6 bg-white rounded-b-[40px] shadow-sm flex-row items-center border-b border-gray-50">
           <TouchableOpacity onPress={() => navigation.goBack()} className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
              <ChevronLeft size={20} color={COLORS.secondary} />
           </TouchableOpacity>
           <View className="ml-4 flex-1">
              <Text className="text-secondary font-bold text-2xl tracking-tighter">Ví Voucher</Text>
              <Text className="text-gray-400 font-medium text-[10px] tracking-wider uppercase">Mã giảm giá đã lưu</Text>
           </View>
           <TouchableOpacity className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
              <Search size={20} color={COLORS.secondary} />
           </TouchableOpacity>
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <FlatList
            data={vouchers}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
            ListEmptyComponent={() => (
              <View className="py-24 items-center justify-center">
                <View className="bg-orange-50 p-10 rounded-full mb-6">
                  <Ticket size={64} color={COLORS.primary} strokeWidth={1} />
                </View>
                <Text className="text-secondary font-bold text-xl tracking-tight">Ví Voucher trống</Text>
                <Text className="text-gray-400 mt-2 font-medium text-center px-10 leading-5">Bạn chưa lưu mã giảm giá nào. Hãy sưu tầm thêm nhé!</Text>
              </View>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
