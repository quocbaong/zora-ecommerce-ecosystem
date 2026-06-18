import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  View, Text, Image, ScrollView, TouchableOpacity, FlatList, ActivityIndicator, TextInput, Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Search, MapPin, Star, Users, Package, Clock, X } from 'lucide-react-native';
import apiClient from '../../api/client';
import { productApi } from '../../features/product/api';
import { userApi } from '../../features/user/api';
import { Product } from '../../types';
import ProductCard from '../../components/ProductCard';
import { COLORS } from '../../constants';

const ShopProfileScreen = ({ route, navigation }: any) => {
  const { sellerId } = route.params;

  const [shopInfo, setShopInfo] = useState<any>(null);
  const [shopRating, setShopRating] = useState<number>(5.0);
  const [totalProducts, setTotalProducts] = useState<number>(0);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Internal Search State
  const [keyword, setKeyword] = useState('');
  const [searchInput, setSearchInput] = useState('');
  
  // Categories State
  const [shopCategories, setShopCategories] = useState<{id: string, name: string}[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [initialLoaded, setInitialLoaded] = useState(false);

  useEffect(() => {
    fetchShopData();
  }, [sellerId]);

  useEffect(() => {
    if (initialLoaded) {
      fetchProducts(true);
    }
  }, [keyword, selectedCategory]);

  const fetchShopData = async () => {
    try {
      // Use the actual Shop API which includes following status
      const shopRes = await apiClient.get(`/users/shops/${sellerId}`);
      setShopInfo(shopRes.data);

      const sellerProducts = await productApi.getProductsBySeller(sellerId);
      setTotalProducts(sellerProducts.length);

      const ratedProducts = sellerProducts.filter((p: any) => p.ratingAvg && p.ratingAvg > 0);
      if (ratedProducts.length > 0) {
         const avg = ratedProducts.reduce((acc: number, p: any) => acc + (p.ratingAvg || 0), 0) / ratedProducts.length;
         setShopRating(avg);
      }

      const catsMap = new Map();
      sellerProducts.forEach((p: any) => {
          if (p.categoryId && p.categoryName) {
              catsMap.set(p.categoryId, p.categoryName);
          }
      });
      setShopCategories(Array.from(catsMap.entries()).map(([id, name]) => ({ id, name })));

      // Điền sẵn sản phẩm từ API getProductsBySeller để tránh lỗi màn hình rỗng lúc đầu
      if (!keyword && !selectedCategory) {
          setProducts(sellerProducts.slice(0, 10)); // Chỉ lấy 10 sản phẩm đầu để mô phỏng trang 1
          setPage(0);
          setHasMore(sellerProducts.length > 10);
          setLoading(false);
          setInitialLoaded(true);
      }

      const vRes = await apiClient.get(`/orders/vouchers/shop/${sellerId}`);
      setVouchers(vRes.data);
    } catch (error) {
      console.error('Lỗi khi tải Shop Profile', error);
      setLoading(false);
      setInitialLoaded(true);
    }
  };

  const handleFollowToggle = async () => {
    if (!shopInfo) return;
    try {
      if (shopInfo.following) {
        await apiClient.delete(`/users/shops/${sellerId}/follow`);
        setShopInfo({ ...shopInfo, following: false, followerCount: Math.max(0, shopInfo.followerCount - 1) });
      } else {
        await apiClient.post(`/users/shops/${sellerId}/follow`);
        setShopInfo({ ...shopInfo, following: true, followerCount: shopInfo.followerCount + 1 });
      }
    } catch (error) {
      console.error('Lỗi khi xử lý Theo dõi:', error);
      Alert.alert('Lỗi', 'Không thể thực hiện lúc này. Vui lòng thử lại sau.');
    }
  };

  const fetchProducts = async (reset = false) => {
    if (loadingMore) return;
    const currentPage = reset ? 0 : page + 1;
    if (!reset && !hasMore) return;
    
    if (reset) setLoading(true);
    else setLoadingMore(true);

    try {
      const params: any = { sellerId, size: 10, page: currentPage };
      if (keyword) params.keyword = keyword;
      if (selectedCategory) params.categoryId = selectedCategory;

      const res = await productApi.getProducts(params);
      
      setProducts(reset ? res.content : [...(reset ? [] : products), ...res.content]);
      setPage(currentPage);
      setHasMore(!res.last);
    } catch (error) {
      console.error('Lỗi tải sản phẩm của Shop', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleSearchChange = (text: string) => {
    setSearchInput(text);
    setKeyword(text); // Instant search
  };

  const clearSearch = () => {
    setSearchInput('');
    setKeyword('');
  };

  const handleSaveVoucher = async (voucherId: string, isSaved: boolean) => {
    try {
      if (isSaved) {
        await apiClient.delete(`/orders/vouchers/${voucherId}/save`);
        Alert.alert('Thành công', 'Đã bỏ lưu mã giảm giá!');
      } else {
        await apiClient.post(`/orders/vouchers/${voucherId}/save`);
        Alert.alert('Thành công', 'Đã lưu mã giảm giá!');
      }
      fetchShopData();
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể lưu mã giảm giá lúc này');
    }
  };

  const headerComponent = (
    <View>
      <View className="relative h-40 bg-gray-200">
        <Image 
          source={{ uri: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=800&q=80' }} 
          className="w-full h-full" 
          resizeMode="cover" 
        />
        <View className="absolute inset-0 bg-black/40" />
      </View>

      <View className="px-4 pb-4 bg-white rounded-b-3xl shadow-sm mb-4">
        <View className="flex-row justify-between items-start -mt-8 mb-4">
          <View className="w-20 h-20 rounded-full bg-white border-4 border-white overflow-hidden shadow-sm">
            <Image 
              source={{ uri: shopInfo?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(shopInfo?.shopName || shopInfo?.email || sellerId)}&background=random&size=150` }} 
              className="w-full h-full" 
            />
          </View>
          <TouchableOpacity 
            onPress={handleFollowToggle}
            className={`mt-10 px-6 py-2 rounded-full border ${shopInfo?.following ? 'bg-white border-gray-300' : 'bg-primary border-primary'}`}
          >
            <Text className={`font-bold text-xs ${shopInfo?.following ? 'text-gray-500' : 'text-white'}`}>
              {shopInfo?.following ? 'Đang theo dõi' : '+ Theo dõi'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text className="text-xl font-bold text-secondary mb-1">{shopInfo?.shopName || shopInfo?.email || 'Người Bán Zora'}</Text>
        <View className="flex-row items-center mb-4">
          <MapPin size={12} color={COLORS.textSecondary} />
          <Text className="text-gray-500 text-xs ml-1 mr-3">Toàn quốc</Text>
          <Star size={12} color="#FBBF24" fill="#FBBF24" />
          <Text className="text-gray-500 text-xs ml-1">{shopRating.toFixed(1)}/5.0</Text>
        </View>

        <View className="flex-row justify-between border-t border-gray-100 pt-4">
          <View className="items-center flex-1">
            <Text className="text-secondary font-bold text-base">{shopInfo?.followerCount || 0}</Text>
            <Text className="text-gray-400 text-[10px] mt-1">Người theo dõi</Text>
          </View>
          <View className="w-[1px] h-full bg-gray-100" />
          <View className="items-center flex-1">
            <Text className="text-secondary font-bold text-base">{totalProducts}</Text>
            <Text className="text-gray-400 text-[10px] mt-1">Sản phẩm</Text>
          </View>
          <View className="w-[1px] h-full bg-gray-100" />
          <View className="items-center flex-1">
            <Text className="text-secondary font-bold text-base">{shopInfo?.joinedAt ? new Date(shopInfo.joinedAt).getFullYear() : '2023'}</Text>
            <Text className="text-gray-400 text-[10px] mt-1">Năm tham gia</Text>
          </View>
        </View>
      </View>

      <View className="mb-4 bg-white py-4 px-4 shadow-sm">
        <Text className="text-secondary font-bold text-base mb-3">Mã giảm giá của Shop</Text>
        {vouchers.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mr-[-16px]">
            {vouchers.map(v => (
              <View key={v.id} className="w-[260px] mr-4 flex-row bg-orange-50 border border-orange-200 rounded-xl overflow-hidden shadow-sm shadow-orange-100">
                <View className="w-3 border-r border-dashed border-orange-300 justify-center overflow-hidden">
                  <View className="w-4 h-4 rounded-full bg-white -ml-2 -mt-10" />
                  <View className="w-4 h-4 rounded-full bg-white -ml-2 mt-10" />
                </View>
                
                <View className="flex-1 p-3">
                  <Text className="text-primary font-bold text-sm mb-1">{v.code}</Text>
                  <Text className="text-gray-600 text-[10px] mb-2">{v.description}</Text>
                  <View className="flex-row items-end justify-between">
                    <Text className="text-gray-400 text-[9px]">HSD: {new Date(v.validTo).toLocaleDateString()}</Text>
                    <TouchableOpacity 
                      onPress={() => handleSaveVoucher(v.id, v.isSaved)}
                      className={`px-3 py-1 rounded-full ${v.isSaved ? 'bg-gray-200' : 'bg-primary'}`}
                    >
                      <Text className={`text-[10px] font-bold ${v.isSaved ? 'text-gray-500' : 'text-white'}`}>
                        {v.isSaved ? 'Đã lưu' : 'Lưu mã'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        ) : (
          <Text className="text-gray-400 text-xs italic">Shop hiện chưa có mã giảm giá nào.</Text>
        )}
      </View>

      <View className="px-4 py-3 bg-white flex-row items-center justify-between border-b border-gray-100">
        <Text className="text-secondary font-bold text-base">Tất cả sản phẩm</Text>
        <View className="flex-row items-center bg-gray-100 px-3 py-1.5 rounded-full w-[200px]">
          <Search size={14} color={COLORS.textSecondary} />
          <TextInput 
            value={searchInput}
            onChangeText={handleSearchChange}
            placeholder="Tìm trong Shop..."
            className="flex-1 ml-2 text-xs text-secondary"
            returnKeyType="search"
          />
          {searchInput.length > 0 && (
            <TouchableOpacity onPress={clearSearch}>
              <X size={14} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      {shopCategories.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="bg-white py-3 px-4 mb-2 shadow-sm">
          <TouchableOpacity onPress={() => setSelectedCategory('')} className={`px-4 py-1.5 rounded-full mr-2 ${!selectedCategory ? 'bg-primary' : 'bg-gray-100'}`}>
             <Text className={`text-xs font-bold ${!selectedCategory ? 'text-white' : 'text-gray-500'}`}>Tất cả</Text>
          </TouchableOpacity>
          {shopCategories.map(c => (
            <TouchableOpacity key={c.id} onPress={() => setSelectedCategory(c.id)} className={`px-4 py-1.5 rounded-full mr-2 ${selectedCategory === c.id ? 'bg-primary' : 'bg-gray-100'}`}>
               <Text className={`text-xs font-bold ${selectedCategory === c.id ? 'text-white' : 'text-gray-500'}`}>{c.name}</Text>
            </TouchableOpacity>
          ))}
          <View className="w-8" />
        </ScrollView>
      )}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top', 'bottom']}>
      <View className="absolute z-20 top-12 left-4 right-4 flex-row justify-between items-center">
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          className="bg-black/40 w-10 h-10 rounded-full items-center justify-center backdrop-blur-md"
        >
          <ChevronLeft color="white" size={24} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={{ paddingBottom: 100 }}
        columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 16 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={headerComponent}
        renderItem={({ item }) => (
          <ProductCard 
            product={item} 
            onPress={(product) => navigation.push('ProductDetail', { productId: product.id })} 
          />
        )}
        ListEmptyComponent={() => {
          if (loading || !initialLoaded) {
            return (
              <View className="py-20 items-center justify-center">
                <ActivityIndicator size="large" color={COLORS.primary} />
              </View>
            );
          }
          return (
            <View className="py-20 items-center justify-center">
              <Package size={48} color="#e5e7eb" />
              <Text className="mt-4 text-gray-400 font-medium text-sm">
                Shop không có sản phẩm nào phù hợp.
              </Text>
            </View>
          );
        }}
        onEndReached={() => fetchProducts(false)}
        onEndReachedThreshold={0.5}
        ListFooterComponent={() => 
          loadingMore ? <ActivityIndicator size="small" color={COLORS.primary} className="my-6" /> : <View className="h-10" />
        }
      />
    </SafeAreaView>
  );
};

export default ShopProfileScreen;
