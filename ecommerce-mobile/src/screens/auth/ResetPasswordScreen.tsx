import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import apiClient from '../../api/client';
import { Lock, ShieldEllipsis } from 'lucide-react-native';

export default function ResetPasswordScreen({ route, navigation }: any) {
  const { email } = route.params || {};
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!code || !newPassword || !confirmPassword) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ các thông tin');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/auth/reset-password', {
        email,
        code,
        newPassword
      });
      
      Alert.alert(
        'Thành công',
        'Mật khẩu của bạn đã được cập nhật mới.',
        [{ text: 'Đăng nhập ngay', onPress: () => navigation.navigate('Login') }]
      );
    } catch (error: any) {
      console.error('Reset password error:', error);
      const message = error.response?.data?.message || 'Không thể đổi mật khẩu. Mã khôi phục không đúng.';
      Alert.alert('Lỗi', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="p-6">
        <View className="flex-1 justify-center">
          <View className="bg-orange-50 p-6 rounded-full self-center mb-8">
            <ShieldEllipsis size={64} color="#f97316" />
          </View>

          <Text className="text-3xl font-bold text-secondary mb-3 text-center" style={{ fontFamily: 'Inter_700Bold' }}>
            Đặt lại mật khẩu
          </Text>
          <Text className="text-gray-500 text-center mb-10 text-lg" style={{ fontFamily: 'Inter_400Regular' }}>
            Nhập mã khôi phục và mật khẩu mới của bạn bên dưới.
          </Text>

          <View className="space-y-5">
            <View>
              <Text className="text-secondary font-semibold mb-2 ml-1" style={{ fontFamily: 'Inter_600SemiBold' }}>Mã khôi phục</Text>
              <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3">
                <TextInput
                  className="flex-1 text-secondary text-base font-bold tracking-widest text-center"
                  placeholder="MÃ 6 SỐ"
                  placeholderTextColor="#9ca3af"
                  value={code}
                  onChangeText={setCode}
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>
            </View>

            <View>
              <Text className="text-secondary font-semibold mb-2 ml-1" style={{ fontFamily: 'Inter_600SemiBold' }}>Mật khẩu mới</Text>
              <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3">
                <Lock size={20} color="#9ca3af" />
                <TextInput
                  className="flex-1 ml-3 text-secondary text-base"
                  placeholder="••••••••"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry
                  value={newPassword}
                  onChangeText={setNewPassword}
                  style={{ fontFamily: 'Inter_400Regular' }}
                />
              </View>
            </View>

            <View>
              <Text className="text-secondary font-semibold mb-2 ml-1" style={{ fontFamily: 'Inter_600SemiBold' }}>Xác nhận mật khẩu</Text>
              <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3">
                <Lock size={20} color="#9ca3af" />
                <TextInput
                  className="flex-1 ml-3 text-secondary text-base"
                  placeholder="••••••••"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  style={{ fontFamily: 'Inter_400Regular' }}
                />
              </View>
            </View>

            <TouchableOpacity 
              className={`w-full bg-secondary p-4 rounded-2xl items-center mt-6 shadow-lg shadow-gray-300 ${loading ? 'opacity-70' : ''}`}
              onPress={handleReset}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-bold text-lg" style={{ fontFamily: 'Inter_700Bold' }}>
                  Cập nhật mật khẩu
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
