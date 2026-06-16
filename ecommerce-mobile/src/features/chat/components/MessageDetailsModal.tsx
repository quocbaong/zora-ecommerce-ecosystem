import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, CheckCircle2, Clock } from 'lucide-react-native';
import { COLORS } from '../../../constants';
import dayjs from 'dayjs';

interface MessageDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  message: any;
  members: any[];
  readState: string[]; // userIds who have read the conversation up to latest
}

export default function MessageDetailsModal({ visible, onClose, message, members, readState }: MessageDetailsModalProps) {
  if (!message) return null;

  // In a real system, we'd have per-message read receipts.
  // Here we approximate: if they've read the conversation, they've read this message.
  const readers = members.filter(m => readState.includes(m.userId) && m.userId !== message.senderId);
  const unread = members.filter(m => !readState.includes(m.userId) && m.userId !== message.senderId);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 bg-black/50 justify-end">
        <SafeAreaView className="bg-white rounded-t-[32px] h-[70%]" edges={['bottom']}>
          <View className="px-5 py-4 flex-row items-center justify-between border-b border-gray-50">
            <Text className="text-lg font-black text-secondary">Thông tin tin nhắn</Text>
            <TouchableOpacity onPress={onClose} className="p-1">
              <X size={24} color={COLORS.secondary} />
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 px-5 py-4">
            <View className="mb-6 p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <Text className="text-xs font-bold text-gray-400 uppercase mb-2 tracking-widest">Nội dung</Text>
              <Text className="text-secondary font-medium leading-5">
                {message.type === 'TEXT' ? message.content : `[${message.type}]`}
              </Text>
              <Text className="text-[10px] text-gray-400 mt-2">
                Gửi lúc {dayjs(message.createdAt).format('HH:mm, DD/MM/YYYY')}
              </Text>
            </View>

            <View className="mb-6">
              <View className="flex-row items-center mb-4">
                <CheckCircle2 size={18} color="#22c55e" />
                <Text className="ml-2 text-sm font-black text-secondary">Đã xem ({readers.length})</Text>
              </View>
              
              {readers.length === 0 ? (
                <Text className="text-xs text-gray-400 italic ml-7">Chưa có ai xem</Text>
              ) : (
                readers.map(m => (
                  <View key={m.userId} className="flex-row items-center mb-3 ml-7">
                    <View className="w-8 h-8 rounded-full bg-orange-100 items-center justify-center mr-3">
                      {m.user?.avatarUrl ? (
                         <Image source={{ uri: m.user.avatarUrl }} className="w-full h-full rounded-full" />
                      ) : (
                        <Text className="text-primary font-bold text-[10px]">{m.user?.fullName?.charAt(0)}</Text>
                      )}
                    </View>
                    <View>
                      <Text className="text-sm font-bold text-secondary">{m.user?.fullName}</Text>
                      <Text className="text-[10px] text-gray-400">Đã xem</Text>
                    </View>
                  </View>
                ))
              )}
            </View>

            <View>
              <View className="flex-row items-center mb-4">
                <Clock size={18} color="#9ca3af" />
                <Text className="ml-2 text-sm font-black text-secondary">Chưa xem ({unread.length})</Text>
              </View>
              
              {unread.map(m => (
                <View key={m.userId} className="flex-row items-center mb-3 ml-7">
                  <View className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center mr-3">
                     {m.user?.avatarUrl ? (
                         <Image source={{ uri: m.user.avatarUrl }} className="w-full h-full rounded-full opacity-60" />
                      ) : (
                        <Text className="text-gray-400 font-bold text-[10px]">{m.user?.fullName?.charAt(0)}</Text>
                      )}
                  </View>
                  <Text className="text-sm font-medium text-gray-400">{m.user?.fullName}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
