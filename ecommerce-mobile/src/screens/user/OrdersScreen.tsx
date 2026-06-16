import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Package, ChevronRight, Clock, Truck, CheckCircle, XCircle, Search } from 'lucide-react-native';
import { orderApi } from '../../features/order/api';
import { Order } from '../../types';
import { COLORS } from '../../constants';

const StatusBadge = ({ status }: { status: string }) => {
  const configs: any = {
    PENDING: { color: COLORS.primary, bg: '#fff7ed', icon: Clock, label: 'Chờ xác nhận' },
    CONFIRMED: { color: '#3b82f6', bg: '#eff6ff', icon: CheckCircle, label: 'Đã xác nhận' },
    SHIPPING: { color: '#a855f7', bg: '#f3e8ff', icon: Truck, label: 'Đang giao' },
    DELIVERED: { color: '#22c55e', bg: '#f0fdf4', icon: CheckCircle, label: 'Đã giao' },
    CANCELLED: { color: COLORS.error, bg: '#fef2f2', icon: XCircle, label: 'Đã hủy' },
  };

  const config = configs[status] || configs.PENDING;
  const Icon = config.icon;

  return (
    <View style={{ backgroundColor: config.bg }} className="flex-row items-center px-3 py-1 rounded-lg self-start">
      <Icon size={10} color={config.color} strokeWidth={3} />
      <Text style={{ color: config.color }} className="text-[10px] font-bold ml-1.5 uppercase tracking-tighter">{config.label}</Text>
    </View>
  );
};

const OrdersScreen = ({ navigation }: any) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = async () => {
    try {
      const data = await orderApi.getOrders();
      setOrders(data || []);
    } catch (error) {
      console.error('Failed to fetch orders', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  };

  const renderItem = ({ item }: { item: Order }) => (
    <TouchableOpacity 
      activeOpacity={0.7}
      className="bg-white p-5 rounded-[32px] mb-4 shadow-sm border border-gray-100"
      onPress={() => {/* Navigation logic for order details can go here */}}
    >
      <View className="flex-row justify-between items-center mb-4">
        <View className="flex-row items-center">
          <View className="bg-orange-50 p-2 rounded-xl mr-3">
             <Package size={18} color={COLORS.primary} />
          </View>
          <View>
             <Text className="text-secondary font-bold text-sm tracking-tight">Đơn hàng #{item.id.slice(-6).toUpperCase()}</Text>
             <Text className="text-gray-400 text-[10px] font-medium">{new Date(item.createdAt).toLocaleDateString('vi-VN')} • {item.items.length} sản phẩm</Text>
          </View>
        </View>
        <StatusBadge status={item.status} />
      </View>

      <View className="h-[1px] bg-gray-50 mb-4" />

      <View className="flex-row justify-between items-center">
        <View className="flex-row items-center">
           <View className="flex-row">
              {item.items.slice(0, 3).map((oi: any, idx) => (
                 <View key={idx} className={`w-8 h-8 rounded-lg bg-gray-50 border border-white items-center justify-center ${idx > 0 ? 'ml-[-12px]' : ''} shadow-sm`}>
                    <Package size={14} color="#d1d5db" />
                 </View>
              ))}
           </View>
           {item.items.length > 3 && (
              <Text className="text-gray-400 text-[10px] font-bold ml-2">+{item.items.length - 3}</Text>
           )}
        </View>
        <View className="items-end">
           <Text className="text-gray-400 text-[9px] font-bold uppercase tracking-tighter mb-0.5">Tổng thanh toán</Text>
           <Text className="text-secondary font-bold text-lg">₫{item.totalPrice.toLocaleString()}</Text>
        </View>
      </View>
      
      <View className="flex-row mt-4 pt-4 border-t border-gray-50 justify-between items-center">
         <TouchableOpacity className="bg-gray-50 px-4 py-2 rounded-xl">
            <Text className="text-secondary font-bold text-[10px]">Mua lại</Text>
         </TouchableOpacity>
         <View className="flex-row items-center">
            <Text className="text-primary font-bold text-[10px] mr-1">Xem chi tiết</Text>
            <ChevronRight size={14} color={COLORS.primary} />
         </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="flex-1 bg-gray-50/50">
        <View className="px-6 pt-6 pb-6 bg-white rounded-b-[40px] shadow-sm flex-row justify-between items-end border-b border-gray-50">
           <View>
             <Text className="text-secondary font-bold text-3xl tracking-tighter">Đơn hàng</Text>
             <Text className="text-gray-400 font-medium text-xs mt-1">Lịch sử mua sắm của bạn</Text>
           </View>
           <TouchableOpacity className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
              <Search size={20} color={COLORS.secondary} />
           </TouchableOpacity>
        </View>

        <FlatList
          data={orders}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          className="mt-2"
          ListEmptyComponent={() => (
            <View className="py-24 items-center justify-center">
              <View className="bg-gray-50 p-10 rounded-full mb-6">
                <Package size={64} color="#e5e7eb" strokeWidth={1} />
              </View>
              <Text className="text-secondary font-bold text-xl tracking-tight">Chưa có đơn hàng nào</Text>
              <Text className="text-gray-400 mt-2 font-medium text-center px-10 leading-5">Hãy bắt đầu mua sắm để lấp đầy lịch sử này bạn nhé!</Text>
              <TouchableOpacity 
                onPress={() => navigation.navigate('Home')}
                className="mt-8 bg-primary px-8 py-3 rounded-2xl shadow-lg shadow-orange-500/20"
              >
                 <Text className="text-white font-bold uppercase tracking-widest text-xs">Mua sắm ngay</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
};

export default OrdersScreen;
