import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, FlatList, ActivityIndicator, Modal, ScrollView 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, ChevronLeft, Filter, X, Star } from 'lucide-react-native';
import { productApi } from '../../features/product/api';
import { Product } from '../../types';
import ProductCard from '../../components/ProductCard';
import { COLORS } from '../../constants';

// Sort Options
const SORT_OPTIONS = [
  { label: 'Mới nhất', value: 'createdAt_desc' },
  { label: 'Bán chạy', value: 'soldCount_desc' },
  { label: 'Giá tăng dần', value: 'price_asc' },
  { label: 'Giá giảm dần', value: 'price_desc' },
];

const SearchFilterScreen = ({ navigation, route }: any) => {
  const initialKeyword = route.params?.keyword || '';
  const initialCategoryId = route.params?.categoryId || null;

  const [keyword, setKeyword] = useState(initialKeyword);
  const [searchInput, setSearchInput] = useState(initialKeyword);
  
  // Products and Pagination
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Filter State
  const [showFilter, setShowFilter] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  
  // Active Filters
  const [categoryId, setCategoryId] = useState<string | null>(initialCategoryId);
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [rating, setRating] = useState<number | null>(null);
  const [sort, setSort] = useState<string>('createdAt_desc');

  // Temp Filters (for the Modal before Apply)
  const [tempCategoryId, setTempCategoryId] = useState<string | null>(categoryId);
  const [tempMinPrice, setTempMinPrice] = useState<string>(minPrice);
  const [tempMaxPrice, setTempMaxPrice] = useState<string>(maxPrice);
  const [tempRating, setTempRating] = useState<number | null>(rating);
  const [tempSort, setTempSort] = useState<string>(sort);

  useEffect(() => {
    productApi.getCategories().then(setCategories).catch(console.error);
  }, []);

  const fetchProducts = async (reset = false) => {
    if (loading) return;
    const currentPage = reset ? 0 : page + 1;
    if (!reset && !hasMore) return;
    
    if (reset) setLoading(true);
    else setLoadingMore(true);

    try {
      const params: any = {
        size: 10,
        page: currentPage,
        sort
      };
      if (keyword) params.keyword = keyword;
      if (categoryId) params.categoryId = categoryId;
      
      const parsedMin = minPrice ? Number(minPrice.replace(/\D/g, '')) : null;
      const parsedMax = maxPrice ? Number(maxPrice.replace(/\D/g, '')) : null;

      if (parsedMin && parsedMin > 0) params.minPrice = parsedMin;
      if (parsedMax && parsedMax > 0) params.maxPrice = parsedMax;
      if (rating) params.rating = rating;

      const res = await productApi.getProducts(params);
      
      setProducts(reset ? res.content : [...products, ...res.content]);
      setPage(currentPage);
      setHasMore(!res.last);
    } catch (error) {
      console.error('Search failed', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Trigger search when core filter state changes
  useEffect(() => {
    fetchProducts(true);
  }, [keyword, categoryId, minPrice, maxPrice, rating, sort]);

  const handleSearchSubmit = () => {
    setKeyword(searchInput);
  };

  const openFilter = () => {
    setTempCategoryId(categoryId);
    setTempMinPrice(minPrice);
    setTempMaxPrice(maxPrice);
    setTempRating(rating);
    setTempSort(sort);
    setShowFilter(true);
  };

  const applyFilter = () => {
    setCategoryId(tempCategoryId);
    setMinPrice(tempMinPrice);
    setMaxPrice(tempMaxPrice);
    setRating(tempRating);
    setSort(tempSort);
    setShowFilter(false);
  };

  const clearFilter = () => {
    setTempCategoryId(null);
    setTempMinPrice('');
    setTempMaxPrice('');
    setTempRating(null);
    setTempSort('createdAt_desc');
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="px-4 py-3 bg-white flex-row items-center border-b border-gray-100 z-10">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
          <ChevronLeft size={24} color={COLORS.secondary} />
        </TouchableOpacity>
        
        <View className="flex-1 flex-row items-center bg-gray-100 px-3 py-2 rounded-xl">
          <Search size={18} color={COLORS.textSecondary} />
          <TextInput
            value={searchInput}
            onChangeText={setSearchInput}
            onSubmitEditing={handleSearchSubmit}
            placeholder="Tìm kiếm sản phẩm..."
            className="flex-1 ml-2 text-sm text-secondary"
            returnKeyType="search"
          />
          {searchInput.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchInput(''); setKeyword(''); }}>
              <X size={16} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity onPress={openFilter} className="ml-3 p-2 bg-gray-100 rounded-xl relative">
          <Filter size={20} color={COLORS.secondary} />
          {(categoryId || minPrice || rating) && (
            <View className="absolute top-1 right-1 w-2.5 h-2.5 bg-primary rounded-full border border-white" />
          )}
        </TouchableOpacity>
      </View>

      {/* Product List */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={{ padding: 12, paddingBottom: 100 }}
          columnWrapperStyle={{ justifyContent: 'space-between', marginBottom: 12 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <ProductCard 
              product={item} 
              onPress={(product) => navigation.navigate('ProductDetail', { productId: product.id })} 
            />
          )}
          ListEmptyComponent={() => (
            <View className="flex-1 justify-center items-center py-20">
              <Search size={48} color="#e5e7eb" />
              <Text className="mt-4 text-gray-400 font-medium text-center px-8">
                Không tìm thấy sản phẩm nào phù hợp với tìm kiếm của bạn.
              </Text>
            </View>
          )}
          onEndReached={() => fetchProducts(false)}
          onEndReachedThreshold={0.5}
          ListFooterComponent={() => 
            loadingMore ? <ActivityIndicator size="small" color={COLORS.primary} className="my-4" /> : null
          }
        />
      )}

      {/* Filter Modal */}
      <Modal visible={showFilter} animationType="slide" transparent={true}>
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl h-[85%]">
            <View className="flex-row justify-between items-center px-4 py-4 border-b border-gray-100">
              <TouchableOpacity onPress={clearFilter}>
                <Text className="text-gray-500 font-medium">Đặt lại</Text>
              </TouchableOpacity>
              <Text className="text-lg font-bold text-secondary">Lọc & Sắp xếp</Text>
              <TouchableOpacity onPress={() => setShowFilter(false)}>
                <X size={24} color={COLORS.secondary} />
              </TouchableOpacity>
            </View>

            <ScrollView className="flex-1 px-4 py-2" showsVerticalScrollIndicator={false}>
              
              {/* Sắp xếp */}
              <Text className="font-bold text-secondary mt-4 mb-3">Sắp xếp theo</Text>
              <View className="flex-row flex-wrap">
                {SORT_OPTIONS.map(opt => (
                  <TouchableOpacity 
                    key={opt.value}
                    onPress={() => setTempSort(opt.value)}
                    className={`px-4 py-2 rounded-full mr-2 mb-2 border ${tempSort === opt.value ? 'bg-primary/10 border-primary' : 'bg-gray-50 border-gray-200'}`}
                  >
                    <Text className={`text-xs font-medium ${tempSort === opt.value ? 'text-primary' : 'text-gray-600'}`}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Danh mục */}
              <Text className="font-bold text-secondary mt-6 mb-3">Danh mục</Text>
              <View className="flex-row flex-wrap">
                <TouchableOpacity 
                  onPress={() => setTempCategoryId(null)}
                  className={`px-4 py-2 rounded-full mr-2 mb-2 border ${tempCategoryId === null ? 'bg-primary/10 border-primary' : 'bg-gray-50 border-gray-200'}`}
                >
                  <Text className={`text-xs font-medium ${tempCategoryId === null ? 'text-primary' : 'text-gray-600'}`}>Tất cả</Text>
                </TouchableOpacity>
                {categories.map(cat => (
                  <TouchableOpacity 
                    key={cat.id}
                    onPress={() => setTempCategoryId(cat.id)}
                    className={`px-4 py-2 rounded-full mr-2 mb-2 border ${tempCategoryId === cat.id ? 'bg-primary/10 border-primary' : 'bg-gray-50 border-gray-200'}`}
                  >
                    <Text className={`text-xs font-medium ${tempCategoryId === cat.id ? 'text-primary' : 'text-gray-600'}`}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Khoảng giá */}
              <Text className="font-bold text-secondary mt-6 mb-3">Khoảng giá (VNĐ)</Text>
              <View className="flex-row items-center justify-between">
                <TextInput 
                  value={tempMinPrice}
                  onChangeText={setTempMinPrice}
                  keyboardType="numeric"
                  placeholder="TỐI THIỂU"
                  className="bg-gray-50 flex-1 py-3 px-4 rounded-xl text-center font-medium border border-gray-200"
                />
                <View className="w-4 border-b border-gray-400 mx-3" />
                <TextInput 
                  value={tempMaxPrice}
                  onChangeText={setTempMaxPrice}
                  keyboardType="numeric"
                  placeholder="TỐI ĐA"
                  className="bg-gray-50 flex-1 py-3 px-4 rounded-xl text-center font-medium border border-gray-200"
                />
              </View>

              {/* Đánh giá */}
              <Text className="font-bold text-secondary mt-6 mb-3">Đánh giá</Text>
              <View className="flex-row flex-wrap mb-10">
                {[5, 4, 3].map(stars => (
                  <TouchableOpacity 
                    key={stars}
                    onPress={() => setTempRating(tempRating === stars ? null : stars)}
                    className={`flex-row items-center px-4 py-2 rounded-full mr-2 mb-2 border ${tempRating === stars ? 'bg-primary/10 border-primary' : 'bg-gray-50 border-gray-200'}`}
                  >
                    <Star size={14} color={tempRating === stars ? COLORS.primary : '#facc15'} fill={tempRating === stars ? COLORS.primary : '#facc15'} />
                    <Text className={`text-xs font-medium ml-1 ${tempRating === stars ? 'text-primary' : 'text-gray-600'}`}>
                      Từ {stars} sao
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

            </ScrollView>

            <View className="p-4 border-t border-gray-100 bg-white">
              <TouchableOpacity onPress={applyFilter} className="bg-primary py-4 rounded-2xl items-center shadow-sm shadow-orange-500/30">
                <Text className="text-white font-bold text-base">Áp dụng</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default SearchFilterScreen;
