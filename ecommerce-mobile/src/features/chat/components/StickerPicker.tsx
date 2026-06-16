import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, FlatList, Image, ActivityIndicator, Dimensions } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { giphyService, GiphyResult } from '../../../services/giphy/giphyService';
import { COLORS } from '../../../constants';

interface StickerPickerProps {
  onSelect: (url: string) => void;
  onClose: () => void;
}

const { width } = Dimensions.get('window');
const ITEM_SIZE = (width - 60) / 3;

export default function StickerPicker({ onSelect, onClose }: StickerPickerProps) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [stickers, setStickers] = useState<GiphyResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStickers();
  }, [query]);

  const loadStickers = async () => {
    setLoading(true);
    let results;
    if (query.trim()) {
      results = await giphyService.search(query);
    } else {
      results = await giphyService.trending();
    }
    setStickers(results);
    setLoading(false);
  };

  const renderItem = ({ item }: { item: GiphyResult }) => (
    <TouchableOpacity 
      onPress={() => onSelect(item.images.fixed_height_still.url)}
      style={{ width: ITEM_SIZE, height: ITEM_SIZE }}
      className="m-1 rounded-xl overflow-hidden active:opacity-70 bg-gray-50 items-center justify-center"
    >
      <Image 
        source={{ uri: item.images.fixed_height_small_still.url }} 
        className="w-full h-full"
        resizeMode="contain"
      />
    </TouchableOpacity>
  );

  return (
    <View className="bg-white rounded-t-3xl h-full flex-col shadow-2xl">
      {/* Header */}
      <View className="px-5 py-4 flex-row items-center justify-between border-b border-gray-50">
        <Text className="text-lg font-black text-secondary">Chọn nhãn dán</Text>
        <TouchableOpacity onPress={onClose} className="p-2 bg-gray-50 rounded-full">
          <X size={20} color={COLORS.secondary} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View className="px-5 py-3">
        <View className="flex-row items-center bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3.5 shadow-sm">
          <Search size={18} color="#9ca3af" />
          <TextInput
            className="flex-1 ml-3 text-sm text-secondary font-medium"
            placeholder="Tìm kiếm nhãn dán..."
            placeholderTextColor="#9ca3af"
            value={query}
            onChangeText={setQuery}
            style={{ paddingVertical: 0 }}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <X size={16} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content */}
      <View className="flex-1">
        {loading && stickers.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color={COLORS.primary} />
          </View>
        ) : (
          <FlatList
            data={stickers}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            numColumns={3}
            contentContainerStyle={{ paddingHorizontal: 15, paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View className="items-center justify-center mt-10">
                <Text className="text-gray-400 text-sm font-medium">Không tìm thấy nhãn dán nào</Text>
              </View>
            }
          />
        )}
      </View>

      {/* Footer Branding */}
      <View 
        className="px-5 py-2 border-t border-gray-50 flex-row items-center justify-between bg-gray-50/50"
        style={{ paddingBottom: Math.max(insets.bottom, 12) }}
      >
        <Text className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Powered by GIPHY</Text>
        <Image 
          source={{ uri: 'https://giphy.com/static/img/giphy_logo_square_social.png' }} 
          className="w-4 h-4 rounded-sm"
        />
      </View>
    </View>
  );
}
