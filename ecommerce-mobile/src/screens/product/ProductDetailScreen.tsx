import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  Image, 
  TouchableOpacity, 
  Dimensions, 
  ActivityIndicator,
  Share,
  Alert
} from 'react-native';
import { 
  ChevronLeft, 
  ShoppingCart, 
  Heart, 
  Share2, 
  Star, 
  ShieldCheck, 
  Truck, 
  Clock,
  MessageSquare
} from 'lucide-react-native';
import { productApi } from '../../features/product/api';
import apiClient from '../../api/client';
import { useHistoryStore } from '../../store/useHistoryStore';
import { Product, ProductVariant } from '../../types';
import { COLORS } from '../../constants';
import { useCartStore } from '../../store/cartStore';

import ShareProductModal from '../../features/chat/components/ShareProductModal';

const { width } = Dimensions.get('window');

const ProductDetailScreen = ({ route, navigation }: any) => {
  const { productId } = route.params;
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [isShareModalVisible, setIsShareModalVisible] = useState(false);
  
  const [reviews, setReviews] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<Product[]>([]);

  const cartCount = useCartStore((state) => state.getItemCount());
  const addToCart = useCartStore((state) => state.addItem);

  const handleAddToCart = () => {
    if (!product) return;
    addToCart(product, selectedVariant, 1);
    Alert.alert('Thành công', 'Đã thêm sản phẩm vào giỏ hàng');
  };

  const handleBuyNow = () => {
    if (!product) return;
    addToCart(product, selectedVariant, 1);
    navigation.navigate('CartTab', { screen: 'Cart' });
  };

  const handleChat = async () => {
    if (!product) return;
    try {
      const response = await apiClient.post('/chat/conversations', { 
        sellerId: product.sellerId, 
        productId: product.id 
      });
      const data = response.data?.data || response.data;
      const conversationId = data?.id || data?.conversationId;

      if (!conversationId) throw new Error("Không lấy được ID cuộc hội thoại");

      navigation.navigate('ChatTab', { 
        screen: 'Chat', 
        params: { 
          conversationId, 
          participantName: product.verified ? 'Zora Mall Store' : 'Người bán ZORA' 
        } 
      });
    } catch (error) {
      console.error('Chat initiation error:', error);
      Alert.alert('Lỗi', 'Không thể kết nối với người bán lúc này.');
    }
  };

  const addProductToHistory = useHistoryStore((state) => state.addProductToHistory);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const data = await productApi.getProductById(productId);
        setProduct(data);
        if (data) {
          addProductToHistory(data);
          if (data.variants && data.variants.length > 0) {
            setSelectedVariant(data.variants[0]);
          }

          // Fetch Reviews
          try {
            const revs = await productApi.getReviews(productId);
            setReviews(revs);
          } catch(e) {}

          // Fetch Recommendations
          try {
            const recIds = await productApi.getRecommendations(productId);
            if (recIds && recIds.length > 0) {
              const recProducts = await Promise.all(recIds.slice(0, 5).map(id => productApi.getProductById(id)));
              setRecommendations(recProducts.filter(Boolean));
            }
          } catch(e) {}
        }
      } catch (error) {
        console.error('Failed to fetch product details', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [productId, addProductToHistory]);

  const handleShare = () => {
    setIsShareModalVisible(true);
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  if (!product) {
    return (
      <View className="flex-1 items-center justify-center bg-white p-4">
        <Text className="text-secondary font-bold text-lg">Sản phẩm không tồn tại</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} className="mt-4 bg-primary px-6 py-2 rounded-xl">
          <Text className="text-white font-bold">Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      {/* Custom Header */}
      <View className="absolute z-20 top-0 left-0 right-0 px-4 pt-12 pb-4 flex-row justify-between items-center">
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          className="bg-black/30 w-10 h-10 rounded-full items-center justify-center backdrop-blur-md"
        >
          <ChevronLeft color="white" size={24} />
        </TouchableOpacity>
        <View className="flex-row gap-2">
          <TouchableOpacity 
            onPress={handleShare}
            className="bg-black/30 w-10 h-10 rounded-full items-center justify-center"
          >
            <Share2 color="white" size={20} />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => navigation.navigate('CartTab')}
            className="bg-black/30 w-10 h-10 rounded-full items-center justify-center"
          >
            <ShoppingCart color="white" size={20} />
            {cartCount > 0 && (
              <View className="absolute -top-1 -right-1 bg-primary w-4 h-4 rounded-full items-center justify-center border border-white">
                <Text className="text-white text-[8px] font-bold">{cartCount > 9 ? '9+' : cartCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        {/* Image Slider */}
        <View className="relative">
          <ScrollView 
            horizontal 
            pagingEnabled 
            showsHorizontalScrollIndicator={false}
            className="h-[420px]"
          >
            {product.images.map((img: string, idx: number) => (
              <Image 
                key={idx} 
                source={{ uri: img }} 
                style={{ width, height: 420 }}
                resizeMode="cover"
              />
            ))}
          </ScrollView>
          <View className="absolute bottom-6 right-6 bg-black/50 px-3 py-1 rounded-full">
            <Text className="text-white text-xs font-bold">1 / {product.images.length || 1}</Text>
          </View>
        </View>

        <View className="p-5 bg-white rounded-t-[40px] mt-[-40px]">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-end">
              <Text className="text-primary font-bold text-3xl">₫{product.price.toLocaleString()}</Text>
              {(product.discountPercent ?? 0) > 0 && (
                <Text className="text-gray-300 line-through text-sm ml-2 mb-1">
                  ₫{Math.round(product.price / (1 - (product.discountPercent ?? 0) / 100)).toLocaleString()}
                </Text>
              )}
            </View>
            <TouchableOpacity className="p-2 bg-pink-50 rounded-full">
              <Heart size={24} color="#f43f5e" fill="#f43f5e" />
            </TouchableOpacity>
          </View>
          
          <View className="flex-row items-center mb-3">
            {product.verified && (
              <View className="bg-secondary px-2 py-0.5 rounded mr-2">
                <Text className="text-white text-[10px] font-bold uppercase tracking-tighter">Zora Mall</Text>
              </View>
            )}
            <Text className="text-secondary font-bold text-xl flex-1 leading-7">
              {product.name}
            </Text>
          </View>

          <View className="flex-row items-center justify-between py-4 mb-6 border-b border-gray-50">
            <View className="flex-row items-center">
              <View className="flex-row mr-2">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} size={14} color={s <= (product.ratingAvg || 0) ? "#FBBF24" : "#E5E7EB"} fill={s <= (product.ratingAvg || 0) ? "#FBBF24" : "#E5E7EB"} />
                ))}
              </View>
              <Text className="text-secondary font-bold text-sm">{product.ratingAvg?.toFixed(1) || '0.0'}</Text>
              <Text className="text-gray-400 text-xs ml-2">({product.ratingCount || 0})</Text>
            </View>
            <View className="h-4 w-[1px] bg-gray-200" />
            <Text className="text-gray-500 font-medium text-sm">Đã bán {product.soldCount || '1.2k+'}</Text>
          </View>

          {/* Benefits */}
          <View className="bg-[#FAFBFD] p-5 rounded-[32px] mb-8 border border-blue-50">
            <View className="flex-row items-center mb-4">
              <View className="bg-blue-100 p-2 rounded-xl">
                <ShieldCheck size={18} color="#3b82f6" />
              </View>
              <View className="ml-3">
                <Text className="text-secondary font-bold text-sm">Chính hãng 100%</Text>
                <Text className="text-gray-400 text-[10px]">Đền bù gấp đôi nếu phát hiện hàng giả</Text>
              </View>
            </View>
            <View className="flex-row items-center mb-4">
              <View className="bg-green-100 p-2 rounded-xl">
                <Truck size={18} color="#22c55e" />
              </View>
              <View className="ml-3">
                <Text className="text-secondary font-bold text-sm">Miễn phí vận chuyển</Text>
                <Text className="text-gray-400 text-[10px]">Áp dụng cho đơn hàng từ ₫0</Text>
              </View>
            </View>
            <View className="flex-row items-center">
              <View className="bg-orange-100 p-2 rounded-xl">
                <Clock size={18} color="#FF6B35" />
              </View>
              <View className="ml-3">
                <Text className="text-secondary font-bold text-sm">Giao hàng nhanh 2H</Text>
                <Text className="text-gray-400 text-[10px]">Nhận hàng ngay trong ngày</Text>
              </View>
            </View>
          </View>

          {/* Description */}
          <View className="mb-8">
            <View className="flex-row items-center mb-4">
              <View className="w-1 h-6 bg-primary rounded-full mr-3" />
              <Text className="text-secondary font-bold text-lg uppercase tracking-tight">Chi tiết sản phẩm</Text>
            </View>
            <Text className="text-gray-600 leading-7 text-sm">
              {product.description || 'Sản phẩm ZORA Mall cam kết chất lượng tốt nhất với dịch vụ hậu mãi chu đáo. Quý khách hoàn toàn yên tâm khi mua sắm tại ZORA.'}
            </Text>
          </View>

          {/* Variants */}
          {product.variants && product.variants.length > 0 && (
            <View className="mb-8">
              <Text className="text-secondary font-bold text-lg mb-4">Lựa chọn của bạn</Text>
              <View className="flex-row flex-wrap gap-3">
                {product.variants.map((v: ProductVariant, idx: number) => (
                  <TouchableOpacity 
                    key={idx}
                    onPress={() => setSelectedVariant(v)}
                    className={`px-5 py-3 rounded-2xl border-2 ${selectedVariant === v ? 'bg-orange-50 border-primary' : 'bg-white border-gray-100'}`}
                  >
                    <Text className={`font-bold text-xs ${selectedVariant === v ? 'text-primary' : 'text-gray-400'}`}>
                      {v.color} {v.size ? `• ${v.size}` : ''}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Shop Profile Mini */}
          <View className="mb-8 bg-gray-50 p-4 rounded-[24px] border border-gray-100 flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <View className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden border-2 border-white shadow-sm">
                 <Image source={{ uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(product.sellerId)}&background=random` }} className="w-full h-full" />
              </View>
              <View className="ml-3 flex-1">
                 <View className="flex-row items-center">
                    <Text className="text-secondary font-bold text-sm mr-1">Zora Official Store</Text>
                    {product.verified && <ShieldCheck size={14} color="#3b82f6" />}
                 </View>
                 <Text className="text-gray-400 text-xs mt-0.5">Thành viên từ 2023</Text>
              </View>
            </View>
            <TouchableOpacity 
               onPress={() => navigation.navigate('ShopProfile', { sellerId: product.sellerId })}
               className="border border-primary px-3 py-1.5 rounded-full bg-white"
            >
               <Text className="text-primary font-bold text-xs">Xem Shop</Text>
            </TouchableOpacity>
          </View>

          {/* Reviews Block */}
          <View className="mb-8">
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center">
                <View className="w-1 h-6 bg-primary rounded-full mr-3" />
                <Text className="text-secondary font-bold text-lg uppercase tracking-tight">Khách hàng đánh giá</Text>
              </View>
              <TouchableOpacity>
                <Text className="text-primary text-xs font-bold">Xem tất cả</Text>
              </TouchableOpacity>
            </View>
            
            {reviews.length > 0 ? (
              <View>
                <View className="flex-row items-center bg-orange-50 p-4 rounded-[24px] mb-4">
                  <View className="items-center mr-6 border-r border-orange-200 pr-6">
                    <Text className="text-4xl font-black text-primary">{product.ratingAvg?.toFixed(1) || '0.0'}</Text>
                    <View className="flex-row mt-1">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} size={10} color={s <= (product.ratingAvg || 0) ? "#FF6B35" : "#fdba74"} fill={s <= (product.ratingAvg || 0) ? "#FF6B35" : "#fdba74"} />
                      ))}
                    </View>
                    <Text className="text-gray-500 text-[10px] mt-1">{reviews.length} đánh giá</Text>
                  </View>
                  <View className="flex-1">
                     {[5,4,3,2,1].map(stars => {
                        const count = reviews.filter(r => r.rating === stars).length;
                        const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                        return (
                          <View key={stars} className="flex-row items-center mb-1">
                             <Text className="text-gray-500 text-[10px] w-4">{stars}</Text>
                             <Star size={8} color="#9ca3af" fill="#9ca3af" className="mr-2" />
                             <View className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <View className="h-full bg-primary" style={{ width: `${pct}%` }} />
                             </View>
                          </View>
                        );
                     })}
                  </View>
                </View>

                {reviews.slice(0, 3).map((r, i) => (
                  <View key={i} className="mb-4 pb-4 border-b border-gray-100">
                    <View className="flex-row items-center justify-between mb-2">
                      <View className="flex-row items-center">
                        <View className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden mr-2">
                          <Image source={{ uri: `https://ui-avatars.com/api/?name=${r.customerName || 'User'}` }} className="w-full h-full" />
                        </View>
                        <View>
                          <Text className="text-secondary font-bold text-xs">{r.customerName || 'Người mua Zora'}</Text>
                          <View className="flex-row mt-0.5">
                            {[1,2,3,4,5].map(s => (
                              <Star key={s} size={8} color={s <= r.rating ? "#FBBF24" : "#E5E7EB"} fill={s <= r.rating ? "#FBBF24" : "#E5E7EB"} />
                            ))}
                          </View>
                        </View>
                      </View>
                      <Text className="text-gray-400 text-[10px]">{new Date(r.createdAt).toLocaleDateString()}</Text>
                    </View>
                    <Text className="text-gray-600 text-xs leading-5 mt-1">{r.reviewText || r.comment}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <View className="bg-gray-50 p-6 rounded-[24px] items-center">
                <Text className="text-gray-400 font-medium text-xs">Chưa có đánh giá nào cho sản phẩm này.</Text>
              </View>
            )}
          </View>

          {/* AI Recommendations */}
          {recommendations.length > 0 && (
            <View className="mb-8">
              <View className="flex-row items-center mb-4">
                <View className="w-1 h-6 bg-primary rounded-full mr-3" />
                <Text className="text-secondary font-bold text-lg uppercase tracking-tight">Sản phẩm tương tự</Text>
                <View className="bg-orange-100 px-2 py-0.5 rounded ml-2">
                  <Text className="text-primary text-[8px] font-bold">AI Suggests</Text>
                </View>
              </View>
              
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mr-[-20px]">
                {recommendations.map((p, idx) => (
                  <View key={p.id || `rec-${idx}`} className="w-[160px] mr-4">
                    <ProductCard 
                      product={p} 
                      onPress={(prod) => navigation.push('ProductDetail', { productId: prod.id })} 
                    />
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          <View className="h-32" />
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 pt-4 pb-10 flex-row gap-3 shadow-2xl">
        <TouchableOpacity 
          onPress={handleChat}
          className="bg-gray-50 border border-gray-200 w-16 rounded-[24px] items-center justify-center"
        >
          <MessageSquare size={24} color={COLORS.secondary} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={handleAddToCart}
          className="flex-1 bg-secondary py-4 rounded-[24px] items-center justify-center"
        >
          <Text className="text-white font-bold text-sm">Thêm giỏ hàng</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={handleBuyNow}
          className="flex-1 bg-primary py-4 rounded-[24px] items-center justify-center shadow-lg shadow-orange-500/20"
        >
          <Text className="text-white font-bold text-sm">Mua ngay</Text>
        </TouchableOpacity>
      </View>

      {isShareModalVisible && product && (
        <ShareProductModal 
          product={product} 
          onClose={() => setIsShareModalVisible(false)} 
        />
      )}
    </View>
  );
};

export default ProductDetailScreen;
