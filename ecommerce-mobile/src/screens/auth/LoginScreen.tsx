import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../contexts/authContext';
import apiClient from '../../api/client';
import { Eye, EyeOff, Lock, Mail, ChevronLeft } from 'lucide-react-native';
import { COLORS } from '../../constants';

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const login = useAuthStore((state) => state.login);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin');
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      const { accessToken, refreshToken, user } = response.data;
      
      await login(accessToken, refreshToken, user);
    } catch (error: any) {
      console.error('Login error:', error);
      const message = error.response?.data?.message || 'Đăng nhập thất bại. Kiểm tra lại email và mật khẩu.';
      Alert.alert('Lỗi', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1 }} 
          className="px-8"
          showsVerticalScrollIndicator={false}
        >
          <View className="pt-12 mb-12">
             <Text className="text-secondary font-bold text-5xl tracking-tighter">ZORA</Text>
             <View className="w-12 h-1.5 bg-primary mt-2 rounded-full" />
          </View>

          <View className="mb-10">
            <Text className="text-3xl font-bold text-secondary tracking-tight mb-2">
              Chào mừng trở lại!
            </Text>
            <Text className="text-gray-400 text-base font-medium">
              Đăng nhập để trải nghiệm mua sắm tuyệt vời nhất tại ZORA.
            </Text>
          </View>

          <View className="space-y-6">
            <View>
              <Text className="text-secondary font-bold mb-3 ml-1 text-xs uppercase tracking-widest">Email đăng nhập</Text>
              <View className="flex-row items-center bg-gray-50 border border-gray-100 rounded-[24px] px-5 py-4 focus:border-primary">
                <Mail size={18} color="#9ca3af" />
                <TextInput
                  className="flex-1 ml-4 text-secondary text-sm font-bold"
                  placeholder="email@example.com"
                  placeholderTextColor="#9ca3af"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View className="mt-6">
              <Text className="text-secondary font-bold mb-3 ml-1 text-xs uppercase tracking-widest">Mật khẩu</Text>
              <View className="flex-row items-center bg-gray-50 border border-gray-100 rounded-[24px] px-5 py-4 focus:border-primary">
                <Lock size={18} color="#9ca3af" />
                <TextInput
                  className="flex-1 ml-4 text-secondary text-sm font-bold"
                  placeholder="••••••••"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={18} color="#9ca3af" /> : <Eye size={18} color="#9ca3af" />}
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity 
              className="items-end mt-4 px-2"
              onPress={() => navigation.navigate('ForgotPassword')}
            >
              <Text className="text-primary font-bold text-xs tracking-tight">Quên mật khẩu?</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              className={`w-full bg-primary py-5 rounded-[24px] items-center shadow-xl shadow-orange-500/30 mt-8 ${loading ? 'opacity-70' : ''}`}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-bold text-base uppercase tracking-widest">
                  Đăng nhập ngay
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <View className="flex-1" />

          <View className="flex-row justify-center pb-10">
            <Text className="text-gray-400 font-medium text-sm">Chưa có tài khoản? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text className="text-secondary font-bold text-sm underline">Đăng ký mới</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
