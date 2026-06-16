import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import apiClient from '../../api/client';
import { Mail, ArrowLeft, KeyRound } from 'lucide-react-native';

export default function ForgotPasswordScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendCode = async () => {
    if (!email) {
      Alert.alert('Lỗi', 'Vui lòng nhập địa chỉ email');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/auth/forgot-password', { email });
      Alert.alert(
        'Thành công',
        'Nếu tài khoản tồn tại, mã khôi phục đã được gửi vào email của bạn.',
        [{ text: 'Tiếp tục', onPress: () => navigation.navigate('ResetPassword', { email }) }]
      );
    } catch (error: any) {
      console.error('Forgot password error:', error);
      Alert.alert('Lỗi', 'Có lỗi xảy ra. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white p-6">
      <TouchableOpacity 
        className="mt-10 mb-6 bg-gray-50 self-start p-3 rounded-2xl"
        onPress={() => navigation.goBack()}
      >
        <ArrowLeft size={24} color="#102a43" />
      </TouchableOpacity>

      <View className="flex-1">
        <View className="bg-orange-50 p-6 rounded-full self-center mb-8">
          <KeyRound size={64} color="#f97316" />
        </View>

        <Text className="text-3xl font-bold text-secondary mb-3 text-center" style={{ fontFamily: 'Inter_700Bold' }}>
          Quên mật khẩu?
        </Text>
        <Text className="text-gray-500 text-center mb-10 text-lg" style={{ fontFamily: 'Inter_400Regular' }}>
          Đừng lo lắng! Hãy nhập email của bạn và chúng tôi sẽ gửi mã khôi phục cho bạn.
        </Text>

        <View className="mb-8">
          <Text className="text-secondary font-semibold mb-2 ml-1" style={{ fontFamily: 'Inter_600SemiBold' }}>Email khôi phục</Text>
          <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3">
            <Mail size={20} color="#9ca3af" />
            <TextInput
              className="flex-1 ml-3 text-secondary text-base"
              placeholder="name@example.com"
              placeholderTextColor="#9ca3af"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              style={{ fontFamily: 'Inter_400Regular' }}
            />
          </View>
        </View>

        <TouchableOpacity 
          className={`w-full bg-secondary p-4 rounded-2xl items-center shadow-lg shadow-gray-300 ${loading ? 'opacity-70' : ''}`}
          onPress={handleSendCode}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-bold text-lg" style={{ fontFamily: 'Inter_700Bold' }}>
              Gửi mã khôi phục
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
