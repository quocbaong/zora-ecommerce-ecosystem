import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, RefreshCw, Share2 } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import apiClient from '../../api/client';
import { COLORS } from '../../constants';

export default function GroupQRCodeScreen({ route, navigation }: any) {
  const { groupId, groupName, isAdmin } = route.params;
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInviteToken();
  }, []);

  const fetchInviteToken = async () => {
    try {
      const res = await apiClient.get(`/chat/groups/${groupId}/invite-link`);
      if (res.data.success) setInviteToken(res.data.data.inviteToken);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  const resetInviteToken = async () => {
    Alert.alert(
      'Làm mới mã',
      'Mã QR cũ sẽ không còn hiệu lực. Bạn có chắc chắn muốn tạo mã mới?',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Đồng ý', onPress: async () => {
          setLoading(true);
          try {
            const res = await apiClient.post(`/chat/groups/${groupId}/reset-invite`);
            if (res.data.success) {
              setInviteToken(res.data.data.inviteToken);
              Alert.alert('Thành công', 'Đã tạo mã QR mới');
            }
          } catch (e) {
            Alert.alert('Lỗi', 'Không thể làm mới mã QR');
          } finally {
            setLoading(false);
          }
        }}
      ]
    );
  };

  const appUrl = process.env.EXPO_PUBLIC_APP_URL || 'https://ecommerce-frontend-three-rosy.vercel.app';
  const qrValue = inviteToken ? `${appUrl}/qr/group/${groupId}?token=${inviteToken}` : 'loading';

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="px-5 py-4 flex-row items-center border-b border-gray-50">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3 bg-gray-50 p-2.5 rounded-2xl border border-gray-100">
          <ChevronLeft size={20} color={COLORS.secondary} />
        </TouchableOpacity>
        <Text className="text-secondary font-bold text-base flex-1">Mã QR nhóm</Text>
      </View>

      <View className="flex-1 items-center justify-center px-6">
        {loading ? (
          <ActivityIndicator color={COLORS.primary} size="large" />
        ) : (
          <View className="bg-white rounded-[32px] p-8 items-center shadow-xl shadow-orange-500/10 border border-orange-50 w-full max-w-[320px]">
            <View className="w-16 h-16 rounded-2xl bg-orange-100 items-center justify-center -mt-16 mb-4 border-4 border-white shadow-sm">
              <Text className="text-2xl font-black text-primary">{groupName?.charAt(0) || 'G'}</Text>
            </View>
            <Text className="text-xl font-bold text-secondary mb-1 text-center">{groupName}</Text>
            <Text className="text-sm text-gray-400 mb-8">Quét mã để tham gia nhóm</Text>
            
            {inviteToken ? (
              <View className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm mb-6">
                <QRCode
                  value={qrValue}
                  size={200}
                  color="#000000"
                  backgroundColor="white"
                />
              </View>
            ) : (
              <View className="w-[200px] h-[200px] bg-gray-50 rounded-2xl mb-6 items-center justify-center">
                <Text className="text-gray-400">Không có mã QR</Text>
              </View>
            )}

            <View className="flex-row gap-3 w-full">
              <TouchableOpacity 
                onPress={() => {
                  if (inviteToken) {
                    import('expo-clipboard').then(({ setStringAsync }) => {
                      const appUrl = process.env.EXPO_PUBLIC_APP_URL || 'https://ecommerce-frontend-three-rosy.vercel.app';
                      setStringAsync(`${appUrl}/qr/group/${groupId}?token=${inviteToken}`);
                      Alert.alert("Thành công", "Đã sao chép liên kết nhóm");
                    });
                  }
                }}
                className="flex-1 bg-orange-50 py-3.5 rounded-2xl flex-row items-center justify-center"
              >
                <Share2 size={16} color={COLORS.primary} className="mr-2" />
                <Text className="text-primary font-bold text-xs">Chia sẻ</Text>
              </TouchableOpacity>
              
              {isAdmin && (
                <TouchableOpacity onPress={resetInviteToken} className="flex-1 bg-gray-50 py-3.5 rounded-2xl flex-row items-center justify-center">
                  <RefreshCw size={18} color={COLORS.textSecondary} className="mr-2" />
                  <Text className="text-gray-600 font-bold text-xs">Làm mới mã</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
