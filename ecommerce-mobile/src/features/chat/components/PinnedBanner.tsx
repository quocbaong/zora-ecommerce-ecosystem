import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Pin, X, ChevronRight, List } from 'lucide-react-native';
import { COLORS } from '../../../constants';
import type { GroupMessage } from '../../../types/chat';

interface PinnedBannerProps {
  pinnedMessages: GroupMessage[];
  onPress: (message: GroupMessage) => void;
  onUnpin?: (messageId: string) => void;
  onShowList?: () => void;
  isAdmin?: boolean;
}

export default function PinnedBanner({ pinnedMessages, onPress, onUnpin, onShowList, isAdmin }: PinnedBannerProps) {
  if (!pinnedMessages || pinnedMessages.length === 0) return null;

  // Limit display to at most 2 pinned messages in the banner
  const visiblePins = pinnedMessages.slice(0, 2);
  const remainingCount = pinnedMessages.length - visiblePins.length;

  const getContentSnippet = (msg: GroupMessage) => {
    if (msg.type === 'IMAGE') return 'Đã ghim một ảnh';
    if (msg.type === 'VIDEO') return 'Đã ghim một video';
    if (msg.type === 'FILE') return 'Đã ghim một tệp';
    if (msg.type === 'AUDIO') return 'Đã ghim một tin nhắn thoại';
    const text = msg.content || '';
    return text.length > 30 ? text.slice(0, 30) + '...' : text;
  };

  return (
    <View className="bg-white/95 border-b border-gray-100 px-4 py-2 flex-row items-center shadow-sm">
      {/* Pin Icon Column */}
      <View className="w-8 h-8 items-center justify-center bg-orange-50 rounded-full mr-3 border border-orange-100">
        <Pin size={14} color={COLORS.primary} fill={COLORS.primary} />
      </View>
      
      {/* Messages List Column */}
      <View className="flex-1 mr-2 py-1">
        <Text className="text-[9px] font-extrabold text-primary uppercase tracking-wider mb-0.5">Tin nhắn đã ghim</Text>
        <View className="flex-col">
          {visiblePins.map((msg, index) => (
            <TouchableOpacity 
              key={msg.messageId}
              className={`py-0.5 flex-row items-center ${index > 0 ? 'border-t border-gray-50 mt-1 pt-1' : ''}`}
              onPress={() => onPress(msg)}
              activeOpacity={0.7}
            >
              {visiblePins.length > 1 && (
                <Text className="text-[10px] text-orange-500 font-extrabold mr-1">#{index + 1}</Text>
              )}
              <Text className="text-secondary text-xs font-semibold flex-1" numberOfLines={1}>
                {getContentSnippet(msg)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Actions / Count Badge Column */}
      <View className="flex-row items-center">
        {remainingCount > 0 && onShowList && (
          <TouchableOpacity 
            onPress={onShowList}
            className="bg-orange-50 px-1.5 py-0.5 rounded mr-1.5 border border-orange-100"
          >
            <Text className="text-[10px] font-extrabold text-orange-500">+{remainingCount}</Text>
          </TouchableOpacity>
        )}

        {onShowList && (
          <TouchableOpacity onPress={onShowList} className="p-1.5 bg-gray-50 active:bg-gray-100 rounded-full">
            <List size={14} color={COLORS.secondary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
