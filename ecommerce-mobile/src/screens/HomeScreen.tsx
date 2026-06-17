import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  TextInput,
  RefreshControl,
  Dimensions,
  StyleSheet,
  FlatList,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Search, 
  Bell, 
  Flame, 
  ChevronRight,
  ScanLine
} from 'lucide-react-native';
import { productApi } from '../features/product/api';
import { Product } from '../types';
import ProductCard from '../components/ProductCard';
import { useHistoryStore } from '../store/useHistoryStore';
import { UTILITIES, CATEGORIES, COLORS } from '../constants';
import AiChatWidget from '../features/ai/components/AiChatWidget';

const { width } = Dimensions.get('window');

const HomeScreen = ({ navigation }: any) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  const recentlyViewed = useHistoryStore((state) => state.recentlyViewed);

  const loadInitialData = async () => {
    try {
      const [prodRes, catRes] = await Promise.all([
        productApi.getProducts({ size: 10, page: 0 }),
        productApi.getCategories()
      ]);
      setProducts(prodRes.content);
      setCategories(catRes);
      setPage(0);
      setHasMore(!prodRes.last);
    } catch (error) {
      console.error('Failed to load home data', error);
    }
  };

  const loadMoreProducts = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const prodRes = await productApi.getProducts({ size: 10, page: nextPage });
      setProducts(prev => [...prev, ...prodRes.content]);
      setPage(nextPage);
      setHasMore(!prodRes.last);
    } catch (error) {
      console.error('Failed to load more products', error);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInitialData();
    setRefreshing(false);
  };

  const getCategoryImage = (catName: string) => {
    const found = CATEGORIES.find(c => c.name.toLowerCase() === catName.toLowerCase());
    return found ? found.image : { uri: 'https://via.placeholder.com/150?text=Category' };
  };

  const renderHeader = () => (
    <>
      {/* Search Bar */}
      <View className="px-4 py-2">
        <TouchableOpacity 
          onPress={() => navigation.navigate('SearchFilter')}
          className="bg-white flex-row items-center px-4 py-3 rounded-2xl shadow-sm border border-gray-100"
        >
          <Search size={20} color={COLORS.textSecondary} />
          <Text className="ml-3 flex-1 text-sm text-gray-400 font-medium">
            Tìm kiếm sản phẩm trên ZORA...
          </Text>
        </TouchableOpacity>
      </View>

      {/* Hero Banner 2.0 */}
      <View className="px-4 mt-4">
        <TouchableOpacity className="relative h-48 rounded-[32px] overflow-hidden shadow-xl shadow-orange-500/10">
          <Image 
            source={require('../../assets/categories/hero-banner.jpg')} 
            className="w-full h-full"
            resizeMode="cover"
          />
          <View className="absolute inset-0 bg-black/10" />
          <View className="absolute top-8 left-8">
            <View className="bg-primary/90 self-start px-3 py-1.5 rounded-full mb-3 shadow-lg">
              <Text className="text-white font-bold text-[10px] uppercase tracking-widest">Mega Sale 50%</Text>
            </View>
            <Text className="text-white font-bold text-3xl leading-tight">Gia dụng{"\n"}<Text className="text-orange-200">thế hệ mới</Text></Text>
            <View className="mt-4 flex-row items-center">
              <Text className="text-white font-bold text-xs mr-2">Mua sắm ngay</Text>
              <ChevronRight size={14} color="white" />
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {/* Utilities Grid */}
      <View className="bg-white mx-4 mt-6 p-5 rounded-[32px] shadow-sm border border-gray-50">
        <View className="flex-row flex-wrap">
          {UTILITIES.map((u) => (
            <TouchableOpacity key={u.id} className="w-[25%] items-center mb-4">
              <View style={{ backgroundColor: u.bg }} className="w-12 h-12 rounded-2xl items-center justify-center mb-2 shadow-sm">
                <u.icon color={u.color} size={22} strokeWidth={2.5} />
              </View>
              <Text className="text-secondary font-bold text-[10px] text-center px-1 leading-3" numberOfLines={2}>
                {u.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Categories Grid */}
      <View className="mt-8">
        <View className="flex-row items-center justify-between px-6 mb-4">
          <Text className="text-secondary font-bold text-lg uppercase tracking-tight">Danh mục phổ biến</Text>
          <TouchableOpacity className="flex-row items-center">
            <Text className="text-primary text-xs font-bold mr-1">Tất cả</Text>
            <ChevronRight size={14} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          className="px-4"
          contentContainerStyle={{ paddingRight: 32 }}
        >
          <View className="flex-row flex-wrap w-[800px] h-[240px]">
            {(categories.length > 0 ? categories : CATEGORIES).map((c) => (
              <TouchableOpacity 
                key={c.id} 
                onPress={() => navigation.navigate('SearchFilter', { categoryId: c.id })}
                className="w-28 h-28 bg-white m-1.5 rounded-3xl overflow-hidden border border-gray-100 shadow-sm items-center justify-center"
              >
                <View className="w-14 h-14 rounded-full overflow-hidden mb-2 bg-gray-50">
                  <Image source={c.image || getCategoryImage(c.name)} className="w-full h-full" resizeMode="cover" />
                </View>
                <Text className="text-secondary font-bold text-[9px] text-center px-2" numberOfLines={2}>
                  {c.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Recently Viewed */}
      {recentlyViewed.length > 0 && (
        <View className="mt-8">
          <View className="flex-row items-center justify-between px-6 mb-4">
            <Text className="text-secondary font-bold text-lg uppercase tracking-tight">Vừa xem gần đây</Text>
          </View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            className="px-4"
            contentContainerStyle={{ paddingRight: 32 }}
          >
            {recentlyViewed.map((p, index) => (
              <TouchableOpacity 
                key={p.id || `recent-${index}`}
                onPress={() => navigation.navigate('ProductDetail', { productId: p.id })}
                className="w-24 mr-4"
              >
                <View className="w-24 h-24 rounded-2xl overflow-hidden border border-gray-100 shadow-sm mb-2">
                  <Image source={{ uri: p.images[0] }} className="w-full h-full" resizeMode="cover" />
                </View>
                <Text className="text-secondary font-bold text-[9px] text-center" numberOfLines={1}>₫{p.price.toLocaleString()}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Suggested Header */}
      <View className="mt-8 px-4 mb-4 border-b-2 border-primary pb-3 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <Text className="text-primary font-bold text-xl uppercase tracking-tighter">Gợi Ý Hôm Nay</Text>
          <Flame size={20} color={COLORS.primary} className="ml-2" />
        </View>
        <TouchableOpacity className="bg-orange-50 px-3 py-1 rounded-full">
          <Text className="text-primary text-[10px] font-bold">Xem thêm</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* ZORA Brand Header */}
      <View className="px-4 py-3 flex-row items-center justify-between z-10 bg-white">
        <Text className="text-secondary font-bold text-3xl tracking-tighter">ZORA</Text>
        <View className="flex-row items-center">
          <TouchableOpacity 
            onPress={() => navigation.navigate('QRScannerScreen')}
            className="p-2 bg-gray-50 rounded-full relative"
          >
            <ScanLine size={22} color={COLORS.secondary} />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => navigation.navigate('Notification')}
            className="p-2 ml-2 bg-gray-50 rounded-full relative"
          >
            <Bell size={22} color={COLORS.secondary} />
            <View className="absolute top-0 right-0 bg-primary w-4 h-4 rounded-full border-2 border-white items-center justify-center">
              <Text className="text-white text-[8px] font-bold">2</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        className="flex-1 bg-[#FAFAFA]"
        data={products}
        keyExtractor={(item, index) => item.id || `prod-${index}`}
        numColumns={2}
        columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={renderHeader}
        renderItem={({ item }) => (
          <ProductCard 
            product={item} 
            onPress={(product) => navigation.navigate('ProductDetail', { productId: product.id })} 
          />
        )}
        onEndReached={loadMoreProducts}
        onEndReachedThreshold={0.5}
        ListFooterComponent={() => 
          loadingMore ? (
            <View className="py-6 items-center">
              <ActivityIndicator color={COLORS.primary} size="large" />
            </View>
          ) : (
            <View className="h-32" />
          )
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />

      {/* ZORA AI Floating Widget */}
      <AiChatWidget />
    </SafeAreaView>
  );
};

export default HomeScreen;
