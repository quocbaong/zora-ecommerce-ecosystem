import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  Alert, 
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Save, MapPin, User, Phone, CheckCircle2 } from 'lucide-react-native';
import { userApi } from '../../features/user/api';
import { COLORS } from '../../constants';

export default function AddressFormScreen({ route, navigation }: any) {
  const { address } = route.params || {};
  const isEdit = !!address;

  const [fullName, setFullName] = useState(address?.fullName || '');
  const [phoneNumber, setPhoneNumber] = useState(address?.phoneNumber || '');
  const [street, setStreet] = useState(address?.street || '');
  const [ward, setWard] = useState(address?.ward || '');
  const [district, setDistrict] = useState(address?.district || '');
  const [province, setProvince] = useState(address?.province || '');
  const [isDefault, setIsDefault] = useState(address?.isDefault || false);
  const [type, setType] = useState(address?.type || 'HOME');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!fullName || !phoneNumber || !street || !ward || !district || !province) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin địa chỉ');
      return;
    }

    setLoading(true);
    const payload = {
      receiverName: fullName,
      phone: phoneNumber,
      street,
      ward,
      district,
      province,
      isDefault,
      type
    };

    try {
      if (isEdit) {
        await userApi.updateAddress(address.id, payload);
        Alert.alert('Thành công', 'Cập nhật địa chỉ thành công');
      } else {
        await userApi.addAddress(payload);
        Alert.alert('Thành công', 'Thêm địa chỉ mới thành công');
      }
      navigation.goBack();
    } catch (error) {
      console.error('Save address error:', error);
      Alert.alert('Lỗi', 'Không thể lưu địa chỉ');
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
        <ScrollView 
          className="flex-1 px-6"
          showsVerticalScrollIndicator={false}
        >
          {/* Custom Header */}
          <View className="flex-row items-center justify-between mt-4 mb-8">
            <TouchableOpacity onPress={() => navigation.goBack()} className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
               <ChevronLeft size={20} color={COLORS.secondary} />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-secondary tracking-tight">
               {isEdit ? 'Sửa địa chỉ' : 'Thêm địa chỉ mới'}
            </Text>
            <TouchableOpacity 
              onPress={handleSave}
              disabled={loading}
              className="bg-orange-50 p-3 rounded-2xl border border-orange-100"
            >
               {loading ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Save size={20} color={COLORS.primary} />}
            </TouchableOpacity>
          </View>

          <View className="mb-10">
            <Text className="text-gray-400 font-medium text-xs mb-8">Vui lòng nhập thông tin chính xác để ZORA giao hàng đúng hạn cho bạn.</Text>
            
            <View className="space-y-6">
              <FormInput label="Họ tên người nhận" value={fullName} onChange={setFullName} icon={<User size={18} color="#9ca3af" />} placeholder="Nguyễn Văn A" />
              <FormInput label="Số điện thoại" value={phoneNumber} onChange={setPhoneNumber} icon={<Phone size={18} color="#9ca3af" />} placeholder="09xx xxx xxx" keyboardType="phone-pad" />
              
              <View className="mt-8 mb-4 border-b border-gray-50 pb-2">
                 <Text className="text-secondary font-bold text-xs uppercase tracking-widest">Địa chỉ chi tiết</Text>
              </View>

              <FormInput label="Tỉnh / Thành phố" value={province} onChange={setProvince} icon={<MapPin size={18} color="#9ca3af" />} placeholder="Hà Nội" />
              <FormInput label="Quận / Huyện" value={district} onChange={setDistrict} icon={<MapPin size={18} color="#9ca3af" />} placeholder="Cầu Giấy" />
              <FormInput label="Phường / Xã" value={ward} onChange={setWard} icon={<MapPin size={18} color="#9ca3af" />} placeholder="Dịch Vọng Hậu" />
              <FormInput label="Địa chỉ cụ thể (Số nhà, tên đường)" value={street} onChange={setStreet} icon={<MapPin size={18} color="#9ca3af" />} placeholder="Số 123, Đường Láng" />
            </View>

            <View className="mt-8 bg-gray-50 p-6 rounded-[32px] border border-gray-100">
               <Text className="text-secondary font-bold text-sm mb-4">Loại địa chỉ</Text>
               <View className="flex-row gap-4">
                  <TouchableOpacity 
                    onPress={() => setType('HOME')}
                    className={`flex-1 flex-row items-center justify-center py-4 rounded-2xl border ${type === 'HOME' ? 'bg-secondary border-secondary' : 'bg-white border-gray-200'}`}
                  >
                     <Text className={`font-bold text-xs ${type === 'HOME' ? 'text-white' : 'text-gray-400'}`}>Nhà riêng</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => setType('OFFICE')}
                    className={`flex-1 flex-row items-center justify-center py-4 rounded-2xl border ${type === 'OFFICE' ? 'bg-secondary border-secondary' : 'bg-white border-gray-200'}`}
                  >
                     <Text className={`font-bold text-xs ${type === 'OFFICE' ? 'text-white' : 'text-gray-400'}`}>Văn phòng</Text>
                  </TouchableOpacity>
               </View>

               <View className="flex-row items-center justify-between mt-8 pt-6 border-t border-gray-100">
                  <View>
                    <Text className="text-secondary font-bold text-sm">Đặt làm mặc định</Text>
                    <Text className="text-gray-400 text-[10px] mt-1">Dùng địa chỉ này cho các đơn hàng sau</Text>
                  </View>
                  <Switch 
                    value={isDefault} 
                    onValueChange={setIsDefault} 
                    trackColor={{ false: '#e2e8f0', true: COLORS.primary }}
                    thumbColor="#fff"
                  />
               </View>
            </View>

            <TouchableOpacity 
              className={`w-full bg-primary py-5 rounded-[24px] items-center shadow-xl shadow-orange-500/20 mt-6 mb-10 ${loading ? 'opacity-70' : ''}`}
              onPress={handleSave}
              disabled={loading}
            >
               {loading ? <ActivityIndicator color="#fff" /> : (
                 <Text className="text-white font-bold text-base uppercase tracking-widest">{isEdit ? 'Cập nhật địa chỉ' : 'Lưu địa chỉ'}</Text>
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
    <View className="mt-6">
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
