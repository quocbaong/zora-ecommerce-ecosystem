import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  RefreshControl,
  ScrollView,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Bell, 
  ShoppingBag, 
  Info, 
  CreditCard, 
  Truck, 
  CheckCircle2,
  ChevronLeft,
  Calendar,
  Settings,
  MessageCircle
} from 'lucide-react-native';
import { useNotificationStore } from '../store/notificationStore';
import { Notification } from '../types';
import { COLORS } from '../constants';

const NotificationIcon = ({ type }: { type: string }) => {
  const configs: any = {
    ORDER_CREATED: { color: '#3b82f6', bg: '#eff6ff', icon: ShoppingBag },
    PAYMENT_SUCCESS: { color: '#22c55e', bg: '#f0fdf4', icon: CreditCard },
    ORDER_SHIPPED: { color: '#a855f7', bg: '#f3e8ff', icon: Truck },
    SYSTEM_ALERT: { color: COLORS.error, bg: '#fef2f2', icon: Info },
    PROMOTION: { color: COLORS.primary, bg: '#fff7ed', icon: Bell },
    CHAT: { color: '#ec4899', bg: '#fdf2f8', icon: MessageCircle }
  };

  const config = configs[type] || { color: '#6b7280', bg: '#f3f4f6', icon: Info };
  const Icon = config.icon;

  return (
    <View style={{ backgroundColor: config.bg }} className="w-14 h-14 rounded-[20px] items-center justify-center shadow-sm border border-gray-100">
      <Icon size={24} color={config.color} strokeWidth={2} />
    </View>
  );
};

const TABS = [
  { id: 'ALL', label: 'Tất cả' },
  { id: 'ORDER', label: 'Cập nhật đơn hàng' },
  { id: 'PROMOTION', label: 'Khuyến mãi' },
  { id: 'CHAT', label: 'Chat' },
];

const NotificationScreen = ({ navigation }: any) => {
  const { notifications, fetchNotifications, markAsRead, markAllAsRead } = useNotificationStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('ALL');

  useEffect(() => {
    fetchNotifications().finally(() => setLoading(false));
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'ORDER') return n.type.includes('ORDER') || n.type.includes('PAYMENT');
    if (activeTab === 'PROMOTION') return n.type === 'PROMOTION';
    if (activeTab === 'CHAT') return n.type === 'CHAT';
    return true;
  });

  const renderItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity 
      activeOpacity={0.7}
      onPress={() => markAsRead(item.id)}
      className={`flex-row p-5 mb-3 mx-4 rounded-3xl items-center border shadow-sm ${!item.isRead ? 'bg-[#FFF9F6] border-orange-100' : 'bg-white border-gray-100'}`}
    >
      <NotificationIcon type={item.type} />
      <View className="flex-1 ml-4">
        <View className="flex-row justify-between items-center mb-1">
          <Text className={`text-sm tracking-tight flex-1 mr-2 ${!item.isRead ? 'font-bold text-secondary' : 'text-gray-500 font-semibold'}`} numberOfLines={1}>
            {item.title}
          </Text>
          {!item.isRead && (
            <View className="bg-primary px-1.5 py-0.5 rounded-full">
              <Text className="text-white text-[7px] font-bold uppercase">New</Text>
            </View>
          )}
        </View>
        <Text className="text-gray-400 text-xs mb-2 leading-5" numberOfLines={2}>
          {item.message}
        </Text>
        <View className="flex-row items-center">
           <Calendar size={10} color="#d1d5db" className="mr-1" />
           <Text className="text-gray-300 text-[9px] font-medium">
             {new Date(item.createdAt).toLocaleString('vi-VN')}
           </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="flex-1 bg-gray-50/30">
        <View className="px-6 py-4 bg-white shadow-sm flex-row justify-between items-end border-b border-gray-50">
           <View>
             <Text className="text-secondary font-bold text-3xl tracking-tighter">Thông báo</Text>
             <Text className="text-gray-400 font-medium text-xs mt-1">Tin mới từ hệ thống ZORA</Text>
           </View>
           <View className="flex-row gap-2">
              <TouchableOpacity 
                onPress={() => markAllAsRead()}
                className="bg-gray-50 p-3 rounded-2xl border border-gray-100"
              >
                <CheckCircle2 size={20} color="#9ca3af" />
              </TouchableOpacity>
              <TouchableOpacity className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                <Settings size={20} color="#9ca3af" />
              </TouchableOpacity>
           </View>
        </View>

        {/* Tabs */}
        <View className="bg-white rounded-b-[40px] pb-4 shadow-sm z-10">
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16 }}
          >
            {TABS.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  onPress={() => setActiveTab(tab.id)}
                  className={`mr-3 px-5 py-2.5 rounded-full ${isActive ? 'bg-primary shadow-sm shadow-orange-500/20' : 'bg-gray-50 border border-gray-100'}`}
                >
                  <Text className={`text-[12px] font-bold ${isActive ? 'text-white' : 'text-gray-500'}`}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color={COLORS.primary} size="large" />
          </View>
        ) : (
          <FlatList
            data={filteredNotifications}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingVertical: 20, paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
            ListEmptyComponent={() => (
              <View className="py-24 items-center justify-center">
                <View className="bg-orange-50 p-10 rounded-full mb-6">
                  <Bell size={64} color={COLORS.primary} strokeWidth={1} />
                </View>
                <Text className="text-secondary font-bold text-xl tracking-tight">Hộp thư trống</Text>
                <Text className="text-gray-400 mt-2 font-medium text-center px-12 leading-5">Không có thông báo nào trong mục này.</Text>
                {activeTab !== 'ALL' && (
                  <TouchableOpacity 
                    onPress={() => setActiveTab('ALL')}
                    className="mt-8 bg-primary px-8 py-3 rounded-2xl shadow-lg shadow-orange-500/20"
                  >
                     <Text className="text-white font-bold uppercase tracking-widest text-xs">Xem tất cả</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

export default NotificationScreen;
