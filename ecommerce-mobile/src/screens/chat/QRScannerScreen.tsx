import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, ActivityIndicator, Modal, Image } from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, QrCode } from 'lucide-react-native';
import { COLORS } from '../../constants';
import apiClient from '../../api/client';

export default function QRScannerScreen({ route, navigation }: any) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };

    getCameraPermissions();
  }, []);

  useEffect(() => {
    if (route?.params?.type && route?.params?.id) {
      const { type, id, token } = route.params;
      if (type === 'group' && token) {
        handleGroupQR(`?token=${token}`, id);
      } else if (type === 'user') {
        handleUserQR(id);
      }
    }
  }, [route?.params]);

  const handleBarCodeScanned = async ({ type, data }: { type: string, data: string }) => {
    if (scanned || processing) return;
    setScanned(true);

    const appUrl = process.env.EXPO_PUBLIC_APP_URL || 'https://ecommerce-frontend-three-rosy.vercel.app';
    
    if (data.startsWith(`${appUrl}/qr/user/`)) {
      const userId = data.replace(`${appUrl}/qr/user/`, '');
      handleUserQR(userId);
    } else if (data.startsWith(`${appUrl}/qr/group/`)) {
      const inviteData = data.replace(`${appUrl}/qr/group/`, '');
      handleGroupQR(inviteData);
    } else {
      Alert.alert('Lỗi', 'Mã QR không hợp lệ', [{ text: 'Quét lại', onPress: () => setScanned(false) }]);
    }
  };

  const handleUserQR = async (userId: string) => {
    setProcessing(true);
    try {
      // Fetch friends list to check if already friends
      const friendsRes = await apiClient.get('/chat/friends');
      const friendsList = friendsRes.data?.data || [];
      const isFriend = friendsList.some((f: any) => String(f.userId) === String(userId) || String(f.sellerId) === String(userId));
      
      if (isFriend) {
        Alert.alert('Thông báo', 'Bạn và người này đã là bạn bè.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
        setScanned(false);
        setProcessing(false);
        return;
      }

      Alert.alert(
        'Kết bạn',
        'Gửi lời mời kết bạn đến người dùng này?',
        [
          { text: 'Hủy', style: 'cancel', onPress: () => navigation.goBack() },
          { text: 'Đồng ý', onPress: async () => {
            try {
              const res = await apiClient.post('/chat/friends/request', { toUserId: userId });
              if (res.data?.data?.alreadySent) {
                Alert.alert('Thông báo', 'Đã gửi lời mời từ trước hoặc đang chờ xác nhận.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
              } else {
                Alert.alert('Thành công', 'Đã gửi lời mời kết bạn', [
                  { text: 'OK', onPress: () => {
                    if (navigation.canGoBack()) navigation.goBack();
                    navigation.navigate('ChatTab', { screen: 'FriendsScreen' });
                  }}
                ]);
              }
            } catch (err) {
              Alert.alert('Lỗi', 'Không thể gửi lời mời kết bạn.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
            }
          }}
        ]
      );
    } catch (e) {
      setScanned(false);
      setProcessing(false);
    }
  };

  const [previewData, setPreviewData] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [previewType, setPreviewType] = useState<'user' | 'group' | null>(null);

  const handleGroupQR = async (inviteData: string, deepLinkGroupId?: string) => {
    setProcessing(true);
    try {
      let groupId = deepLinkGroupId || '';
      let token = '';
      
      if (inviteData.includes('?token=')) {
         if (!deepLinkGroupId) {
           [groupId, token] = inviteData.split('?token=');
         } else {
           token = inviteData.split('?token=')[1] || inviteData.replace('?token=', '');
         }
      } else {
         throw new Error('Định dạng mã nhóm không hợp lệ');
      }

      const res = await apiClient.get(`/chat/groups/${groupId}/preview?token=${token}`);
      if (res.data.success) {
        setPreviewData({ ...res.data.data, inviteToken: token });
        setPreviewType('group');
        setModalVisible(true);
      }
    } catch (e: any) {
      Alert.alert('Lỗi', e.response?.data?.error || 'Không thể xem trước thông tin nhóm', [{ text: 'Quét lại', onPress: () => setScanned(false) }]);
    } finally {
      setProcessing(false);
    }
  };

  const executeJoinGroup = async () => {
    setProcessing(true);
    try {
      const res = await apiClient.post('/chat/groups/join-via-link', { 
        groupId: previewData.groupId, 
        inviteToken: previewData.inviteToken 
      });
      if (res.data.success) {
        setModalVisible(false);
        Alert.alert('Thành công', 'Đã tham gia nhóm!', [
          {
            text: 'OK',
            onPress: () => {
              if (navigation.canGoBack()) navigation.goBack();
              navigation.navigate('ChatTab', {
                state: {
                  routes: [
                    { name: 'ConversationList' },
                    { name: 'GroupChatScreen', params: { groupId: previewData.groupId, groupName: previewData.name } }
                  ]
                }
              });
            }
          }
        ]);
      }
    } catch (err: any) {
      Alert.alert('Lỗi', err.response?.data?.error || 'Không thể tham gia nhóm');
      setScanned(false);
    } finally {
      setProcessing(false);
    }
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setPreviewData(null);
    setPreviewType(null);
    setScanned(false);
    navigation.goBack();
  };

  if (hasPermission === null) {
    return <View className="flex-1 bg-black justify-center items-center"><ActivityIndicator color="#fff" /></View>;
  }
  if (hasPermission === false) {
    return <View className="flex-1 bg-white justify-center items-center px-4">
      <Text className="text-center font-bold text-gray-500 mb-4">Chưa cấp quyền truy cập máy ảnh</Text>
      <TouchableOpacity onPress={() => navigation.goBack()} className="bg-primary px-6 py-3 rounded-full">
        <Text className="text-white font-bold">Quay lại</Text>
      </TouchableOpacity>
    </View>;
  }

  return (
    <View className="flex-1 bg-black">
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
      />
      
      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        <View className="px-5 py-4 flex-row items-center justify-between z-10">
          <TouchableOpacity onPress={() => navigation.goBack()} className="bg-black/40 p-2.5 rounded-full">
            <X size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <View className="flex-1 items-center justify-center">
          <View className="w-64 h-64 border-2 border-white/50 rounded-3xl overflow-hidden relative">
            <View className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-3xl" />
            <View className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-3xl" />
            <View className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-3xl" />
            <View className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-3xl" />
            {processing && (
              <View className="flex-1 bg-black/60 items-center justify-center">
                <ActivityIndicator color={COLORS.primary} size="large" />
                <Text className="text-white mt-2 font-bold text-sm">Đang xử lý...</Text>
              </View>
            )}
          </View>
          <Text className="text-white font-medium text-sm mt-8 px-8 text-center opacity-80">
            Di chuyển mã QR vào khung ngắm để kết bạn hoặc tham gia nhóm
          </Text>
        </View>

        <View className="flex-row justify-center pb-8">
          <TouchableOpacity 
            onPress={() => navigation.replace('MyQRCodeScreen')}
            className="bg-black/50 px-8 py-3 rounded-full flex-row items-center border border-white/20"
          >
            <QrCode color="#fff" size={20} className="mr-2" />
            <Text className="text-white font-bold">Mã QR của tôi</Text>
          </TouchableOpacity>
        </View>

      </SafeAreaView>

      {/* Preview Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCloseModal}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6 items-center">
            {previewType === 'group' && previewData && (
              <>
                {previewData.avatarUrl ? (
                  <View className="w-24 h-24 rounded-2xl overflow-hidden mb-4 border-4 border-orange-50">
                    <Image source={{ uri: previewData.avatarUrl }} className="w-full h-full" />
                  </View>
                ) : (
                  <View className="w-24 h-24 rounded-2xl bg-orange-100 items-center justify-center mb-4 border-4 border-white shadow-sm">
                    <Text className="text-4xl font-black text-orange-500">{previewData.name?.charAt(0)}</Text>
                  </View>
                )}
                
                <Text className="text-2xl font-bold text-gray-800 mb-1">{previewData.name}</Text>
                <Text className="text-gray-500 mb-6">{previewData.memberCount || 1} thành viên</Text>
                
                {previewData.isMember ? (
                  <>
                    <Text className="text-green-600 font-medium mb-6">Bạn đã là thành viên của nhóm này</Text>
                    <View className="flex-row gap-3 w-full">
                      <TouchableOpacity 
                        onPress={handleCloseModal}
                        className="flex-1 bg-gray-100 py-3.5 rounded-2xl items-center"
                      >
                        <Text className="text-gray-600 font-bold">Đóng</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        onPress={() => {
                          setModalVisible(false);
                          if (navigation.canGoBack()) navigation.goBack();
                          navigation.navigate('ChatTab', {
                            state: {
                              routes: [
                                { name: 'ConversationList' },
                                { name: 'GroupChatScreen', params: { groupId: previewData.groupId, groupName: previewData.name } }
                              ]
                            }
                          });
                        }}
                        className="flex-1 bg-orange-500 py-3.5 rounded-2xl items-center"
                      >
                        <Text className="text-white font-bold">Vào nhóm</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <>
                    <Text className="text-gray-600 mb-6 text-center px-4">Bạn được mời tham gia nhóm chat này trên ZORA.</Text>
                    <View className="flex-row gap-3 w-full">
                      <TouchableOpacity 
                        onPress={handleCloseModal}
                        className="flex-1 bg-gray-100 py-3.5 rounded-2xl items-center"
                      >
                        <Text className="text-gray-600 font-bold">Từ chối</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        onPress={executeJoinGroup}
                        className="flex-1 bg-orange-500 py-3.5 rounded-2xl items-center"
                      >
                        <Text className="text-white font-bold">Tham gia</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>

    </View>
  );
}
