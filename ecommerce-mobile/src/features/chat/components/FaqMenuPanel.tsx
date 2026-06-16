import React from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, ActivityIndicator,
} from 'react-native';
import { HelpCircle, MessageSquare } from 'lucide-react-native';
import { COLORS } from '../../../constants';

interface ShopFaq {
  id: string;
  question: string;
  answer: string;
  order: number;
}

interface Props {
  faqs: ShopFaq[];
  onSelect: (faq: ShopFaq) => void;
  shopName?: string;
  isLoading?: boolean;
  /** compact: renders as a horizontal scroll of pill buttons above the input bar */
  compact?: boolean;
}

export default function FaqMenuPanel({ faqs, onSelect, shopName, isLoading, compact = false }: Props) {
  if (isLoading) {
    return (
      <View className="items-center justify-center py-4">
        <ActivityIndicator color={COLORS.primary} size="small" />
      </View>
    );
  }

  if (!faqs.length) return null;

  if (compact) {
    // Horizontal pill row above the input bar
    return (
      <View className="border-t border-gray-100 bg-white pt-2 pb-1">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12 }}
          keyboardShouldPersistTaps="always"
        >
          {faqs.map((faq, index) => (
            <TouchableOpacity
              key={faq.id}
              onPress={() => onSelect(faq)}
              activeOpacity={0.7}
              className="px-3.5 py-2 bg-white border border-orange-200 rounded-full"
              style={{
                shadowColor: '#f97316',
                shadowOpacity: 0.08,
                shadowRadius: 4,
                elevation: 1,
                marginRight: index < faqs.length - 1 ? 8 : 0,
              }}
            >
              <Text className="text-xs font-semibold text-orange-700" numberOfLines={1}>
                {faq.question}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }

  // Full panel — shown in empty messages area
  return (
    <View className="flex-1 items-center justify-center px-6 py-8">
      {/* Greeting header */}
      <View className="w-16 h-16 rounded-2xl bg-orange-50 items-center justify-center mb-4 shadow-sm">
        <MessageSquare size={32} color={COLORS.primary} />
      </View>
      <Text className="text-sm font-black text-secondary text-center mb-1">Xin chào! Bạn cần hỗ trợ gì?</Text>
      {shopName && (
        <Text className="text-xs text-gray-400 text-center mb-5">{shopName} luôn sẵn sàng giúp bạn</Text>
      )}

      {/* FAQ buttons */}
      <View className="w-full gap-2">
        {faqs.map(faq => (
          <TouchableOpacity
            key={faq.id}
            onPress={() => onSelect(faq)}
            activeOpacity={0.8}
            className="flex-row items-center gap-3 px-4 py-3.5 bg-white border-2 border-orange-100 rounded-2xl shadow-sm"
          >
            <HelpCircle size={16} color="#fdba74" />
            <Text className="flex-1 text-sm font-medium text-secondary" numberOfLines={2}>
              {faq.question}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text className="text-[11px] text-gray-300 text-center mt-5">
        Chọn câu hỏi hoặc nhập trực tiếp bên dưới
      </Text>
    </View>
  );
}
