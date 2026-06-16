import React, { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, Modal, ActivityIndicator, Pressable } from 'react-native';
import { X, Phone, ShieldCheck, User, Store, MessageSquare } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import apiClient from '../../../api/client';
import { COLORS } from '../../../constants';

interface Props {
  visible: boolean;
  userId: string;
  onClose: () => void;
  onStartDM?: (userId: string) => void;
}

export default function UserProfileModal({ visible, userId, onClose, onStartDM }: Props) {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible && userId) {
      fetchProfile();
    }
  }, [visible, userId]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      // Logic from FE: userService.getProfileById(userId)
      const response = await apiClient.get(`/users/${userId}`);
      setProfile(response.data);
    } catch (error) {
      console.error('Fetch profile error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  const name = profile?.fullName || 'Người dùng';
  const initial = name.charAt(0).toUpperCase();
  const isSeller = profile?.role === 'SELLER';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable 
        className="flex-1 bg-black/40 justify-end" 
        onPress={onClose}
      >
        <Pressable 
          className="bg-white rounded-t-[32px] p-6 shadow-xl"
          onPress={(e) => e.stopPropagation()}
          style={{ paddingBottom: Math.max(insets.bottom, 24) }}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-secondary font-bold text-lg">Thông tin cá nhân</Text>
            <TouchableOpacity onPress={onClose} className="p-2 bg-gray-50 rounded-full">
              <X size={20} color={COLORS.secondary} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View className="py-20 items-center justify-center">
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : (
            <View>
              {/* Avatar + name */}
              <View className="items-center mb-8">
                <View className="w-24 h-24 rounded-full bg-orange-50 items-center justify-center overflow-hidden border-4 border-orange-100 shadow-sm">
                  {profile?.avatarUrl ? (
                    <Image source={{ uri: profile.avatarUrl }} className="w-full h-full" />
                  ) : (
                    <Text className="text-3xl font-bold text-primary">{initial}</Text>
                  )}
                </View>
                <Text className="text-xl font-bold text-secondary mt-3">{name}</Text>
                
                {/* Role badge */}
                <View className={`mt-2 flex-row items-center px-3 py-1 rounded-full ${
                  isSeller ? 'bg-blue-50' : 'bg-gray-100'
                }`}>
                  {isSeller ? <Store size={12} color="#2563eb" /> : <User size={12} color="#6b7280" />}
                  <Text className={`text-[10px] font-bold ml-1 uppercase tracking-tight ${
                    isSeller ? 'text-blue-600' : 'text-gray-500'
                  }`}>
                    {isSeller ? 'Người bán' : 'Người dùng'}
                  </Text>
                </View>
              </View>

              {/* Info rows */}
              <View className="space-y-4 mb-8">
                {profile?.phone && (
                  <View className="flex-row items-center bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <View className="w-10 h-10 rounded-full bg-green-50 items-center justify-center mr-3">
                      <Phone size={18} color="#22c55e" />
                    </View>
                    <View>
                      <Text className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Số điện thoại</Text>
                      <Text className="text-sm font-bold text-secondary">{profile.phone}</Text>
                    </View>
                  </View>
                )}
                
                {profile?.email && (
                  <View className="flex-row items-center bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <View className="w-10 h-10 rounded-full bg-orange-50 items-center justify-center mr-3">
                      <ShieldCheck size={18} color={COLORS.primary} />
                    </View>
                    <View>
                      <Text className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Email</Text>
                      <Text className="text-sm font-bold text-secondary">{profile.email}</Text>
                    </View>
                  </View>
                )}

                {!profile?.phone && !profile?.email && (
                  <Text className="text-center text-gray-400 py-4 text-xs">Chưa có thông tin bổ sung</Text>
                )}
              </View>

              {/* Action */}
              {onStartDM && (
                <TouchableOpacity
                  onPress={() => {
                    onStartDM(userId);
                    onClose();
                  }}
                  className="bg-primary flex-row items-center justify-center py-4 rounded-2xl shadow-lg shadow-orange-500/20"
                >
                  <MessageSquare size={20} color="#fff" />
                  <Text className="text-white font-bold ml-2">Nhắn tin ngay</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
