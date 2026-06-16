import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, ActivityIndicator, Dimensions } from 'react-native';
import { X, Ticket, Check, ChevronRight } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import apiClient from '../../../api/client';
import { COLORS } from '../../../constants';

interface SendVoucherModalProps {
  visible: boolean;
  onClose: () => void;
  onSend: (voucher: { voucherId: string; code: string; discountValue: number; discountType: string; minOrderAmount: number }) => void;
  shopId?: string | null;
}

export default function SendVoucherModal({ visible, onClose, onSend, shopId }: SendVoucherModalProps) {
  const insets = useSafeAreaInsets();
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVoucherId, setSelectedVoucherId] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      loadVouchers();
    }
  }, [visible, shopId]);

  const loadVouchers = async () => {
    setLoading(true);
    try {
      let response;
      if (shopId) {
        response = await apiClient.get(`/orders/vouchers/shop/${shopId}`);
      } else {
        // Fallback to seller's own vouchers or all active
        try {
          response = await apiClient.get('/orders/vouchers/seller');
        } catch {
          response = await apiClient.get('/orders/vouchers/active');
        }
      }
      const rawList = response.data || [];
      // Only show active vouchers
      setVouchers(rawList.filter((v: any) => v.active !== false));
    } catch (error) {
      console.warn('Failed to load vouchers', error);
      setVouchers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = () => {
    const selected = vouchers.find(v => v.id === selectedVoucherId);
    if (selected) {
      onSend({
        voucherId: selected.id,
        code: selected.code,
        discountValue: selected.discountValue,
        discountType: selected.discountType,
        minOrderAmount: selected.minOrderAmount || 0,
      });
      onClose();
    }
  };

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const renderItem = ({ item }: { item: any }) => {
    const isSelected = item.id === selectedVoucherId;
    const isPercent = item.discountType === 'PERCENT';
    const headline = isPercent ? `Giảm ${item.discountValue}%` : `Giảm ${formatPrice(item.discountValue)}`;

    return (
      <TouchableOpacity
        onPress={() => setSelectedVoucherId(isSelected ? null : item.id)}
        activeOpacity={0.8}
        className={`mb-4 flex-row items-stretch rounded-2xl overflow-hidden border ${
          isSelected ? 'border-orange-500 bg-orange-50/30' : 'border-gray-100 bg-white'
        } shadow-sm`}
        style={{ height: 96 }}
      >
        {/* Left Coupon Ticket Cuống Vé */}
        <View className={`w-28 items-center justify-center px-2 relative ${isSelected ? 'bg-orange-500' : 'bg-orange-100/60'}`}>
          <Ticket size={24} color={isSelected ? '#fff' : '#f97316'} />
          <Text className={`text-[10px] font-extrabold uppercase mt-1 tracking-widest ${isSelected ? 'text-white/80' : 'text-orange-500'}`}>
            VOUCHER
          </Text>
          {/* Half-circles for coupon aesthetics */}
          <View className="absolute -right-2 top-10 w-4 h-4 rounded-full bg-white border border-gray-100" />
        </View>

        {/* Right Info area */}
        <View className="flex-1 p-4 justify-between relative pl-6">
          <View>
            <View className="flex-row items-center justify-between">
              <Text className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider">{item.code}</Text>
              {isSelected && (
                <View className="w-5 h-5 rounded-full bg-orange-500 items-center justify-center">
                  <Check size={12} color="#fff" strokeWidth={3} />
                </View>
              )}
            </View>
            <Text className="text-base font-black text-secondary mt-0.5">{headline}</Text>
          </View>
          
          <View className="flex-row items-center justify-between mt-1">
            <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">
              Đơn tối thiểu {formatPrice(item.minOrderAmount || 0)}
            </Text>
            {item.maxDiscount > 0 && isPercent && (
              <Text className="text-[9px] font-bold text-orange-500">
                Tối đa {formatPrice(item.maxDiscount)}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 bg-black/40 justify-end">
        <View className="bg-white rounded-t-[40px] h-[75%] shadow-2xl flex-col overflow-hidden">
          {/* Drag Line */}
          <View className="items-center pt-3 pb-1">
            <View className="w-12 h-1.5 bg-gray-200 rounded-full" />
          </View>

          {/* Header */}
          <View className="px-6 py-3 flex-row items-center justify-between border-b border-gray-50">
            <View className="flex-row items-center">
              <View className="w-8 h-8 rounded-full bg-orange-50 items-center justify-center mr-2">
                <Ticket size={16} color="#f97316" />
              </View>
              <Text className="text-lg font-black text-secondary">Gửi Voucher giảm giá</Text>
            </View>
            <TouchableOpacity onPress={onClose} className="p-2 bg-gray-100 rounded-full">
              <X size={18} color={COLORS.secondary} />
            </TouchableOpacity>
          </View>

          {/* List Area */}
          <View className="flex-1 px-6 pt-4">
            {loading ? (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator color="#f97316" size="large" />
                <Text className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-4">
                  Đang tải danh sách voucher...
                </Text>
              </View>
            ) : vouchers.length === 0 ? (
              <View className="flex-1 items-center justify-center py-20">
                <Ticket size={48} color="#e5e7eb" strokeWidth={1} />
                <Text className="text-gray-400 text-sm font-bold mt-4">Cửa hàng chưa có voucher nào</Text>
                <Text className="text-gray-300 text-[10px] uppercase font-bold tracking-widest mt-1 text-center">
                  Voucher sẽ xuất hiện khi cửa hàng tạo chương trình khuyến mãi
                </Text>
              </View>
            ) : (
              <FlatList
                data={vouchers}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
              />
            )}
          </View>

          {/* Actions Footer */}
          <View 
            className="px-6 py-4 border-t border-gray-100 flex-row gap-4 bg-gray-50/50"
            style={{ paddingBottom: Math.max(insets.bottom, 16) }}
          >
            <TouchableOpacity 
              onPress={onClose}
              className="flex-1 py-4 bg-gray-100 rounded-2xl items-center justify-center"
            >
              <Text className="text-secondary font-bold text-sm">Hủy bỏ</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleSend}
              disabled={!selectedVoucherId}
              className={`flex-1 py-4 rounded-2xl items-center justify-center ${
                selectedVoucherId ? 'bg-orange-500 shadow-lg shadow-orange-500/20' : 'bg-gray-200'
              }`}
            >
              <Text className={`font-bold text-sm ${selectedVoucherId ? 'text-white' : 'text-gray-400'}`}>
                Gửi ngay
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
