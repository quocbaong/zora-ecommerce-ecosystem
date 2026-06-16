import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Star, Truck } from 'lucide-react-native';
import { Product } from '../types';

interface ProductCardProps {
  product: Product;
  onPress: (product: Product) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onPress }) => {
  const discount = product.discountPercent || 0;
  const originalPrice = product.price / (1 - discount / 100);
  
  return (
    <TouchableOpacity 
      onPress={() => onPress(product)}
      activeOpacity={0.8}
      className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 mb-4 w-[48%]"
      style={{ 
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3 
      }}
    >
      <View className="relative">
        <Image 
          source={{ uri: product.images[0] || 'https://via.placeholder.com/150' }} 
          className="w-full h-44 bg-gray-50"
          resizeMode="cover"
        />
        
        {/* Badges */}
        <View className="absolute top-2 left-2 flex-row gap-1">
          {product.verified && (
            <View className="bg-secondary px-2 py-1 rounded-lg">
              <Text className="text-white text-[8px] font-bold uppercase tracking-wider">Zora Mall</Text>
            </View>
          )}
          {discount > 0 && (
            <View className="bg-primary px-2 py-1 rounded-lg shadow-sm">
              <Text className="text-white text-[9px] font-bold">-{discount}%</Text>
            </View>
          )}
        </View>

        {/* Favorite marker */}
        <View className="absolute bottom-2 left-2 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200">
          <Text className="text-primary text-[8px] font-bold">Yêu thích+</Text>
        </View>
      </View>
      
      <View className="p-3">
        <Text className="text-secondary font-bold text-xs h-9 mb-1 leading-4" numberOfLines={2}>
          {product.name}
        </Text>
        
        <View className="flex-row items-center mb-2">
          <View className="flex-row mr-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star 
                key={s} 
                size={8} 
                color={s <= (product.ratingAvg || 0) ? "#FBBF24" : "#E5E7EB"} 
                fill={s <= (product.ratingAvg || 0) ? "#FBBF24" : "#E5E7EB"} 
              />
            ))}
          </View>
          <Text className="text-[9px] text-gray-400">Đã bán {product.soldCount || '0'}</Text>
        </View>
        
        <View className="flex-row items-center justify-between mt-auto">
          <View>
            {discount > 0 && (
              <Text className="text-gray-300 line-through text-[9px] mb-[-2px]">
                ₫{Math.round(originalPrice).toLocaleString()}
              </Text>
            )}
            <Text className="text-primary font-bold text-sm">
              ₫{product.price.toLocaleString()}
            </Text>
          </View>
          
          <View className="bg-gray-50 p-1.5 rounded-full border border-gray-100">
            <Truck size={12} color="#22c55e" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default ProductCard;
