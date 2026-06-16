import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { X, CornerUpLeft } from 'lucide-react-native';
import { COLORS } from '../../../constants';

interface Props {
  replyingTo: any | null;
  onClear: () => void;
}

export default function ReplyPreview({ replyingTo, onClear }: Props) {
  if (!replyingTo) return null;

  const content = replyingTo.type === 'TEXT' 
    ? replyingTo.content 
    : `[${replyingTo.type}] ${replyingTo.content ? replyingTo.content.substring(0, 20) : ''}`;

  return (
    <View className="bg-white border-t border-gray-100 px-4 py-2 flex-row items-center">
      <View className="w-1 h-full bg-primary rounded-full mr-3" />
      <View className="flex-1">
        <View className="flex-row items-center mb-0.5">
          <CornerUpLeft size={10} color={COLORS.primary} />
          <Text className="text-primary text-[10px] font-bold uppercase ml-1 tracking-tighter">
            Đang trả lời {replyingTo.sender?.fullName || replyingTo.senderId || ''}
          </Text>
        </View>
        <Text className="text-secondary text-xs font-medium" numberOfLines={1}>
          {content}
        </Text>
      </View>
      <TouchableOpacity onPress={onClear} className="p-2 ml-2">
        <X size={16} color={COLORS.secondary} />
      </TouchableOpacity>
    </View>
  );
}
