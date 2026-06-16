import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, FlatList, Image, ActivityIndicator, Dimensions } from 'react-native';
import { Search, X, Film } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { giphyService, GiphyResult } from '../../../services/giphy/giphyService';
import { COLORS } from '../../../constants';

interface GifPickerPanelProps {
  onSelect: (url: string) => void;
  onClose: () => void;
}

const { width } = Dimensions.get('window');
const ITEM_SIZE = (width - 48) / 3;

export default function GifPickerPanel({ onSelect, onClose }: GifPickerPanelProps) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState<GiphyResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGifs();
  }, [query]);

  const loadGifs = async () => {
    setLoading(true);
    let results;
    try {
      if (query.trim()) {
        results = await giphyService.searchGifs(query);
      } else {
        results = await giphyService.trendingGifs();
      }
      setGifs(results || []);
    } catch (e) {
      console.warn('Failed to load GIFs', e);
      setGifs([]);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: GiphyResult }) => (
    <TouchableOpacity 
      onPress={() => onSelect(item.images.fixed_height.url)}
      style={{ width: ITEM_SIZE, height: ITEM_SIZE * 0.9 }}
      className="m-1 rounded-2xl overflow-hidden active:opacity-75 bg-gray-50 border border-gray-100 items-center justify-center shadow-sm"
    >
      <Image 
        source={{ uri: item.images.fixed_height_small.url }} 
        className="w-full h-full"
        resizeMode="cover"
      />
    </TouchableOpacity>
  );

  return (
    <View className="bg-white rounded-t-[40px] h-full flex-col shadow-2xl">
      {/* Drag Indicator */}
      <View className="items-center pt-3 pb-1">
        <View className="w-12 h-1.5 bg-gray-200 rounded-full" />
      </View>

      {/* Header */}
      <View className="px-6 py-3 flex-row items-center justify-between border-b border-gray-50">
        <View className="flex-row items-center">
          <View className="w-8 h-8 rounded-full bg-violet-50 items-center justify-center mr-2">
            <Film size={16} color="#8b5cf6" />
          </View>
          <Text className="text-lg font-black text-secondary">Tìm kiếm ảnh GIF</Text>
        </View>
        <TouchableOpacity onPress={onClose} className="p-2 bg-gray-100 rounded-full">
          <X size={18} color={COLORS.secondary} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View className="px-6 py-4">
        <View className="flex-row items-center bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3.5 shadow-sm">
          <Search size={18} color="#9ca3af" />
          <TextInput
            className="flex-1 ml-3 text-sm text-secondary font-bold"
            placeholder="Tìm kiếm ảnh GIF động..."
            placeholderTextColor="#9ca3af"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            style={{ paddingVertical: 0 }}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} className="bg-gray-200/60 p-1.5 rounded-full">
              <X size={12} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content */}
      <View className="flex-1 px-4">
        {loading && gifs.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#8b5cf6" size="large" />
            <Text className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-4">Đang tải ảnh GIF...</Text>
          </View>
        ) : (
          <FlatList
            data={gifs}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            numColumns={3}
            contentContainerStyle={{ paddingBottom: 30 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View className="items-center justify-center py-20">
                <Film size={48} color="#e5e7eb" strokeWidth={1} />
                <Text className="text-gray-400 text-sm font-bold mt-4">Không tìm thấy ảnh GIF nào</Text>
                <Text className="text-gray-300 text-[10px] uppercase font-bold tracking-widest mt-1">Vui lòng nhập từ khóa tìm kiếm khác</Text>
              </View>
            }
          />
        )}
      </View>

      {/* Footer Branding */}
      <View 
        className="px-6 py-3.5 border-t border-gray-100 flex-row items-center justify-between bg-gray-50/40"
        style={{ paddingBottom: Math.max(insets.bottom, 14) }}
      >
        <Text className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest">Powered by GIPHY</Text>
        <Image 
          source={{ uri: 'https://giphy.com/static/img/giphy_logo_square_social.png' }} 
          className="w-5 h-5 rounded-md"
        />
      </View>
    </View>
  );
}
