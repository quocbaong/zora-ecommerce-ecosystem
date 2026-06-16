import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Share2, ScanLine } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import { useAuthStore } from '../../contexts/authContext';
import { COLORS } from '../../constants';

export default function MyQRCodeScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const appUrl = process.env.EXPO_PUBLIC_APP_URL || 'https://zora-ecommerce-ecosystem.vercel.app';
  const qrValue = `${appUrl}/qr/user/${user?.id}`;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="px-5 py-4 flex-row items-center border-b border-gray-50">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3 bg-gray-50 p-2.5 rounded-2xl border border-gray-100">
          <ChevronLeft size={20} color={COLORS.secondary} />
        </TouchableOpacity>
        <Text className="text-secondary font-bold text-base flex-1">Mã QR của tôi</Text>
      </View>

      <View className="flex-1 items-center justify-center px-6">
        <View className="bg-white rounded-[32px] p-8 items-center shadow-xl shadow-orange-500/10 border border-orange-50 w-full max-w-[320px]">
          <View className="w-20 h-20 rounded-full border-4 border-white shadow-md bg-orange-100 items-center justify-center -mt-16 mb-4">
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} className="w-full h-full rounded-full" />
            ) : (
              <Text className="text-2xl font-bold text-primary">{user?.fullName?.charAt(0) || 'U'}</Text>
            )}
          </View>
          <Text className="text-xl font-bold text-secondary mb-1">{user?.fullName}</Text>
          <Text className="text-sm text-gray-400 mb-8">Quét mã để kết bạn trên Zora</Text>
          
          <View className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 mb-6">
            <QRCode 
              value={qrValue}
              size={220}
              color="#000000"
              backgroundColor="white"
            />
          </View>
          
          <TouchableOpacity className="bg-orange-50 py-3.5 px-6 rounded-2xl flex-row items-center">
            <Share2 size={18} color={COLORS.primary} className="mr-2" />
            <Text className="text-primary font-bold">Chia sẻ mã QR</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <View className="flex-row justify-center pb-8 pt-4">
        <TouchableOpacity 
          onPress={() => navigation.replace('QRScannerScreen')}
          className="bg-orange-500 px-8 py-3 rounded-full flex-row items-center shadow-md shadow-orange-500/20"
        >
          <ScanLine color="#fff" size={20} className="mr-2" />
          <Text className="text-white font-bold">Quét mã</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
