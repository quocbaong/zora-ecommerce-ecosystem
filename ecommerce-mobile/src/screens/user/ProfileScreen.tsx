import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../contexts/authContext';
import apiClient from '../../api/client';
import * as ImagePicker from 'expo-image-picker';
import { 
  User, 
  Camera, 
  ChevronRight, 
  LogOut, 
  Key, 
  UserCog, 
  Package, 
  ShieldCheck,
  CreditCard,
  MapPin,
  Settings,
  Store,
  BarChart3,
  PlusCircle
} from 'lucide-react-native';
import { COLORS } from '../../constants';
import { useCartStore } from '../../store/cartStore';
import { orderApi } from '../../features/order/api';
import { productApi } from '../../features/product/api';

export default function ProfileScreen({ navigation }: any) {
  const { user, logout } = useAuthStore();
  const cartCount = useCartStore((state) => state.getItemCount());
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<any>({ orders: 0, products: 0, vouchers: 0 });

  const isSeller = user?.role === 'SELLER';

  const fetchStats = async () => {
    try {
      if (user?.role === 'SELLER') {
        const products = await productApi.getProductsBySeller(user.id);
        setStats({
          products: products.length,
          orders: 0, // Placeholder for seller orders
          revenue: 0,
        });
      } else {
        const orders = await orderApi.getOrders();
        setStats({
          orders: (orders || []).length,
          vouchers: 0,
        });
      }
    } catch (error) {
      console.error('Fetch stats error:', error);
    }
  };

  const fetchProfile = async () => {
    try {
      const response = await apiClient.get('/users/me');
      setProfile(response.data);
    } catch (error) {
      console.error('Fetch profile error:', error);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchStats();
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchProfile(), fetchStats()]);
    setRefreshing(false);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Lỗi', 'Cần quyền truy cập thư viện ảnh để đổi avatar');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets[0].uri) {
      uploadAvatar(result.assets[0].uri);
    }
  };

  const uploadAvatar = async (uri: string) => {
    setLoading(true);
    try {
      const formData = new FormData();
      const filename = uri.split('/').pop() || 'avatar.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image`;
      
      // @ts-ignore
      formData.append('file', { uri, name: filename, type });

      await apiClient.post('/users/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      Alert.alert('Thành công', 'Đổi ảnh đại diện thành công!');
      fetchProfile();
    } catch (error: any) {
      console.error('Upload avatar error:', error);
      Alert.alert('Lỗi', 'Không thể tải ảnh lên. Kiểm tra cấu hình S3 của Backend.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: logout },
    ]);
  };

  const displayUser = profile || user;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <ScrollView 
        className="flex-1 bg-gray-50/50"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {/* Header Profile 2.0 */}
        <View className="bg-white px-6 pb-10 pt-4 rounded-b-[48px] shadow-sm border-b border-gray-100">
           <View className="flex-row items-center justify-between mb-8">
              <View>
                 <Text className="text-secondary font-bold text-3xl tracking-tighter">Cá nhân</Text>
                 <Text className="text-gray-400 font-medium text-[10px] mt-0.5 uppercase tracking-widest">Trung tâm quản lý ZORA</Text>
              </View>
              <TouchableOpacity className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                 <Settings size={20} color={COLORS.secondary} />
              </TouchableOpacity>
           </View>

          <View className="flex-row items-center">
            <View className="relative">
              <View className="w-24 h-24 rounded-full bg-gray-50 overflow-hidden border-4 border-orange-50 items-center justify-center">
                {displayUser?.avatarUrl ? (
                  <Image source={{ uri: displayUser.avatarUrl }} className="w-full h-full" />
                ) : (
                  <User size={48} color="#e5e7eb" />
                )}
              </View>
              <TouchableOpacity 
                onPress={pickImage}
                disabled={loading}
                className="absolute bottom-0 right-0 bg-primary p-2.5 rounded-full border-4 border-white shadow-sm"
              >
                {loading ? <ActivityIndicator size="small" color="#fff" /> : <Camera size={16} color="#fff" />}
              </TouchableOpacity>
            </View>

            <View className="ml-5 flex-1">
              <Text className="text-xl font-bold text-secondary tracking-tight">
                {displayUser?.fullName || 'Người dùng ZORA'}
              </Text>
              <View className="flex-row items-center mt-1">
                <View className="bg-secondary px-2.5 py-1 rounded-lg mr-2">
                   <Text className="text-white text-[9px] font-bold uppercase tracking-widest">{displayUser?.role || 'Basic'}</Text>
                </View>
                <Text className="text-gray-400 text-xs font-medium truncate" numberOfLines={1}>{displayUser?.email}</Text>
              </View>
            </View>
          </View>

          {/* Quick Stats Dynamic */}
          <View className="flex-row mt-8 bg-gray-50 rounded-[28px] p-2 border border-gray-100">
             {isSeller ? (
               <>
                 <TouchableOpacity className="flex-1 items-center py-3">
                    <Text className="text-secondary font-bold text-lg">{stats.products}</Text>
                    <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-tighter">Sản phẩm</Text>
                 </TouchableOpacity>
                 <View className="w-[1px] h-8 bg-gray-200 self-center" />
                 <TouchableOpacity className="flex-1 items-center py-3">
                    <Text className="text-secondary font-bold text-lg">{stats.orders}</Text>
                    <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-tighter">Chờ xử lý</Text>
                 </TouchableOpacity>
                 <View className="w-[1px] h-8 bg-gray-200 self-center" />
                 <TouchableOpacity className="flex-1 items-center py-3">
                    <Text className="text-secondary font-bold text-lg">0</Text>
                    <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-tighter">Đánh giá</Text>
                 </TouchableOpacity>
               </>
             ) : (
               <>
                 <TouchableOpacity onPress={() => navigation.navigate('Cart')} className="flex-1 items-center py-3">
                    <Text className="text-secondary font-bold text-lg">{cartCount}</Text>
                    <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-tighter">Giỏ hàng</Text>
                 </TouchableOpacity>
                 <View className="w-[1px] h-8 bg-gray-200 self-center" />
                 <TouchableOpacity onPress={() => navigation.navigate('Orders')} className="flex-1 items-center py-3">
                    <Text className="text-secondary font-bold text-lg">{stats.orders}</Text>
                    <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-tighter">Đơn hàng</Text>
                 </TouchableOpacity>
                 <View className="w-[1px] h-8 bg-gray-200 self-center" />
                 <TouchableOpacity className="flex-1 items-center py-3">
                    <Text className="text-secondary font-bold text-lg">{stats.vouchers || 0}</Text>
                    <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-tighter">Voucher</Text>
                 </TouchableOpacity>
               </>
             )}
          </View>
        </View>

        {/* Menu Sections Dynamic */}
        <View className="p-6">
          {isSeller ? (
            <>
              <SectionTitle title="Kênh Người Bán" />
              <View className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-gray-50 mb-8">
                <MenuOption 
                  icon={<Store size={20} color={COLORS.primary} />} 
                  title="Danh sách sản phẩm" 
                  onPress={() => navigation.navigate('SellerProducts')} 
                />
                <MenuOption 
                  icon={<PlusCircle size={20} color={COLORS.primary} />} 
                  title="Thêm sản phẩm mới" 
                  onPress={() => navigation.navigate('AddProduct')} 
                />
                <MenuOption 
                  icon={<BarChart3 size={20} color={COLORS.primary} />} 
                  title="Báo cáo doanh thu" 
                  onPress={() => {}} 
                  isLast 
                />
              </View>
            </>
          ) : (
            <>
              <SectionTitle title="Giao dịch của tôi" />
              <View className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-gray-50 mb-8">
                <MenuOption 
                  icon={<Package size={20} color={COLORS.secondary} />} 
                  title="Lịch sử đơn hàng" 
                  onPress={() => navigation.navigate('Orders')} 
                />
                <MenuOption 
                  icon={<CreditCard size={20} color={COLORS.secondary} />} 
                  title="Phương thức thanh toán" 
                  onPress={() => {}} 
                />
                <MenuOption 
                  icon={<MapPin size={20} color={COLORS.secondary} />} 
                  title="Sổ địa chỉ" 
                  onPress={() => navigation.navigate('AddressList')} 
                  isLast 
                />
              </View>
            </>
          )}

          <SectionTitle title="Tài khoản" />
          <View className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-gray-50 mb-8">
            <MenuOption 
              icon={<UserCog size={20} color={COLORS.secondary} />} 
              title="Chỉnh sửa hồ sơ" 
              onPress={() => navigation.navigate('EditProfile')} 
            />
            <MenuOption 
              icon={<Key size={20} color={COLORS.secondary} />} 
              title="Đổi mật khẩu" 
              onPress={() => navigation.navigate('ChangePassword')} 
            />
            <MenuOption 
              icon={<ShieldCheck size={20} color={COLORS.secondary} />} 
              title="Cài đặt thông báo" 
              onPress={() => {}} 
              isLast 
            />
          </View>

          <TouchableOpacity 
            onPress={handleLogout}
            className="bg-white flex-row items-center justify-center py-5 rounded-[24px] border border-red-50 mb-8"
          >
            <LogOut size={20} color={COLORS.error} />
            <Text className="text-red-500 font-bold ml-3 text-base">Đăng xuất tài khoản</Text>
          </TouchableOpacity>
          
          <View className="items-center pb-20">
            <Text className="text-gray-300 text-[10px] font-bold tracking-widest uppercase">ZORA Mobile Edition • v1.2.4</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <Text className="text-gray-400 font-bold mb-4 ml-4 text-[10px] uppercase tracking-widest">{title}</Text>
  );
}

function MenuOption({ icon, title, onPress, isLast, titleStyle = "text-secondary" }: any) {
  return (
    <TouchableOpacity 
      onPress={onPress}
      activeOpacity={0.6}
      className={`flex-row items-center p-5 ${!isLast ? 'border-b border-gray-50' : ''}`}
    >
      <View className="w-10 h-10 items-center justify-center bg-gray-50/50 rounded-xl mr-2">{icon}</View>
      <Text className={`flex-1 text-sm font-bold ${titleStyle}`}>{title}</Text>
      <ChevronRight size={18} color="#e5e7eb" />
    </TouchableOpacity>
  );
}
