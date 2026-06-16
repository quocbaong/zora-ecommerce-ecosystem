import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, TouchableWithoutFeedback, Animated, Dimensions, StyleSheet } from 'react-native';
import { COLORS } from '../../../constants';
import { Reply, Forward, Trash2, Copy, RotateCcw, X, Pin, Info, Pencil, Flag } from 'lucide-react-native';

interface MessageActionModalProps {
  visible: boolean;
  onClose: () => void;
  message: any;
  isMe: boolean;
  onAction: (action: string) => void;
  onReact: (emoji: string) => void;
  isAdmin?: boolean;
  isPinned?: boolean;
}

const REACTIONS = ['❤️', '😆', '😮', '😢', '😠', '👍'];

export default function MessageActionModal({ 
  visible, onClose, message, isMe, onAction, onReact, isAdmin, isPinned 
}: MessageActionModalProps) {
  const sheetAnim = useRef(new Animated.Value(Dimensions.get('window').height)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(sheetAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11
      }).start();
    } else {
      Animated.timing(sheetAnim, {
        toValue: Dimensions.get('window').height,
        duration: 250,
        useNativeDriver: true
      }).start();
    }
  }, [visible]);

  const handleClose = () => {
    Animated.timing(sheetAnim, {
      toValue: Dimensions.get('window').height,
      duration: 200,
      useNativeDriver: true
    }).start(onClose);
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View className="flex-1 bg-black/40 justify-end pb-10">
          <Animated.View 
            style={{ transform: [{ translateY: sheetAnim }] }}
            className="px-5"
          >
            {/* Reactions Bar */}
            <View className="bg-white rounded-[32px] flex-row justify-around py-3 mb-3 shadow-xl border border-gray-100">
              {REACTIONS.map(emoji => (
                <TouchableOpacity key={emoji} onPress={() => { onReact(emoji); handleClose(); }}>
                  <Text className="text-2xl">{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Actions List */}
            <View className="bg-white rounded-3xl overflow-hidden shadow-xl border border-gray-100">
              <TouchableOpacity 
                onPress={() => { onAction('reply'); handleClose(); }}
                className="flex-row items-center justify-between p-4 border-b border-gray-50 active:bg-gray-50"
              >
                <Text className="text-secondary font-bold">Trả lời</Text>
                <Reply size={20} color={COLORS.secondary} />
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => { onAction('forward'); handleClose(); }}
                className="flex-row items-center justify-between p-4 border-b border-gray-50 active:bg-gray-50"
              >
                <Text className="text-secondary font-bold">Chuyển tiếp</Text>
                <Forward size={20} color={COLORS.secondary} />
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => { onAction('copy'); handleClose(); }}
                className="flex-row items-center justify-between p-4 border-b border-gray-50 active:bg-gray-50"
              >
                <Text className="text-secondary font-bold">Sao chép</Text>
                <Copy size={20} color={COLORS.secondary} />
              </TouchableOpacity>



              <TouchableOpacity 
                onPress={() => { onAction(isPinned ? 'unpin' : 'pin'); handleClose(); }}
                className="flex-row items-center justify-between p-4 border-b border-gray-50 active:bg-gray-50"
              >
                <Text className="text-secondary font-bold">{isPinned ? 'Bỏ ghim' : 'Ghim tin nhắn'}</Text>
                <Pin size={20} color={COLORS.secondary} />
              </TouchableOpacity>

              {isMe && (
                <TouchableOpacity 
                  onPress={() => { onAction('recall'); handleClose(); }}
                  className="flex-row items-center justify-between p-4 border-b border-gray-50 active:bg-gray-50"
                >
                  <Text className="text-orange-500 font-bold italic">Thu hồi</Text>
                  <RotateCcw size={20} color="#f97316" />
                </TouchableOpacity>
              )}

              {isMe && message?.type === 'TEXT' && (
                <TouchableOpacity 
                  onPress={() => { onAction('edit'); handleClose(); }}
                  className="flex-row items-center justify-between p-4 border-b border-gray-50 active:bg-gray-50"
                >
                  <Text className="text-secondary font-bold">Chỉnh sửa</Text>
                  <Pencil size={20} color={COLORS.secondary} />
                </TouchableOpacity>
              )}

              {!isMe && (
                <TouchableOpacity 
                  onPress={() => { onAction('report'); handleClose(); }}
                  className="flex-row items-center justify-between p-4 border-b border-gray-50 active:bg-gray-50"
                >
                  <Text className="text-red-500 font-bold">Báo cáo</Text>
                  <Flag size={20} color="#ef4444" />
                </TouchableOpacity>
              )}

              <TouchableOpacity 
                onPress={() => { onAction('delete'); handleClose(); }}
                className="flex-row items-center justify-between p-4 active:bg-gray-50"
              >
                <Text className="text-red-500 font-bold">Xóa tin nhắn</Text>
                <Trash2 size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              onPress={handleClose}
              className="mt-3 bg-gray-100 rounded-2xl py-4 items-center"
            >
              <Text className="text-secondary font-bold">Hủy</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
