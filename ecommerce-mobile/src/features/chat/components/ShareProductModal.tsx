import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { X, Tag, Send } from 'lucide-react-native';
import apiClient from '../../../api/client';
import ConversationPicker from './ConversationPicker';
import { COLORS } from '../../../constants';
import { Product } from '../../../types';

interface ShareProductModalProps {
  product: Product;
  onClose: () => void;
}

export default function ShareProductModal({ product, onClose }: ShareProductModalProps) {
  const selectedMessage = {
    type: 'PRODUCT',
    content: JSON.stringify({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.images?.[0] || ''
    }),
    resolvedSenderName: 'Bạn'
  };

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="bg-white rounded-t-[32px] h-[85%] overflow-hidden shadow-2xl">
          {/* Header */}
          <View className="flex-row items-center justify-between px-6 py-5 border-b border-gray-100">
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-full bg-orange-100 items-center justify-center mr-3">
                <Tag size={20} color={COLORS.primary} />
              </View>
              <Text className="font-bold text-secondary text-lg">Chia sẻ sản phẩm</Text>
            </View>
            <TouchableOpacity onPress={onClose} className="p-2 bg-gray-50 rounded-full border border-gray-100">
              <X size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {/* Product Preview */}
          <View className="mx-6 mt-6 mb-4 flex-row items-center p-4 bg-gray-50 rounded-[24px] border border-gray-200">
            <Image 
              source={{ uri: product.images?.[0] }} 
              className="w-16 h-16 rounded-[16px] bg-white border border-gray-100"
              resizeMode="cover"
            />
            <View className="ml-4 flex-1">
              <Text className="text-[13px] font-bold text-secondary leading-5" numberOfLines={2}>{product.name}</Text>
              <Text className="text-[15px] font-bold text-primary mt-1">₫{product.price.toLocaleString()}</Text>
            </View>
          </View>

          {/* Picker */}
          <View className="flex-1">
            <ConversationPicker selectedMessage={selectedMessage} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
