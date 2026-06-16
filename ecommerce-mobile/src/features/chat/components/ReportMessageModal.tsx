import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
import { X, Flag, AlertCircle, ImagePlus, XCircle } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useReportConversation } from '../hooks/useChat';
import { chatService } from '../../../services/chat/chatService';

interface ReportMessageModalProps {
  visible: boolean;
  conversationId: string;
  targetMessage: {
    id: string;
    content: string;
    createdAt?: number;
  } | null;
  onClose: () => void;
}

const REPORT_REASONS = [
  { value: 'SPAM', label: 'Spam' },
  { value: 'SCAM', label: 'Lừa đảo' },
  { value: 'FAKE_PRODUCT', label: 'Sản phẩm giả' },
  { value: 'HARASSMENT', label: 'Quấy rối' },
  { value: 'OTHER', label: 'Khác' },
];

export default function ReportMessageModal({
  visible,
  conversationId,
  targetMessage,
  onClose,
}: ReportMessageModalProps) {
  const [reason, setReason] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [images, setImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const reportMutation = useReportConversation();

  const handlePickImage = async () => {
    if (images.length >= 3) {
      Alert.alert('Thông báo', 'Bạn chỉ có thể tải lên tối đa 3 ảnh bằng chứng');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
        allowsMultipleSelection: true,
        selectionLimit: 3 - images.length,
      });

      if (!result.canceled && result.assets) {
        const newImages = result.assets.map(asset => asset.uri);
        setImages(prev => [...prev, ...newImages].slice(0, 3));
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể chọn ảnh, vui lòng thử lại');
    }
  };

  const removeImage = (indexToRemove: number) => {
    setImages(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleClose = () => {
    setReason('');
    setDescription('');
    setImages([]);
    onClose();
  };

  const handleSubmit = async () => {
    if (!targetMessage) return;

    if (!reason) {
      Alert.alert('Thông báo', 'Vui lòng chọn lý do báo cáo');
      return;
    }
    if (reason === 'OTHER' && description.trim().length < 10) {
      Alert.alert('Thông báo', 'Vui lòng nhập mô tả chi tiết (ít nhất 10 ký tự)');
      return;
    }

    try {
      setIsUploading(true);
      let evidenceImages: string[] = [];

      if (images.length > 0) {
        // Upload images one by one or in parallel
        const uploadPromises = images.map(uri => chatService.uploadEvidenceImage(uri, conversationId));
        const uploadResults = await Promise.all(uploadPromises);
        evidenceImages = uploadResults.map(res => res.url).filter(Boolean);
      }

      await reportMutation.mutateAsync({
        conversationId,
        reason,
        description: description.trim(),
        evidenceMessageIds: [targetMessage.id],
        evidenceImages,
      });

      Alert.alert('Thành công', 'Báo cáo của bạn đã được gửi. Đội ngũ kiểm duyệt sẽ xử lý sớm nhất.');
      handleClose();
    } catch (error) {
      Alert.alert('Lỗi', 'Có lỗi xảy ra khi gửi báo cáo, vui lòng thử lại sau.');
    } finally {
      setIsUploading(false);
    }
  };

  const isLoading = reportMutation.isPending || isUploading;

  if (!targetMessage) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View className="flex-1 justify-end bg-black/40">
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View className="bg-white rounded-t-3xl overflow-hidden max-h-[90vh]">
              {/* Header */}
              <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-100">
                <View className="flex-row items-center">
                  <Flag size={20} color="#ef4444" />
                  <Text className="text-[17px] font-bold text-gray-900 ml-2">Báo cáo tin nhắn</Text>
                </View>
                <TouchableOpacity
                  onPress={handleClose}
                  disabled={isLoading}
                  className="p-1.5 bg-gray-100 rounded-full"
                >
                  <X size={18} color="#666" />
                </TouchableOpacity>
              </View>

              <ScrollView className="px-5 py-4" showsVerticalScrollIndicator={false}>
                {/* Target Message Preview */}
                <View className="bg-gray-50 border border-gray-100 rounded-xl p-3 mb-5">
                  <Text className="text-[11px] font-bold text-gray-500 mb-1">Tin nhắn bị báo cáo</Text>
                  <Text className="text-[14px] text-gray-800 italic" numberOfLines={3}>
                    "{targetMessage.content}"
                  </Text>
                </View>

                {/* Reason Selection */}
                <Text className="text-[13px] font-bold text-gray-700 mb-2">
                  <Text className="text-red-500">*</Text> Lý do báo cáo
                </Text>
                <View className="flex-row flex-wrap gap-2 mb-5">
                  {REPORT_REASONS.map(r => (
                    <TouchableOpacity
                      key={r.value}
                      disabled={isLoading}
                      onPress={() => setReason(r.value)}
                      className={`px-4 py-2 rounded-full border ${reason === r.value
                          ? 'bg-red-50 border-red-200'
                          : 'bg-white border-gray-200'
                        }`}
                    >
                      <Text className={`text-[13px] font-medium ${reason === r.value ? 'text-red-600' : 'text-gray-600'
                        }`}>
                        {r.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Description Input */}
                <View className="mb-5">
                  <Text className="text-[13px] font-bold text-gray-700 mb-2">
                    {reason === 'OTHER' && <Text className="text-red-500">* </Text>}
                    Mô tả chi tiết {reason !== 'OTHER' && <Text className="text-gray-400 font-normal">(Không bắt buộc)</Text>}
                  </Text>
                  <TextInput
                    value={description}
                    onChangeText={setDescription}
                    editable={!isLoading}
                    placeholder={reason === 'OTHER' ? "Mô tả chi tiết lý do (tối thiểu 10 ký tự)..." : "Bổ sung thêm thông tin (nếu có)..."}
                    placeholderTextColor="#9ca3af"
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[14px] text-gray-800 min-h-[100px]"
                  />
                  <View className="flex-row justify-between items-center mt-1.5 px-1">
                    <Text className="text-[11px] text-gray-400">
                      {description.length}/1000
                    </Text>
                  </View>
                </View>

                {/* Image Evidence */}
                <View className="mb-6">
                  <Text className="text-[13px] font-bold text-gray-700 mb-2">
                    Hình ảnh bằng chứng (Tối đa 3)
                  </Text>
                  <View className="flex-row flex-wrap gap-3">
                    {images.map((uri, index) => (
                      <View key={index} className="relative">
                        <Image source={{ uri }} className="w-20 h-20 rounded-xl bg-gray-100" />
                        <TouchableOpacity
                          disabled={isLoading}
                          onPress={() => removeImage(index)}
                          className="absolute -top-2 -right-2 bg-white rounded-full shadow-sm"
                        >
                          <XCircle size={20} color="#ef4444" fill="#fff" />
                        </TouchableOpacity>
                      </View>
                    ))}

                    {images.length < 3 && (
                      <TouchableOpacity
                        disabled={isLoading}
                        onPress={handlePickImage}
                        className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 items-center justify-center active:bg-gray-100"
                      >
                        <ImagePlus size={24} color="#9ca3af" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Info Note */}
                <View className="flex-row bg-blue-50 p-3 rounded-xl mb-6 items-center">
                  <AlertCircle size={16} color="#3b82f6" className="mr-2" />
                  <Text className="text-[12px] text-blue-700 flex-1 leading-4 ml-2">
                    Báo cáo sẽ được gửi ẩn danh. Đội ngũ kiểm duyệt sẽ xem xét cẩn thận và có biện pháp xử lý.
                  </Text>
                </View>

                {/* Extra space for scrolling above keyboard */}
                <View className="h-10" />
              </ScrollView>

              {/* Action Buttons */}
              <View className="px-5 py-4 border-t border-gray-100 flex-row gap-3 bg-white pb-8">
                <TouchableOpacity
                  disabled={isLoading}
                  onPress={handleClose}
                  className="flex-1 py-3.5 bg-gray-100 rounded-xl items-center justify-center"
                >
                  <Text className="text-[15px] font-bold text-gray-700">Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={isLoading || !reason || (reason === 'OTHER' && description.trim().length < 10)}
                  onPress={handleSubmit}
                  className={`flex-1 py-3.5 rounded-xl flex-row items-center justify-center gap-2 ${(!reason || (reason === 'OTHER' && description.trim().length < 10))
                      ? 'bg-red-300'
                      : 'bg-red-500 active:bg-red-600'
                    }`}
                >
                  {isLoading ? (
                    <>
                      <ActivityIndicator size="small" color="#fff" />
                      <Text className="text-[15px] font-bold text-white">
                        {isUploading ? 'Đang tải ảnh...' : 'Đang gửi...'}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Flag size={18} color="#fff" />
                      <Text className="text-[15px] font-bold text-white">Gửi báo cáo</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
