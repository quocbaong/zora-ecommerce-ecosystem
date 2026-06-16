import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Lock, ChevronLeft, ShieldCheck } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../constants';
import apiClient from '../../api/client';

export default function ChangePasswordScreen({ navigation }: any) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp');
      return;
    }

    setLoading(true);
    try {
      await apiClient.put('/auth/password', {
        oldPassword,
        newPassword
      });
      
      Alert.alert(
        'Thành công',
        'Mật khẩu của bạn đã được thay đổi thành công!',
        [{ text: 'Về trang cá nhân', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      console.error('Change password error:', error);
      const message = error.response?.data?.message || 'Không thể đổi mật khẩu. Vui lòng kiểm tra lại mật khẩu cũ.';
      Alert.alert('Lỗi', message);
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
          contentContainerStyle={{ flexGrow: 1 }} 
          className="px-8"
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-row items-center justify-between mt-4 mb-10">
            <TouchableOpacity onPress={() => navigation.goBack()} className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
               <ChevronLeft size={20} color={COLORS.secondary} />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-secondary tracking-tight">Bảo mật tài khoản</Text>
            <View className="w-10" /> 
          </View>

          <View className="items-center mb-10">
             <View className="bg-orange-50 p-8 rounded-full border border-orange-100 mb-6">
                <ShieldCheck size={72} color={COLORS.primary} strokeWidth={1} />
             </View>
             <Text className="text-secondary font-bold text-2xl tracking-tight">Đổi mật khẩu</Text>
             <Text className="text-gray-400 text-center mt-2 font-medium px-4">
               Mật khẩu mới của bạn phải khác{'\n'}với mật khẩu đã sử dụng trước đó.
             </Text>
          </View>

          <View className="space-y-6">
            <View>
              <Text className="text-secondary font-bold mb-3 ml-1 text-[10px] uppercase tracking-[2px]">Mật khẩu hiện tại</Text>
              <View className="flex-row items-center bg-gray-50 border border-gray-100 rounded-[24px] px-6 py-4">
                <Lock size={18} color={COLORS.primary} strokeWidth={2.5} />
                <TextInput
                  className="flex-1 ml-4 text-secondary text-sm font-bold"
                  placeholder="••••••••"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry
                  value={oldPassword}
                  onChangeText={setOldPassword}
                />
              </View>
            </View>

            <View className="mt-6">
              <Text className="text-secondary font-bold mb-3 ml-1 text-[10px] uppercase tracking-[2px]">Mật khẩu mới</Text>
              <View className="flex-row items-center bg-gray-50 border border-gray-100 rounded-[24px] px-6 py-4">
                <Lock size={18} color={COLORS.primary} strokeWidth={2.5} />
                <TextInput
                  className="flex-1 ml-4 text-secondary text-sm font-bold"
                  placeholder="••••••••"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry
                  value={newPassword}
                  onChangeText={setNewPassword}
                />
              </View>
            </View>

            <View className="mt-6">
              <Text className="text-secondary font-bold mb-3 ml-1 text-[10px] uppercase tracking-[2px]">Xác nhận lại mật khẩu</Text>
              <View className="flex-row items-center bg-gray-50 border border-gray-100 rounded-[24px] px-6 py-4">
                <Lock size={18} color={COLORS.primary} strokeWidth={2.5} />
                <TextInput
                  className="flex-1 ml-4 text-secondary text-sm font-bold"
                  placeholder="••••••••"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
              </View>
            </View>

            <TouchableOpacity 
              className={`w-full bg-secondary py-5 rounded-[28px] items-center shadow-xl shadow-gray-200 mt-10 ${loading ? 'opacity-70' : ''}`}
              onPress={handleChangePassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-bold text-base uppercase tracking-[3px]">
                  Cập nhật ngay
                </Text>
              )}
            </TouchableOpacity>
          </View>
          
          <View className="flex-1 pb-10" />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
