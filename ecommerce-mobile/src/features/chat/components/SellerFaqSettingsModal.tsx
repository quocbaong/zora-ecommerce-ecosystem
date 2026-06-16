import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  Modal, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  X, Plus, Trash2, ChevronDown, ChevronUp,
  MessageSquarePlus, Save,
} from 'lucide-react-native';
import apiClient from '../../../api/client';
import { COLORS } from '../../../constants';

interface ShopFaq {
  id?: string;
  sellerId?: string;
  question: string;
  answer: string;
  order: number;
}

interface EditableFaq {
  id?: string;
  question: string;
  answer: string;
  order: number;
  expanded: boolean;
}

interface Props {
  visible: boolean;
  sellerId: string;
  onClose: () => void;
}

const MAX_FAQS = 7;

export default function SellerFaqSettingsModal({ visible, sellerId, onClose }: Props) {
  const [items, setItems] = useState<EditableFaq[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [triedSave, setTriedSave] = useState(false);

  const missingAnswers = items
    .map((item, idx) => ({ idx, item }))
    .filter(({ item }) => item.question.trim() && !item.answer.trim());

  const canSave = dirty && missingAnswers.length === 0;

  const loadFaqs = useCallback(async () => {
    if (!sellerId) return;
    setLoading(true);
    try {
      const res = await apiClient.get(`/chat/faqs/${sellerId}`);
      const raw = res.data;
      let faqs: ShopFaq[] = [];
      if (Array.isArray(raw)) faqs = raw;
      else if (Array.isArray(raw?.data)) faqs = raw.data;
      else if (Array.isArray(raw?.faqs)) faqs = raw.faqs;

      setItems(faqs.map(faq => ({
        id: faq.id,
        question: faq.question,
        answer: faq.answer,
        order: faq.order,
        expanded: false,
      })));
      setDirty(false);
    } catch (e) {
      console.warn('Failed to load FAQs', e);
    } finally {
      setLoading(false);
    }
  }, [sellerId]);

  useEffect(() => {
    if (visible) loadFaqs();
  }, [visible, loadFaqs]);

  const mark = () => setDirty(true);

  const handleAdd = () => {
    if (items.length >= MAX_FAQS) return;
    setItems(prev => [...prev, { question: '', answer: '', order: prev.length, expanded: true }]);
    mark();
  };

  const handleDelete = (idx: number) => {
    Alert.alert('Xoá câu hỏi', 'Bạn có chắc muốn xoá câu hỏi này?', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá', style: 'destructive',
        onPress: () => {
          setItems(prev => prev.filter((_, i) => i !== idx).map((item, i) => ({ ...item, order: i })));
          mark();
        },
      },
    ]);
  };

  const handleField = (idx: number, field: 'question' | 'answer', val: string) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: val } : item));
    mark();
  };

  const toggleExpand = (idx: number) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, expanded: !item.expanded } : item));
  };

  const handleSave = async () => {
    setTriedSave(true);
    if (missingAnswers.length > 0) {
      // Auto-expand items missing answers
      setItems(prev => prev.map((item, i) =>
        missingAnswers.some(m => m.idx === i) ? { ...item, expanded: true } : item
      ));
      return;
    }
    const valid = items.filter(item => item.question.trim() && item.answer.trim());
    setSaving(true);
    try {
      await apiClient.put('/chat/faqs', {
        faqs: valid.map((item, i) => ({
          id: item.id,
          question: item.question.trim(),
          answer: item.answer.trim(),
          order: i,
        })),
      });
      setDirty(false);
      setTriedSave(false);
      Alert.alert('✅ Đã lưu', 'Cài đặt câu hỏi nhanh đã được lưu thành công!');
      onClose();
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể lưu cài đặt. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-white">
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-100">
            <View className="flex-row items-center gap-2">
              <MessageSquarePlus size={20} color={COLORS.primary} />
              <Text className="text-base font-black text-secondary ml-2">Câu hỏi nhanh</Text>
              <Text className="text-xs text-gray-400 font-medium ml-1">{items.length}/{MAX_FAQS}</Text>
            </View>
            <TouchableOpacity onPress={onClose} className="p-2 bg-gray-100 rounded-full">
              <X size={18} color={COLORS.secondary} />
            </TouchableOpacity>
          </View>

          {/* Info Banner */}
          <View className="mx-4 mt-3 bg-orange-50 border border-orange-100 rounded-2xl p-3">
            <Text className="text-xs text-orange-700 leading-relaxed">
              💡 Cài đặt tối đa <Text className="font-black">7 câu hỏi</Text> thường gặp. Khi người mua nhắn tin lần đầu, họ thấy danh sách này và nhận câu trả lời <Text className="font-black">tự động</Text>.
            </Text>
          </View>

          {/* Body */}
          <ScrollView
            className="flex-1 px-4 mt-3"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {loading ? (
              <View className="items-center justify-center py-16">
                <ActivityIndicator color={COLORS.primary} size="large" />
                <Text className="text-gray-400 text-sm mt-3">Đang tải...</Text>
              </View>
            ) : (
              <>
                {items.map((item, idx) => (
                  <View key={idx} className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm mb-3">
                    {/* Question row */}
                    <View className="flex-row items-center gap-2 px-3 py-3 bg-gray-50">
                      <View className="w-6 h-6 rounded-full bg-orange-500 items-center justify-center">
                        <Text className="text-white text-[10px] font-black">{idx + 1}</Text>
                      </View>
                      <TextInput
                        className="flex-1 text-sm font-medium text-secondary ml-1"
                        placeholder="Nhập câu hỏi..."
                        placeholderTextColor="#9ca3af"
                        value={item.question}
                        onChangeText={val => handleField(idx, 'question', val)}
                        maxLength={100}
                        style={{ paddingVertical: 0 }}
                      />
                      <TouchableOpacity
                        onPress={() => toggleExpand(idx)}
                        className="p-1.5"
                      >
                        {item.expanded
                          ? <ChevronUp size={16} color="#9ca3af" />
                          : <ChevronDown size={16} color="#9ca3af" />
                        }
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDelete(idx)}
                        className="p-1.5"
                      >
                        <Trash2 size={16} color="#d1d5db" />
                      </TouchableOpacity>
                    </View>

                    {/* Answer */}
                    {item.expanded && (
                      <View className="px-3 py-3 border-t border-gray-100 bg-white">
                        <View className="flex-row items-center mb-2">
                          <Text className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Câu trả lời tự động</Text>
                          {item.question.trim() && !item.answer.trim() && (
                            <Text className="text-[10px] text-red-500 font-bold ml-2">⚠ Bắt buộc</Text>
                          )}
                        </View>
                        <TextInput
                          className={`text-sm text-secondary bg-gray-50 rounded-xl px-3 py-2.5 border ${
                            item.question.trim() && !item.answer.trim()
                              ? 'border-red-300'
                              : 'border-gray-200'
                          }`}
                          placeholder="Nhập câu trả lời sẽ được gửi tự động..."
                          placeholderTextColor="#9ca3af"
                          value={item.answer}
                          onChangeText={val => handleField(idx, 'answer', val)}
                          multiline
                          numberOfLines={3}
                          maxLength={500}
                          textAlignVertical="top"
                          style={{ minHeight: 72 }}
                        />
                        <Text className="text-[10px] text-gray-300 text-right mt-1">{item.answer.length}/500</Text>
                      </View>
                    )}
                  </View>
                ))}

                {/* Add button */}
                {items.length < MAX_FAQS && (
                  <TouchableOpacity
                    onPress={handleAdd}
                    className="flex-row items-center justify-center gap-2 py-4 border-2 border-dashed border-gray-200 rounded-2xl mb-3"
                    activeOpacity={0.7}
                  >
                    <Plus size={18} color="#9ca3af" />
                    <Text className="text-sm text-gray-400 font-medium">Thêm câu hỏi ({items.length}/{MAX_FAQS})</Text>
                  </TouchableOpacity>
                )}

                {items.length === 0 && !loading && (
                  <View className="items-center py-10">
                    <Text className="text-gray-400 text-sm">Chưa có câu hỏi nào. Nhấn "Thêm câu hỏi" để bắt đầu.</Text>
                  </View>
                )}

                <View className="h-8" />
              </>
            )}
          </ScrollView>

          {/* Footer */}
          <View className="px-4 py-3 border-t border-gray-100">
            {triedSave && missingAnswers.length > 0 && (
              <Text className="text-xs text-red-500 text-center font-medium mb-2">
                ⚠ Vui lòng nhập câu trả lời cho{' '}
                {missingAnswers.length === 1
                  ? `câu hỏi số ${missingAnswers[0].idx + 1}`
                  : `${missingAnswers.length} câu hỏi còn thiếu`
                } trước khi lưu.
              </Text>
            )}
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving || !dirty}
              className={`flex-row items-center justify-center gap-2 py-3.5 rounded-2xl ${
                saving || !dirty ? 'bg-gray-200' : 'bg-orange-500'
              }`}
              activeOpacity={0.8}
            >
              {saving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Save size={18} color={saving || !dirty ? '#9ca3af' : '#fff'} />
              }
              <Text className={`font-black text-sm ${saving || !dirty ? 'text-gray-400' : 'text-white'}`}>
                {saving ? 'Đang lưu...' : 'Lưu cài đặt'}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
