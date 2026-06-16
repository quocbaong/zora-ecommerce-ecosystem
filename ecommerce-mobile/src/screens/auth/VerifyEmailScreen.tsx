import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import apiClient from '../../api/client';
import { ShieldCheck } from 'lucide-react-native';

export default function VerifyEmailScreen({ route, navigation }: any) {
  const { email } = route.params || {};
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  
  const inputs = useRef<Array<TextInput | null>>([]);

  const handleChange = (text: string, index: number) => {
    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);

    if (text && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const verifyCode = code.join('');
    if (verifyCode.length < 6) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ 6 chữ số');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/auth/verify-email', null, { 
        params: { email, code: verifyCode } 
      });
      
      Alert.alert(
        'Thành công',
        'Email của bạn đã được xác thực thành công!',
        [{ text: 'Đăng nhập ngay', onPress: () => navigation.navigate('Login') }]
      );
    } catch (error: any) {
      console.error('Verification error:', error);
      const message = error.response?.data?.message || 'Mã xác thực không đúng hoặc đã hết hạn.';
      Alert.alert('Lỗi', message);
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    setResending(true);
    try {
      await apiClient.post('/auth/resend-verification', null, { params: { email } });
      Alert.alert('Thông báo', 'Mã xác thực mới đã được gửi đến email của bạn.');
    } catch (error: any) {
      Alert.alert('Lỗi', 'Không thể gửi lại mã. Vui lòng thử lại sau.');
    } finally {
      setResending(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white p-6"
    >
      <View className="flex-1 justify-center items-center">
        <View className="bg-orange-50 p-6 rounded-full mb-8">
          <ShieldCheck size={64} color="#f97316" />
        </View>

        <Text className="text-3xl font-bold text-secondary mb-3 text-center" style={{ fontFamily: 'Inter_700Bold' }}>
          Xác thực Email
        </Text>
        <Text className="text-gray-500 text-center mb-10 text-lg" style={{ fontFamily: 'Inter_400Regular' }}>
          Chúng tôi đã gửi mã xác thực gồm 6 chữ số đến{'\n'}
          <Text className="text-secondary font-bold">{email}</Text>
        </Text>

        <View className="flex-row justify-between w-full mb-10">
          {code.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => { inputs.current[index] = ref; }}
              className="w-[14%] aspect-square bg-gray-50 border border-gray-200 rounded-2xl text-center text-2xl font-bold text-secondary"
              maxLength={1}
              keyboardType="number-pad"
              value={digit}
              onChangeText={(text) => handleChange(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              style={{ fontFamily: 'Inter_700Bold' }}
            />
          ))}
        </View>

        <TouchableOpacity 
          className={`w-full bg-secondary p-4 rounded-2xl items-center shadow-lg shadow-gray-300 ${loading ? 'opacity-70' : ''}`}
          onPress={handleVerify}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-bold text-lg" style={{ fontFamily: 'Inter_700Bold' }}>
              Xác thực ngay
            </Text>
          )}
        </TouchableOpacity>

        <View className="flex-row justify-center mt-8">
          <Text className="text-gray-500" style={{ fontFamily: 'Inter_400Regular' }}>Bạn không nhận được mã? </Text>
          <TouchableOpacity onPress={resendCode} disabled={resending}>
            <Text className={`text-primary font-bold ${resending ? 'opacity-50' : ''}`} style={{ fontFamily: 'Inter_700Bold' }}>
              {resending ? 'Đang gửi...' : 'Gửi lại'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
