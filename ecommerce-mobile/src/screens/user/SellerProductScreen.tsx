import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  Image, 
  TouchableOpacity, 
  ActivityIndicator, 
  RefreshControl,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Package, Plus, Search, MoreVertical, Edit2, Trash2, Eye } from 'lucide-react-native';
import { productApi } from '../../features/product/api';
import { useAuthStore } from '../../contexts/authContext';
import { COLORS } from '../../constants';

export default function SellerProductScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMyProducts = async () => {
    try {
      const data = await productApi.getProductsBySeller(user?.id || '');
      setProducts(data || []);
    } catch (error) {
      console.error('Fetch my products error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyProducts();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMyProducts();
    setRefreshing(false);
  };

  const handleDelete = (product: any) => {
    Alert.alert('Xác nhận', `Bạn có chắc muốn ngưng bán "${product.name}"?`, [
      { text: 'Hủy', style: 'cancel' },
      { 
        text: 'Ngưng bán', 
        style: 'destructive', 
        onPress: async () => {
          try {
            await productApi.deleteProduct(product.id);
            Alert.alert('Thành công', 'Sản phẩm đã được ngưng bán');
            fetchMyProducts();
          } catch (error) {
            Alert.alert('Lỗi', 'Không thể xóa sản phẩm. Có thể có đơn hàng đang xử lý.');
          }
        } 
      },
    ]);
  };

  const renderItem = ({ item }: { item: any }) => (
    <View className="bg-white p-4 rounded-[32px] mb-4 shadow-sm border border-gray-100 flex-row">
      <Image 
        source={{ uri: item.images[0] || 'https://via.placeholder.com/150' }} 
        className="w-24 h-24 rounded-2xl bg-gray-50"
      />
      <View className="ml-4 flex-1 justify-between py-1">
        <View>
          <View className="flex-row justify-between items-start">
            <Text className="text-secondary font-bold text-sm flex-1 pr-2" numberOfLines={1}>{item.name}</Text>
            <View className={`px-2 py-0.5 rounded-full ${item.status === 'ACTIVE' ? 'bg-green-50' : 'bg-red-50'}`}>
               <Text className={`text-[8px] font-bold ${item.status === 'ACTIVE' ? 'text-green-600' : 'text-red-600'}`}>{item.status}</Text>
            </View>
          </View>
          <Text className="text-primary font-bold text-base mt-0.5">₫{item.price.toLocaleString()}</Text>
          <Text className="text-gray-400 text-[10px] font-medium mt-1">Kho: {item.stock} • Đã bán: {item.soldCount || 0}</Text>
        </View>

        <View className="flex-row justify-end space-x-2">
          <TouchableOpacity 
            onPress={() => navigation.navigate('Home', { 
              screen: 'ProductDetail', 
              params: { productId: item.id } 
            })}
            className="bg-gray-50 p-2 rounded-lg"
          >
             <Eye size={14} color={COLORS.secondary} />
          </TouchableOpacity>
          <TouchableOpacity className="bg-orange-50 p-2 rounded-lg">
             <Edit2 size={14} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => handleDelete(item)}
            className="bg-red-50 p-2 rounded-lg"
          >
             <Trash2 size={14} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="flex-1 bg-gray-50/50">
        <View className="px-6 pt-6 pb-6 bg-white rounded-b-[40px] shadow-sm flex-row justify-between items-end border-b border-gray-50">
           <View>
             <Text className="text-secondary font-bold text-3xl tracking-tighter">Sản phẩm của tôi</Text>
             <Text className="text-gray-400 font-medium text-xs mt-1">Quản lý kho hàng của bạn</Text>
           </View>
           <TouchableOpacity 
             onPress={() => navigation.navigate('AddProduct')}
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
            data={products}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
            ListEmptyComponent={() => (
              <View className="py-24 items-center justify-center">
                <View className="bg-gray-50 p-10 rounded-full mb-6">
                  <Package size={64} color="#e5e7eb" strokeWidth={1} />
                </View>
                <Text className="text-secondary font-bold text-xl tracking-tight">Chưa có sản phẩm nào</Text>
                <Text className="text-gray-400 mt-2 font-medium text-center px-10 leading-5">Hãy đăng bán sản phẩm đầu tiên để bắt đầu hành trình kinh doanh cùng ZORA!</Text>
                <TouchableOpacity 
                   onPress={() => navigation.navigate('AddProduct')}
                   className="mt-8 bg-primary px-8 py-3 rounded-2xl shadow-lg shadow-orange-500/20"
                >
                   <Text className="text-white font-bold uppercase tracking-widest text-xs">Đăng sản phẩm ngay</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
