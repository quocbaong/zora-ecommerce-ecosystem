import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ticket } from 'lucide-react-native';
import { useVoucherById, useSaveVoucher } from '../../shop/hooks/useShop';

interface Props {
  contentStr: any;
  isMe: boolean;
}

export default function VoucherBubble({ contentStr, isMe }: Props) {
  const parsed = useMemo(() => {
    let p = contentStr;
    if (typeof p === 'string') {
      try { p = JSON.parse(p); } catch (e) {}
    }
    let safetyCount = 0;
    while (typeof p === 'string' && safetyCount < 3) {
      try { p = JSON.parse(p); } catch (e) { break; }
      safetyCount++;
    }
    return p;
  }, [contentStr]);

  const vId = parsed?.voucherId || parsed?.id;
  
  const { data: voucher, isLoading, isError } = useVoucherById(vId);
  const saveMut = useSaveVoucher();

  if (!vId) {
    const fallbackText = typeof contentStr === 'string' ? contentStr : JSON.stringify(contentStr);
    return (
      <View className="p-4 bg-gray-800 rounded-2xl w-64 border border-gray-700">
        <Text className="text-red-400 text-xs font-bold text-center">Lỗi định dạng: {fallbackText.substring(0, 50)}</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View className={`rounded-2xl border w-64 px-4 py-6 items-center justify-center ${isMe ? 'border-gray-700 bg-gray-700' : 'border-gray-200 bg-white'}`}>
        <ActivityIndicator color={isMe ? '#9ca3af' : '#f97316'} />
        <Text className={`text-xs mt-2 ${isMe ? 'text-gray-400' : 'text-gray-500'}`}>Đang tải voucher...</Text>
      </View>
    );
  }

  if (isError || !voucher) {
    return (
      <View className={`rounded-2xl border w-64 px-4 py-6 items-center justify-center ${isMe ? 'border-gray-700 bg-gray-700' : 'border-gray-200 bg-white'}`}>
        <Text className={`text-xs ${isMe ? 'text-gray-400' : 'text-gray-500'}`}>Voucher không tồn tại hoặc đã bị xóa</Text>
      </View>
    );
  }

  const discountVal = Number(voucher.discountValue || 0);
  const isPercent = voucher.discountType === 'PERCENT';

  const formatPrice = (val: number) => {
    try {
      return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
    } catch {
      return `${val}đ`;
    }
  };
  
  const headline = isPercent ? `Giảm ${discountVal}%` : `Giảm ${formatPrice(discountVal)}`;
  
  const inactive = voucher.expired || voucher.usedUp || !voucher.active;
  let statusLabel: string | null = null;
  if (!voucher.active) statusLabel = 'Đã ngừng';
  else if (voucher.expired) statusLabel = 'Hết hạn';
  else if (voucher.usedUp) statusLabel = 'Đã dùng hết';

  const isClaimed = !!voucher.saved;

  const handleClaim = () => {
    if (isClaimed || inactive || saveMut.isPending) return;
    saveMut.mutate(vId);
  };

  return (
    <View className={`rounded-2xl overflow-hidden border shadow-sm w-64 ${isMe ? 'border-gray-700 bg-[#374151]' : 'border-gray-200 bg-white'}`}>
      {/* Header */}
      <View className={`flex-row items-center px-4 py-2.5 border-b ${isMe ? 'border-gray-600 bg-[#1f2937]' : 'border-gray-100 bg-orange-50'}`}>
        <Ticket size={16} color={isMe ? '#fb923c' : '#f97316'} />
        <Text className={`text-xs font-bold ml-2 ${isMe ? 'text-orange-400' : 'text-orange-600'}`}>
          Voucher{voucher.targetUserId ? ' riêng cho bạn' : ''}
        </Text>
      </View>

      {/* Body */}
      <View className="px-4 py-3">
        <Text className={`text-lg font-bold mb-1.5 ${inactive ? 'text-gray-400 line-through' : (isMe ? 'text-orange-400' : 'text-orange-500')}`}>
          {headline}
        </Text>
        
        {!!voucher.title && (
          <Text className={`text-xs mb-1.5 ${isMe ? 'text-gray-300' : 'text-gray-700'}`}>{voucher.title}</Text>
        )}
        
        <Text className={`text-[11px] font-mono mb-1.5 ${isMe ? 'text-gray-400' : 'text-gray-500'}`}>
          Mã: {voucher.code}
        </Text>
        
        {Number(voucher.minOrderAmount) > 0 && (
          <Text className={`text-[11px] mb-1.5 ${isMe ? 'text-gray-400' : 'text-gray-500'}`}>
            Đơn tối thiểu {formatPrice(Number(voucher.minOrderAmount))}
          </Text>
        )}
        
        {isPercent && Number(voucher.maxDiscount) > 0 && (
          <Text className={`text-[11px] mb-1.5 ${isMe ? 'text-gray-400' : 'text-gray-500'}`}>
            Giảm tối đa {formatPrice(Number(voucher.maxDiscount))}
          </Text>
        )}
        
        {!!voucher.expiresAt && (
          <Text className={`text-[11px] mb-3 ${isMe ? 'text-gray-400' : 'text-gray-400'}`}>
            HSD: {new Date(voucher.expiresAt).toLocaleString('vi-VN')}
          </Text>
        )}

        {statusLabel ? (
          <View className={`px-4 py-2 rounded-lg items-center ${isMe ? 'bg-gray-600' : 'bg-gray-100'}`}>
            <Text className={`text-xs font-bold ${isMe ? 'text-gray-400' : 'text-gray-400'}`}>
              {statusLabel}
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            onPress={handleClaim}
            disabled={isClaimed}
            className={`px-4 py-2 rounded-lg items-center ${isClaimed ? (isMe ? 'bg-orange-900/50' : 'bg-orange-100') : (isMe ? 'bg-orange-600' : 'bg-orange-500')}`}
          >
            <Text className={`text-xs font-bold ${isClaimed ? (isMe ? 'text-orange-500' : 'text-orange-600') : 'text-white'}`}>
              {isClaimed ? 'Đã lưu' : 'Lưu voucher'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
