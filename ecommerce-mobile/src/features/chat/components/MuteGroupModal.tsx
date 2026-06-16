import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Bell, BellOff, X, Clock, ShieldAlert } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../../constants';
import apiClient from '../../../api/client';
import dayjs from 'dayjs';

interface MuteGroupModalProps {
  visible: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
  isMuted: boolean;
  mutedUntil?: string;
  onMuteStatusChanged: () => void;
}

export default function MuteGroupModal({
  visible,
  onClose,
  groupId,
  groupName,
  isMuted,
  mutedUntil,
  onMuteStatusChanged,
}: MuteGroupModalProps) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);

  const muteOptions = [
    { label: 'Trong 1 giờ', durationMs: 1 * 60 * 60 * 1000 },
    { label: 'Trong 8 giờ', durationMs: 8 * 60 * 60 * 1000 },
    { label: 'Trong 24 giờ', durationMs: 24 * 60 * 60 * 1000 },
    { label: 'Cho đến khi tôi bật lại', durationMs: -1 },
  ];

  const handleMute = async (durationMs: number) => {
    setLoading(true);
    try {
      await apiClient.post(`/chat/groups/${groupId}/mute`, { durationMs });
      onMuteStatusChanged();
      onClose();
      Alert.alert('Thành công', 'Đã tắt thông báo cho nhóm này');
    } catch (error) {
      console.error('[MUTE] error:', error);
      Alert.alert('Lỗi', 'Không thể tắt thông báo nhóm');
    } finally {
      setLoading(false);
    }
  };

  const handleUnmute = async () => {
    setLoading(true);
    try {
      await apiClient.delete(`/chat/groups/${groupId}/mute`);
      onMuteStatusChanged();
      onClose();
      Alert.alert('Thành công', 'Đã bật lại thông báo cho nhóm này');
    } catch (error) {
      console.error('[UNMUTE] error:', error);
      Alert.alert('Lỗi', 'Không thể bật lại thông báo nhóm');
    } finally {
      setLoading(false);
    }
  };

  const getMuteStatusText = () => {
    if (!isMuted) return '';
    if (mutedUntil === 'FOREVER') return 'Đang tắt thông báo vĩnh viễn';
    const timeStr = dayjs(mutedUntil).format('HH:mm DD/MM/YYYY');
    return `Đang tắt thông báo đến ${timeStr}`;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        className="flex-1 bg-black/60 justify-end"
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          className="bg-white rounded-t-[40px] overflow-hidden"
          style={{ paddingBottom: Math.max(insets.bottom, 24) }}
        >
          {/* Header Indicator Bar */}
          <View className="items-center pt-3 pb-1">
            <View className="w-12 h-1.5 bg-gray-200 rounded-full" />
          </View>

          {/* Title Area */}
          <View className="px-6 py-4 flex-row items-center justify-between border-b border-gray-50">
            <View className="flex-row items-center flex-1 mr-3">
              <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${isMuted ? 'bg-red-50 border border-red-100' : 'bg-orange-50 border border-orange-100'}`}>
                {isMuted ? (
                  <BellOff size={18} color="#ef4444" />
                ) : (
                  <Bell size={18} color={COLORS.primary} />
                )}
              </View>
              <View className="flex-1">
                <Text className="text-base font-black text-secondary" numberOfLines={1}>
                  Tắt thông báo nhóm
                </Text>
                <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-0.5" numberOfLines={1}>
                  {groupName}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} className="bg-gray-100 p-1.5 rounded-full">
              <X size={16} color={COLORS.secondary} />
            </TouchableOpacity>
          </View>

          {/* Current Status Banner */}
          {isMuted && (
            <View className="mx-6 mt-5 bg-red-50/60 border border-red-100/80 rounded-2xl p-4 flex-row items-center">
              <ShieldAlert size={18} color="#ef4444" className="mr-3 flex-shrink-0" />
              <Text className="text-xs font-bold text-red-500 flex-1 leading-relaxed">
                {getMuteStatusText()}
              </Text>
            </View>
          )}

          {/* Body Content */}
          <View className="px-6 mt-5">
            {loading ? (
              <View className="py-12 items-center justify-center">
                <ActivityIndicator color={COLORS.primary} size="large" />
                <Text className="text-gray-400 text-xs font-semibold mt-3">Đang cập nhật thiết lập...</Text>
              </View>
            ) : (
              <View className="flex-col">
                {isMuted && (
                  <TouchableOpacity
                    onPress={handleUnmute}
                    className="mb-4 bg-orange-500 py-3.5 px-6 rounded-[24px] flex-row items-center justify-center shadow-sm active:bg-orange-600"
                  >
                    <Bell size={16} color="white" className="mr-2" />
                    <Text className="text-sm font-extrabold text-white uppercase tracking-wider">
                      Bật lại thông báo
                    </Text>
                  </TouchableOpacity>
                )}

                <Text className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 pl-1">
                  {isMuted ? 'Thay đổi thời gian tắt' : 'Chọn thời gian tắt thông báo'}
                </Text>

                {muteOptions.map((opt) => (
                  <TouchableOpacity
                    key={opt.durationMs}
                    onPress={() => handleMute(opt.durationMs)}
                    className="flex-row items-center justify-between p-4 mb-2.5 bg-gray-50/50 hover:bg-gray-50 border border-gray-100 rounded-2xl active:bg-orange-50/20 active:border-orange-100"
                  >
                    <View className="flex-row items-center">
                      <Clock size={16} color={COLORS.secondary} className="mr-3" />
                      <Text className="text-sm font-bold text-secondary">{opt.label}</Text>
                    </View>
                    <BellOff size={14} color="#9ca3af" />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
