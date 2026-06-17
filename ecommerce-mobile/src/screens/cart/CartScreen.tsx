import React, { useEffect, useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  Image, 
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Minus, 
  Plus, 
  Trash2, 
  ShoppingBag,
  ArrowRight,
  Store,
  CheckSquare,
  Square,
  Ticket
} from 'lucide-react-native';
import { useCartStore } from '../../store/cartStore';
import { COLORS } from '../../constants';

const CartScreen = ({ navigation }: any) => {
  const { items, loading, fetchCart, updateQuantity, removeItem, getItemCount } = useCartStore();
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchCart();
  }, []);

  const groupedItems = useMemo(() => {
    const groups: Record<string, { shopName: string; items: any[] }> = {};
    items.forEach((item) => {
      const sId = item.sellerId || 'unknown';
      if (!groups[sId]) {
        groups[sId] = { shopName: item.shopName || 'Zora Store', items: [] };
      }
      groups[sId].items.push(item);
    });
    return Object.keys(groups).map((key) => ({ sellerId: key, ...groups[key] }));
  }, [items]);

  const toggleItem = (itemId: string) => {
    const newSet = new Set(selectedItems);
    if (newSet.has(itemId)) {
      newSet.delete(itemId);
    } else {
      newSet.add(itemId);
    }
    setSelectedItems(newSet);
  };

  const toggleShop = (sellerId: string) => {
    const shopItems = groupedItems.find(g => g.sellerId === sellerId)?.items || [];
    const allShopItemIds = shopItems.map(i => i.id);
    const isAllSelected = allShopItemIds.every(id => selectedItems.has(id));
    const newSet = new Set(selectedItems);
    
    if (isAllSelected) {
      allShopItemIds.forEach(id => newSet.delete(id));
    } else {
      allShopItemIds.forEach(id => newSet.add(id));
    }
    setSelectedItems(newSet);
  };

  const toggleAll = () => {
    if (selectedItems.size === items.length && items.length > 0) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(items.map(i => i.id)));
    }
  };

  const selectedTotalPrice = items
    .filter(item => selectedItems.has(item.id))
    .reduce((total, item) => total + item.price * item.quantity, 0);

  const renderItem = (item: any, isLast: boolean) => {
    const isSelected = selectedItems.has(item.id);
    return (
      <View key={item.id} className={`flex-row items-center bg-white p-4 ${isLast ? '' : 'border-b border-gray-50'}`}>
        <TouchableOpacity onPress={() => toggleItem(item.id)} className="mr-3">
          {isSelected ? (
            <CheckSquare size={20} color={COLORS.primary} fill="#fff7ed" />
          ) : (
            <Square size={20} color="#d1d5db" />
          )}
        </TouchableOpacity>
        
        <View className="shadow-sm">
          <Image 
            source={{ uri: item.image || 'https://via.placeholder.com/100' }} 
            className="w-20 h-20 rounded-2xl bg-gray-50 border border-gray-100"
            resizeMode="cover"
          />
        </View>
        
        <View className="flex-1 ml-3 justify-between py-1">
          <View>
            <View className="flex-row justify-between items-start">
              <Text className="text-secondary font-bold text-sm flex-1 mr-2 leading-5" numberOfLines={2}>
                {item.name}
              </Text>
              <TouchableOpacity 
                onPress={() => removeItem(item.id)}
                className="p-1"
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
            <Text className="text-primary font-bold text-sm">
              ₫{item.price.toLocaleString()}
            </Text>
            <View className="flex-row items-center bg-gray-50 rounded-xl p-0.5 border border-gray-100">
              <TouchableOpacity 
                onPress={() => updateQuantity(item.id, item.quantity - 1)}
                className="w-7 h-7 items-center justify-center bg-white rounded-lg shadow-sm border border-gray-50"
              >
                <Minus size={12} color={COLORS.secondary} strokeWidth={3} />
              </TouchableOpacity>
              <Text className="text-secondary font-bold mx-2 min-w-[16px] text-center text-xs">
                {item.quantity}
              </Text>
              <TouchableOpacity 
                onPress={() => updateQuantity(item.id, item.quantity + 1)}
                className="w-7 h-7 items-center justify-center bg-white rounded-lg shadow-sm border border-gray-50"
              >
                <Plus size={12} color={COLORS.secondary} strokeWidth={3} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  if (loading && items.length === 0) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

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
          {groupedItems.map((group) => {
            const isAllShopSelected = group.items.every(i => selectedItems.has(i.id));
            return (
              <View key={group.sellerId} className="bg-white rounded-[32px] mb-4 shadow-sm border border-gray-100 overflow-hidden">
                <View className="flex-row items-center px-4 py-4 border-b border-gray-50 bg-gray-50/30">
                  <TouchableOpacity onPress={() => toggleShop(group.sellerId)} className="mr-2">
                    {isAllShopSelected ? (
                      <CheckSquare size={20} color={COLORS.primary} fill="#fff7ed" />
                    ) : (
                      <Square size={20} color="#d1d5db" />
                    )}
                  </TouchableOpacity>
                  <Store size={18} color={COLORS.primary} />
                  <Text className="font-bold text-secondary ml-2 flex-1">{group.shopName}</Text>
                  <TouchableOpacity onPress={() => navigation.navigate('ShopProfile', { sellerId: group.sellerId })}>
                    <Text className="text-primary text-[10px] font-bold">Xem Shop</Text>
                  </TouchableOpacity>
                </View>
                
                <View className="p-1">
                  {group.items.map((item, index) => renderItem(item, index === group.items.length - 1))}
                </View>

                {/* Shop Voucher Bar */}
                <View className="bg-orange-50/50 px-4 py-3 flex-row items-center justify-between border-t border-orange-100/50">
                  <View className="flex-row items-center flex-1">
                    <Ticket size={16} color={COLORS.primary} className="mr-2" />
                    <Text className="text-secondary text-xs font-medium">Voucher của Shop</Text>
                  </View>
                  <TouchableOpacity>
                    <Text className="text-primary text-xs font-bold">Chọn/Nhập mã</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* Summary Footer */}
        <View className="absolute bottom-0 left-0 right-0 bg-white p-4 pb-10 rounded-t-[48px] shadow-2xl border-t border-gray-50 flex-row items-center justify-between">
          <TouchableOpacity onPress={toggleAll} className="flex-row items-center ml-2">
            {selectedItems.size === items.length && items.length > 0 ? (
              <CheckSquare size={22} color={COLORS.primary} fill="#fff7ed" />
            ) : (
              <Square size={22} color="#d1d5db" />
            )}
            <Text className="text-secondary font-medium text-xs ml-2">Tất cả</Text>
          </TouchableOpacity>
          
          <View className="flex-row items-center">
            <View className="mr-4 items-end">
              <Text className="text-gray-400 text-[10px] font-medium mb-0.5">Tổng thanh toán</Text>
              <Text className="text-primary font-bold text-xl">₫{selectedTotalPrice.toLocaleString()}</Text>
            </View>
            <TouchableOpacity 
              onPress={() => {
                if (selectedItems.size === 0) {
                  // Show alert if nothing is selected
                  // Usually done with Alert.alert, assuming it's imported or handled
                } else {
                  // Pass selected items to Checkout
                  navigation.navigate('Checkout', { selectedItemIds: Array.from(selectedItems) });
                }
              }}
              className={`${selectedItems.size > 0 ? 'bg-primary' : 'bg-gray-300'} flex-row items-center justify-center px-6 py-4 rounded-[24px] shadow-xl ${selectedItems.size > 0 ? 'shadow-orange-500/20' : ''}`}
              disabled={selectedItems.size === 0}
            >
              <Text className="text-white font-bold text-sm">Mua hàng ({selectedItems.size})</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default CartScreen;
