import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Phone, Mail, ChevronLeft, Save, BadgeCheck } from 'lucide-react-native';
import { userApi } from '../../features/user/api';
import { useAuthStore } from '../../contexts/authContext';
import { COLORS } from '../../constants';

export default function EditProfileScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profile = await userApi.getProfile();
        setFullName(profile.fullName || '');
        setPhone(profile.phone || '');
      } catch (error) {
        console.error('Load profile error:', error);
      } finally {
        setFetching(false);
      }
    };
    loadProfile();
  }, []);

  const handleSave = async () => {
    if (!fullName) {
      Alert.alert('Lỗi', 'Vui lòng nhập họ và tên');
      return;
    }

    setLoading(true);
    try {
      await userApi.updateProfile({ fullName, phone });
      Alert.alert('Thành công', 'Cập nhật hồ sơ thành công!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Update profile error:', error);
      Alert.alert('Lỗi', 'Không thể cập nhật hồ sơ');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1 }} 
          className="px-8"
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-row items-center justify-between mt-4 mb-10">
            <TouchableOpacity onPress={() => navigation.goBack()} className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
               <ChevronLeft size={20} color={COLORS.secondary} />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-secondary tracking-tight">Chỉnh sửa hồ sơ</Text>
            <TouchableOpacity 
              onPress={handleSave}
              disabled={loading}
              className="bg-orange-50 p-3 rounded-2xl border border-orange-100"
            >
               {loading ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Save size={20} color={COLORS.primary} />}
            </TouchableOpacity>
          </View>

          <View className="items-center mb-10">
             <View className="bg-orange-50 p-6 rounded-full border border-orange-100">
                <User size={64} color={COLORS.primary} strokeWidth={1} />
             </View>
             <View className="mt-4 bg-secondary px-3 py-1 rounded-full flex-row items-center">
                <BadgeCheck size={12} color="#fff" />
                <Text className="text-white text-[10px] font-bold ml-1 uppercase tracking-widest">{user?.role}</Text>
             </View>
          </View>

          <View className="space-y-6">
            <View>
              <Text className="text-secondary font-bold mb-3 ml-1 text-xs uppercase tracking-widest">Họ và tên</Text>
              <View className="flex-row items-center bg-gray-50 border border-gray-100 rounded-[24px] px-5 py-4 focus:border-primary">
                <User size={18} color="#9ca3af" />
                <TextInput
                  className="flex-1 ml-4 text-secondary text-sm font-bold"
                  placeholder="Nhập họ tên"
                  value={fullName}
                  onChangeText={setFullName}
                />
              </View>
            </View>

            <View className="mt-6">
              <Text className="text-secondary font-bold mb-3 ml-1 text-xs uppercase tracking-widest">Số điện thoại</Text>
              <View className="flex-row items-center bg-gray-50 border border-gray-100 rounded-[24px] px-5 py-4 focus:border-primary">
                <Phone size={18} color="#9ca3af" />
                <TextInput
                  className="flex-1 ml-4 text-secondary text-sm font-bold"
                  placeholder="09xx xxx xxx"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <View className="mt-6">
              <Text className="text-secondary font-bold mb-3 ml-1 text-xs uppercase tracking-widest">Email (Không thể sửa)</Text>
              <View className="flex-row items-center bg-gray-100 border border-gray-100 rounded-[24px] px-5 py-4 opacity-60">
                <Mail size={18} color="#9ca3af" />
                <TextInput
                  className="flex-1 ml-4 text-secondary text-sm font-bold"
                  value={user?.email}
                  editable={false}
                />
              </View>
            </View>
          </View>

          <View className="mt-10" />
          
          <TouchableOpacity 
            className={`w-full bg-primary py-5 rounded-[24px] items-center shadow-xl shadow-orange-500/30 mb-10 ${loading ? 'opacity-70' : ''}`}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-bold text-base uppercase tracking-widest">
                Lưu thay đổi
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
