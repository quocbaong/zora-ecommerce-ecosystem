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
import { ChevronLeft, Camera, AlertTriangle } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { orderApi } from '../../features/order/api';
import { COLORS } from '../../constants';

export default function DisputeFormScreen({ route, navigation }: any) {
  const { orderId } = route.params;

  const [reason, setReason] = useState('Hàng bị lỗi / Không hoạt động');
  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const reasons = [
    'Hàng bị lỗi / Không hoạt động',
    'Giao sai sản phẩm',
    'Thiếu phụ kiện / Hàng hóa',
    'Khác'
  ];

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const submitDispute = async () => {
    if (!description) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập mô tả chi tiết');
      return;
    }
    setLoading(true);
    try {
      let imageUrl = null;
      if (imageUri) {
        imageUrl = imageUri; // Mock upload
      }

      await orderApi.requestDispute(orderId, {
        reason,
        description,
        evidenceUrls: imageUrl ? [imageUrl] : []
      });

      Alert.alert('Thành công', 'Yêu cầu trả hàng / Hoàn tiền đã được gửi. Chúng tôi sẽ xử lý sớm nhất.', [
        { text: 'OK', onPress: () => navigation.navigate('Orders') }
      ]);
    } catch (error) {
      console.error(error);
      Alert.alert('Lỗi', 'Không thể gửi yêu cầu khiếu nại lúc này.');
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
            <Text className="text-secondary font-bold text-xl tracking-tighter">Yêu cầu Trả hàng / Hoàn tiền</Text>
         </View>
      </View>

      <ScrollView className="p-6">
        <View className="bg-red-50 p-4 rounded-3xl flex-row items-start mb-6">
          <AlertTriangle size={20} color="#ef4444" className="mr-3" />
          <Text className="text-red-600 text-xs flex-1 leading-5">Vui lòng cung cấp hình ảnh rõ nét và mô tả chi tiết để quá trình xử lý diễn ra nhanh chóng.</Text>
        </View>

        <Text className="text-secondary font-bold text-sm mb-3">Lý do trả hàng</Text>
        <View className="mb-6 space-y-2">
          {reasons.map((r) => (
            <TouchableOpacity 
              key={r} 
              onPress={() => setReason(r)}
              className={`p-4 rounded-2xl border ${reason === r ? 'border-primary bg-orange-50' : 'border-gray-100 bg-gray-50'} flex-row items-center`}
            >
              <View className={`w-4 h-4 rounded-full border-2 mr-3 ${reason === r ? 'border-primary bg-primary' : 'border-gray-300 bg-white'}`} />
              <Text className={`font-bold text-sm ${reason === r ? 'text-primary' : 'text-gray-500'}`}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text className="text-secondary font-bold text-sm mb-3">Chi tiết vấn đề</Text>
        <TextInput 
          multiline
          numberOfLines={4}
          value={description}
          onChangeText={setDescription}
          placeholder="Mô tả cụ thể tình trạng hàng hóa bạn nhận được..."
          className="bg-gray-50 p-4 rounded-3xl border border-gray-100 h-32 text-secondary"
          textAlignVertical="top"
        />

        <Text className="text-secondary font-bold text-sm mb-3 mt-6">Bằng chứng (Hình ảnh / Video)</Text>
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
          onPress={submitDispute}
          disabled={loading}
          className="bg-red-500 py-4 rounded-3xl items-center shadow-xl shadow-red-500/30"
        >
          {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-base uppercase">Gửi Yêu Cầu</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
