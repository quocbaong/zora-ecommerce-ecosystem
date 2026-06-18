import React, { useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  Alert,
  ActivityIndicator,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Star, Camera, UploadCloud } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../../constants';
import apiClient from '../../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ReviewFormScreen({ route, navigation }: any) {
  const { orderId, items } = route.params;
  const item = items[0]; // Assuming writing review for first item for simplicity

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const submitReview = async () => {
    setLoading(true);
    try {
      let imageUrl = null;
      if (imageUri) {
        const formData = new FormData();
        const filename = imageUri.split('/').pop() || 'review.jpg';
        const match = /\.(\w+)$/.exec(filename);
        let ext = match ? match[1].toLowerCase() : 'jpeg';
        if (ext === 'jpg') ext = 'jpeg';
        const type = `image/${ext}`;

        formData.append('file', { uri: imageUri, name: filename, type } as any);
        const uploadRes = await apiClient.post('/chat/upload', formData, { 
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        imageUrl = uploadRes.data.url;
      }

      const finalComment = comment.trim() || `Đánh giá ${rating} sao`;
      const targetProductId = item.productId || item.product?.id || item.id;

      await apiClient.post(`/products/${targetProductId}/reviews`, {
        rating,
        reviewText: finalComment,
        imageUrls: imageUrl ? [imageUrl] : []
      });

      const stored = await AsyncStorage.getItem('reviewed_orders');
      const reviewed = stored ? JSON.parse(stored) : {};
      reviewed[orderId] = true;
      await AsyncStorage.setItem('reviewed_orders', JSON.stringify(reviewed));

      Alert.alert('Thành công', 'Đánh giá của bạn đã được gửi!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      console.error(error);
      const backendError = error.response?.data?.message || error.response?.data?.error || 'Không thể gửi đánh giá lúc này.';
      Alert.alert('Lỗi', backendError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="px-6 pt-4 pb-6 bg-white shadow-sm flex-row items-center border-b border-gray-50">
         <TouchableOpacity onPress={() => navigation.goBack()} className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
            <ChevronLeft size={20} color={COLORS.secondary} />
         </TouchableOpacity>
         <View className="ml-4 flex-1">
            <Text className="text-secondary font-bold text-xl tracking-tighter">Đánh giá sản phẩm</Text>
         </View>
      </View>

      <ScrollView className="p-6">
        <View className="bg-gray-50 p-4 rounded-3xl border border-gray-100 mb-6 flex-row items-center">
          <View className="flex-1">
            <Text className="text-secondary font-bold text-sm">{item.productName}</Text>
          </View>
        </View>

        <View className="items-center mb-8">
          <Text className="text-gray-500 font-bold text-sm mb-3">Chất lượng sản phẩm</Text>
          <View className="flex-row">
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setRating(star)} className="px-1">
                <Star 
                  size={40} 
                  color={star <= rating ? '#facc15' : '#e5e7eb'} 
                  fill={star <= rating ? '#facc15' : 'transparent'} 
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Text className="text-secondary font-bold text-sm mb-3">Nhận xét của bạn</Text>
        <TextInput 
          multiline
          numberOfLines={4}
          value={comment}
          onChangeText={setComment}
          placeholder="Hãy chia sẻ những điều bạn thích về sản phẩm này nhé..."
          className="bg-gray-50 p-4 rounded-3xl border border-gray-100 h-32 text-secondary"
          textAlignVertical="top"
        />

        <Text className="text-secondary font-bold text-sm mb-3 mt-6">Thêm hình ảnh / Video</Text>
        <View className="flex-row">
          <TouchableOpacity 
            onPress={pickImage}
            className="w-24 h-24 bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl items-center justify-center mr-4"
          >
            <Camera size={24} color="#9ca3af" />
            <Text className="text-gray-400 text-[10px] mt-1 font-bold">Tải ảnh lên</Text>
          </TouchableOpacity>

          {imageUri && (
            <View className="w-24 h-24 rounded-3xl overflow-hidden border border-gray-200">
              <Image source={{ uri: imageUri }} style={{ width: '100%', height: '100%' }} />
            </View>
          )}
        </View>
      </ScrollView>

      <View className="p-6 pb-10 bg-white border-t border-gray-50">
        <TouchableOpacity 
          onPress={submitReview}
          disabled={loading}
          className="bg-primary py-4 rounded-3xl items-center shadow-xl shadow-orange-500/30"
        >
          {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-base uppercase">Gửi Đánh Giá</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
