import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import apiClient from '../../api/client';
import { User as UserIcon, Mail, Lock, CheckCircle2, ChevronLeft } from 'lucide-react-native';
import { COLORS } from '../../constants';

export default function RegisterScreen({ navigation }: any) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('USER'); 
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!fullName || !email || !password) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/auth/register', { 
        fullName, 
        email, 
        password,
        role 
      });
      
      Alert.alert(
        'Thành công',
        'Tài khoản đã được khởi tạo. Vui lòng kiểm tra email để lấy mã xác thực.',
        [{ text: 'Tiếp tục', onPress: () => navigation.navigate('VerifyEmail', { email }) }]
      );
    } catch (error: any) {
      console.error('Register error:', error);
      const message = error.response?.data?.message || 'Đăng ký thất bại. Email có thể đã tồn tại.';
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
          <View className="flex-row items-center justify-between mt-4 mb-8">
             <TouchableOpacity onPress={() => navigation.goBack()} className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                <ChevronLeft size={20} color={COLORS.secondary} />
             </TouchableOpacity>
             <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text className="text-primary font-bold text-sm tracking-tight">Đăng nhập</Text>
             </TouchableOpacity>
          </View>

          <View className="mb-10">
            <View className="flex-row items-center mb-2">
               <Text className="text-3xl font-bold text-secondary tracking-tighter">Tham gia</Text>
               <Text className="text-3xl font-bold text-primary tracking-tighter ml-2">ZORA</Text>
            </View>
            <Text className="text-gray-400 text-base font-medium leading-6">
              Bắt đầu hành trình mua sắm hoặc{'\n'}kinh doanh chuyên nghiệp cùng chúng tôi.
            </Text>
          </View>

          <View className="space-y-6">
            <View>
              <Text className="text-secondary font-bold mb-3 ml-1 text-[10px] uppercase tracking-[2px]">Tên của bạn</Text>
              <View className="flex-row items-center bg-gray-50 border border-gray-100 rounded-[24px] px-6 py-4">
                <UserIcon size={18} color={COLORS.primary} strokeWidth={2.5} />
                <TextInput
                  className="flex-1 ml-4 text-secondary text-sm font-bold"
                  placeholder="Nguyễn Văn Zora"
                  placeholderTextColor="#9ca3af"
                  value={fullName}
                  onChangeText={setFullName}
                />
              </View>
            </View>

            <View className="mt-6">
              <Text className="text-secondary font-bold mb-3 ml-1 text-[10px] uppercase tracking-[2px]">Email liên hệ</Text>
              <View className="flex-row items-center bg-gray-50 border border-gray-100 rounded-[24px] px-6 py-4">
                <Mail size={18} color={COLORS.primary} strokeWidth={2.5} />
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
              <Text className="text-secondary font-bold mb-3 ml-1 text-[10px] uppercase tracking-[2px]">Mật khẩu bảo mật</Text>
              <View className="flex-row items-center bg-gray-50 border border-gray-100 rounded-[24px] px-6 py-4">
                <Lock size={18} color={COLORS.primary} strokeWidth={2.5} />
                <TextInput
                  className="flex-1 ml-4 text-secondary text-sm font-bold"
                  placeholder="••••••••"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
              </View>
            </View>

            <View className="mt-6">
              <Text className="text-secondary font-bold mb-3 ml-1 text-[10px] uppercase tracking-[2px]">Bạn là ai?</Text>
              <View className="flex-row gap-4">
                <TouchableOpacity 
                  onPress={() => setRole('USER')}
                  className={`flex-1 flex-row items-center justify-center py-5 rounded-[24px] border-2 ${role === 'USER' ? 'bg-secondary border-secondary shadow-lg shadow-gray-200' : 'bg-white border-gray-100'}`}
                >
                  <Text className={`font-bold text-xs uppercase tracking-widest ${role === 'USER' ? 'text-white' : 'text-gray-400'}`}>Người mua</Text>
                  {role === 'USER' && <CheckCircle2 size={14} color="#fff" className="ml-2" />}
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => setRole('SELLER')}
                  className={`flex-1 flex-row items-center justify-center py-5 rounded-[24px] border-2 ${role === 'SELLER' ? 'bg-primary border-primary shadow-lg shadow-orange-200' : 'bg-white border-gray-100'}`}
                >
                  <Text className={`font-bold text-xs uppercase tracking-widest ${role === 'SELLER' ? 'text-white' : 'text-gray-400'}`}>Người bán</Text>
                  {role === 'SELLER' && <CheckCircle2 size={14} color="#fff" className="ml-2" />}
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity 
              className={`w-full bg-primary py-5 rounded-[28px] items-center shadow-2xl shadow-orange-500/40 mt-10 ${loading ? 'opacity-70' : ''}`}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-bold text-base uppercase tracking-[3px]">
                  Bắt đầu ngay
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <View className="flex-row justify-center mt-12 mb-10">
            <Text className="text-gray-400 font-medium text-sm">Chấp nhận </Text>
            <TouchableOpacity><Text className="text-secondary font-bold text-sm underline">Điều khoản sử dụng</Text></TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
