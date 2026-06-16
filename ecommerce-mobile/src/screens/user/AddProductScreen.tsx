import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  Alert, 
  ActivityIndicator, 
  Image,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Save, Plus, X, Package, Tag, Layers, Database } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { productApi } from '../../features/product/api';
import { COLORS } from '../../constants';
import { Category } from '../../types';

export default function AddProductScreen({ navigation }: any) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await productApi.getCategories();
        setCategories(data);
      } catch (error) {
        console.error('Fetch categories error:', error);
      } finally {
        setFetching(false);
      }
    };
    loadCategories();
  }, []);

  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Lỗi', 'Cần quyền truy cập thư viện ảnh để chọn ảnh sản phẩm');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      setImages([...images, ...result.assets]);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!name || !price || !stock || !categoryId) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ các trường bắt buộc (*)');
      return;
    }

    setLoading(true);
    try {
      // 1. Tạo sản phẩm gốc
      const payload = {
        name,
        description,
        price: parseFloat(price),
        stock: parseInt(stock),
        categoryId,
        status: 'ACTIVE'
      };
      
      const newProduct = await productApi.createProduct(payload);

      // 2. Upload ảnh nếu có
      if (images.length > 0) {
        await productApi.uploadProductImages(newProduct.id, images);
      }

      Alert.alert('Thành công', 'Đăng bán sản phẩm mới thành công!', [
        { text: 'Tuyệt vời', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Create product error:', error);
      Alert.alert('Lỗi', 'Không thể tạo sản phẩm. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-50">
          <TouchableOpacity onPress={() => navigation.goBack()} className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
            <ChevronLeft size={20} color={COLORS.secondary} />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-secondary tracking-tight">Đăng sản phẩm</Text>
          <TouchableOpacity 
            onPress={handleSave}
            disabled={loading}
            className="bg-orange-50 p-3 rounded-2xl border border-orange-100"
          >
            {loading ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Save size={20} color={COLORS.primary} />}
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {/* Image Selection Area */}
          <View className="px-6 py-6 border-b border-gray-50">
            <Text className="text-secondary font-bold text-xs uppercase tracking-widest mb-4">Hình ảnh sản phẩm (Tối đa 5)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
              {images.map((img, index) => (
                <View key={index} className="mr-4 relative">
                  <Image source={{ uri: img.uri }} className="w-24 h-24 rounded-2xl border border-gray-100" />
                  <TouchableOpacity 
                    onPress={() => removeImage(index)}
                    className="absolute -top-1 -right-1 bg-red-500 rounded-full p-1 border-2 border-white"
                  >
                    <X size={12} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
              {images.length < 5 && (
                <TouchableOpacity 
                  onPress={pickImages}
                  className="w-24 h-24 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 items-center justify-center"
                >
                  <Plus size={24} color="#9ca3af" />
                  <Text className="text-[10px] text-gray-400 font-bold mt-1">Thêm ảnh</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>

          <View className="p-6 space-y-6">
            <FormInput 
              label="Tên sản phẩm *" 
              value={name} 
              onChange={setName} 
              icon={<Package size={18} color="#9ca3af" />} 
              placeholder="Ví dụ: iPhone 15 Pro Max" 
            />
            
            <View>
               <Text className="text-secondary font-bold mb-3 ml-1 text-[10px] uppercase tracking-widest">Mô tả sản phẩm</Text>
               <View className="bg-gray-50 border border-gray-100 rounded-[20px] px-5 py-4">
                  <TextInput
                    className="text-secondary text-sm font-bold min-h-[100px]"
                    placeholder="Mô tả chi tiết về sản phẩm của bạn..."
                    placeholderTextColor="#9ca3af"
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    textAlignVertical="top"
                  />
               </View>
            </View>

            <View className="flex-row gap-4">
               <View className="flex-1">
                  <FormInput 
                    label="Giá bán (₫) *" 
                    value={price} 
                    onChange={setPrice} 
                    icon={<Tag size={18} color="#9ca3af" />} 
                    placeholder="0" 
                    keyboardType="numeric" 
                  />
               </View>
               <View className="flex-1">
                  <FormInput 
                    label="Kho hàng *" 
                    value={stock} 
                    onChange={setStock} 
                    icon={<Database size={18} color="#9ca3af" />} 
                    placeholder="0" 
                    keyboardType="numeric" 
                  />
               </View>
            </View>

            {/* Category Dropdown (Simplified for now with List) */}
            <View>
               <Text className="text-secondary font-bold mb-3 ml-1 text-[10px] uppercase tracking-widest">Danh mục sản phẩm *</Text>
               <View className="bg-gray-50 border border-gray-100 rounded-[20px] p-4">
                  {fetching ? (
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                       {categories.map((cat, index) => (
                         <TouchableOpacity 
                           key={cat.id || index.toString()}
                           onPress={() => setCategoryId(cat.id)}
                           className={`mr-3 px-4 py-2 rounded-xl border ${categoryId === cat.id ? 'bg-secondary border-secondary' : 'bg-white border-gray-200'}`}
                         >
                            <Text className={`text-[10px] font-bold ${categoryId === cat.id ? 'text-white' : 'text-gray-400'}`}>{cat.name}</Text>
                         </TouchableOpacity>
                       ))}
                    </ScrollView>
                  )}
               </View>
            </View>

            <View className="h-20" />
            
            <TouchableOpacity 
              className={`w-full bg-primary py-5 rounded-[24px] items-center shadow-xl shadow-orange-500/30 mb-10 ${loading ? 'opacity-70' : ''}`}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : (
                <Text className="text-white font-bold text-base uppercase tracking-widest">Đăng bán ngay</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function FormInput({ label, value, onChange, icon, placeholder, keyboardType = 'default' }: any) {
  return (
    <View>
      <Text className="text-secondary font-bold mb-3 ml-1 text-[10px] uppercase tracking-widest">{label}</Text>
      <View className="flex-row items-center bg-gray-50 border border-gray-100 rounded-[20px] px-5 py-4">
        {icon}
        <TextInput
          className="flex-1 ml-4 text-secondary text-sm font-bold"
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          value={value}
          onChangeText={onChange}
          keyboardType={keyboardType}
        />
      </View>
    </View>
  );
}
