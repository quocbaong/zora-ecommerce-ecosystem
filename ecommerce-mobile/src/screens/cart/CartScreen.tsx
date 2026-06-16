import React from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  Image, 
  TouchableOpacity, 
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Minus, 
  Plus, 
  Trash2, 
  ShoppingBag,
  ArrowRight,
  Store
} from 'lucide-react-native';
import { useCartStore } from '../../store/cartStore';
import { COLORS } from '../../constants';

const CartScreen = ({ navigation }: any) => {
  const { items, updateQuantity, removeItem, getTotalPrice, getItemCount } = useCartStore();

  const groupedItems = React.useMemo(() => {
    const groups: Record<string, { shopName: string; items: any[] }> = {};
    items.forEach((item) => {
      const sId = item.sellerId || 'unknown';
      if (!groups[sId]) {
        groups[sId] = { shopName: item.shopName || 'Shop ZORA', items: [] };
      }
      groups[sId].items.push(item);
    });
    return Object.keys(groups).map((key) => ({ sellerId: key, ...groups[key] }));
  }, [items]);

  const renderItem = (item: any, isLast: boolean) => (
    <View key={`${item.productId}-${item.variantId}`} className={`flex-row bg-white p-4 rounded-3xl ${isLast ? '' : 'border-b border-gray-50'}`}>
      <View className="shadow-sm">
        <Image 
          source={{ uri: item.image || 'https://via.placeholder.com/100' }} 
          className="w-24 h-24 rounded-2xl bg-gray-50 border border-gray-100"
          resizeMode="cover"
        />
      </View>
      <View className="flex-1 ml-4 justify-between py-1">
        <View>
          <View className="flex-row justify-between items-start">
            <Text className="text-secondary font-bold text-sm flex-1 mr-2 leading-5" numberOfLines={2}>
              {item.name}
            </Text>
            <TouchableOpacity 
              onPress={() => removeItem(item.productId, item.variantId)}
              className="bg-gray-50 p-2 rounded-full"
            >
              <Trash2 size={16} color={COLORS.error} />
            </TouchableOpacity>
          </View>
          {item.variantName && (
            <View className="bg-gray-50 self-start px-2 py-0.5 rounded-lg mt-1 border border-gray-100">
               <Text className="text-gray-400 text-[10px] font-medium uppercase tracking-tight">{item.variantName}</Text>
            </View>
          )}
        </View>

        <View className="flex-row justify-between items-center mt-2">
          <Text className="text-primary font-bold text-lg">
            ₫{item.price.toLocaleString()}
          </Text>
          <View className="flex-row items-center bg-gray-50 rounded-2xl p-1 border border-gray-100">
            <TouchableOpacity 
              onPress={() => updateQuantity(item.productId, item.quantity - 1, item.variantId)}
              className="w-8 h-8 items-center justify-center bg-white rounded-xl shadow-sm border border-gray-50"
            >
              <Minus size={14} color={COLORS.secondary} strokeWidth={3} />
            </TouchableOpacity>
            <Text className="text-secondary font-bold mx-3 min-w-[20px] text-center text-sm">
              {item.quantity}
            </Text>
            <TouchableOpacity 
              onPress={() => updateQuantity(item.productId, item.quantity + 1, item.variantId)}
              className="w-8 h-8 items-center justify-center bg-white rounded-xl shadow-sm border border-gray-50"
            >
              <Plus size={14} color={COLORS.secondary} strokeWidth={3} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  if (items.length === 0) {
    return (
      <View className="flex-1 bg-white items-center justify-center p-10">
        <View className="bg-orange-50 p-10 rounded-full mb-8 shadow-xl shadow-orange-500/10">
          <ShoppingBag size={80} color={COLORS.primary} strokeWidth={1.5} />
        </View>
        <Text className="text-secondary font-bold text-2xl mb-3 text-center tracking-tight">Giỏ hàng đang trống</Text>
        <Text className="text-gray-400 text-center mb-10 leading-6 px-4">
          Hàng ngàn sản phẩm ưu đãi đang chờ bạn khám phá tại ZORA.
        </Text>
        <TouchableOpacity 
          onPress={() => navigation.navigate('Home')}
          className="bg-primary px-12 py-4 rounded-3xl shadow-xl shadow-orange-500/30"
        >
          <Text className="text-white font-bold text-base uppercase tracking-widest">Khám phá ngay</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="flex-1 bg-gray-50/50">
        <View className="px-6 pt-6 pb-4 bg-white rounded-b-[40px] shadow-sm flex-row justify-between items-end border-b border-gray-50">
           <View>
             <Text className="text-secondary font-bold text-3xl tracking-tighter">Giỏ hàng</Text>
             <Text className="text-gray-400 font-medium text-xs mt-1">Tất cả {getItemCount()} sản phẩm</Text>
           </View>
           <TouchableOpacity onPress={() => navigation.navigate('Home')} className="bg-orange-50 p-2 rounded-xl">
             <Text className="text-primary font-bold text-xs">Thêm món khác</Text>
           </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 180 }}>
          {groupedItems.map((group) => (
            <View key={group.sellerId} className="bg-white rounded-[32px] mb-4 shadow-sm border border-gray-100 overflow-hidden">
              <View className="flex-row items-center gap-2 px-5 py-4 border-b border-gray-50 bg-gray-50/30">
                <Store size={18} color={COLORS.primary} />
                <Text className="font-bold text-secondary">{group.shopName}</Text>
              </View>
              <View className="p-1">
                {group.items.map((item, index) => renderItem(item, index === group.items.length - 1))}
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Summary Footer */}
        <View className="absolute bottom-0 left-0 right-0 bg-white p-6 pb-12 rounded-t-[48px] shadow-2xl border-t border-gray-50">
          <View className="flex-row justify-between items-center mb-3 px-2">
            <Text className="text-gray-400 font-medium">Tạm tính</Text>
            <Text className="text-secondary font-bold text-sm">₫{getTotalPrice().toLocaleString()}</Text>
          </View>
          <View className="flex-row justify-between items-center mb-6 px-2">
             <View className="flex-row items-center">
                <Text className="text-secondary font-bold text-xl uppercase tracking-tighter">Tổng cộng</Text>
                <View className="ml-2 bg-orange-100 px-2 py-0.5 rounded-md">
                   <Text className="text-primary text-[8px] font-bold">SALE</Text>
                </View>
             </View>
            <Text className="text-primary font-bold text-2xl">₫{getTotalPrice().toLocaleString()}</Text>
          </View>
          
          <TouchableOpacity 
            onPress={() => navigation.navigate('Checkout')}
            className="bg-primary flex-row items-center justify-center py-5 rounded-[24px] shadow-xl shadow-orange-500/20"
          >
            <Text className="text-white font-bold text-base mr-2 uppercase tracking-widest">Thanh toán ngay</Text>
            <ArrowRight size={20} color="white" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default CartScreen;
