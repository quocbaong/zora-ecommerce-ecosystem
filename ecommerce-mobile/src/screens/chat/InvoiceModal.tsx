import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, FlatList, ActivityIndicator, TouchableWithoutFeedback } from 'react-native';
import { ShoppingBag, X, Check, Truck, Clock, XCircle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { orderApi } from '../../features/order/api';
import { COLORS } from '../../constants';

interface InvoiceModalProps {
  visible: boolean;
  onClose: () => void;
  onSend: (content: string) => void;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING:   { label: 'Chờ xác nhận', color: '#ca8a04' },
  CONFIRMED: { label: 'Đã xác nhận',  color: '#2563eb' },
  SHIPPING:  { label: 'Đang giao',    color: '#ea580c' },
  DELIVERED: { label: 'Đã giao',      color: '#16a34a' },
  CANCELLED: { label: 'Đã huỷ',       color: '#ef4444' },
};

function formatCurrency(amount: number): string {
  return amount.toLocaleString('vi-VN') + '₫';
}

function formatDate(ts: string): string {
  return new Date(ts).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function InvoiceModal({ visible, onClose, onSend }: InvoiceModalProps) {
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setLoading(true);
      orderApi.getOrders()
        .then((res: any) => {
          // res có thể là mảng, hoặc { data: [...] }, hoặc { content: [...] } (PageResponse từ backend)
          let arr = [];
          if (Array.isArray(res)) arr = res;
          else if (Array.isArray(res?.content)) arr = res.content;
          else if (Array.isArray(res?.data)) arr = res.data;
          
          setOrders(arr);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    }
  }, [visible]);

  const handleSend = () => {
    const order = orders.find(o => o.id === selectedId);
    if (!order) return;

    const payload = {
      orderId: order.id,
      status: order.status,
      totalPrice: order.totalPrice,
      createdAt: order.createdAt,
      items: order.items?.map((item: any) => ({
        productName: item.productName ?? item.name ?? 'Sản phẩm',
        quantity: item.quantity,
        price: item.price,
      })) || [],
    };

    onSend(JSON.stringify(payload));
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View className="flex-1 bg-black/40 justify-end">
          <TouchableWithoutFeedback>
            <View 
              className="bg-white rounded-t-3xl pt-5 px-5 h-[70%] shadow-2xl"
              style={{ paddingBottom: Math.max(insets.bottom, 24) }}
            >
              {/* Header */}
              <View className="flex-row items-center justify-between mb-4 border-b border-gray-100 pb-3">
                <View className="flex-row items-center">
                  <View className="w-10 h-10 rounded-full bg-orange-100 items-center justify-center mr-3">
                    <ShoppingBag size={20} color={COLORS.primary} />
                  </View>
                  <Text className="text-lg font-bold text-gray-900">Gửi hoá đơn</Text>
                </View>
                <TouchableOpacity onPress={onClose} className="p-2 bg-gray-50 rounded-full">
                  <X size={20} color="#6b7280" />
                </TouchableOpacity>
              </View>

              {/* Order List */}
              {loading ? (
                <View className="flex-1 justify-center items-center">
                  <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
              ) : orders.length === 0 ? (
                <View className="flex-1 justify-center items-center opacity-50">
                  <ShoppingBag size={40} color="#9ca3af" className="mb-2" />
                  <Text className="text-gray-500">Chưa có đơn hàng nào</Text>
                </View>
              ) : (
                <FlatList
                  data={orders}
                  keyExtractor={item => item.id}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => {
                    const isSelected = item.id === selectedId;
                    const statusInfo = STATUS_MAP[item.status] || { label: item.status, color: '#6b7280' };
                    
                    return (
                      <TouchableOpacity
                        className={`flex-row items-center mb-3 p-4 rounded-2xl border ${isSelected ? 'border-orange-500 bg-orange-50' : 'border-gray-200 bg-white'}`}
                        onPress={() => setSelectedId(isSelected ? null : item.id)}
                      >
                        <View className="flex-1 mr-3">
                          <View className="flex-row justify-between mb-1.5">
                            <Text className="text-[12px] font-mono text-gray-500">#{item.id.slice(-8).toUpperCase()}</Text>
                            <Text style={{ color: statusInfo.color }} className="text-[11px] font-bold">{statusInfo.label}</Text>
                          </View>
                          {item.items && item.items.length > 0 && (
                            <Text className="text-[13px] text-gray-800 font-medium mb-1" numberOfLines={1}>
                              {item.items[0]?.productName || item.items[0]?.name || 'Sản phẩm'} {item.items.length > 1 && `+ ${item.items.length - 1}`}
                            </Text>
                          )}
                          <View className="flex-row justify-between items-center mt-1">
                            <Text className="text-[11px] text-gray-400">{formatDate(item.createdAt)}</Text>
                            <Text className="text-[14px] font-bold text-gray-900">{formatCurrency(item.totalPrice)}</Text>
                          </View>
                        </View>
                        
                        <View className={`w-6 h-6 rounded-full border items-center justify-center ${isSelected ? 'bg-orange-500 border-orange-500' : 'border-gray-300'}`}>
                          {isSelected && <Check size={14} color="#fff" strokeWidth={3} />}
                        </View>
                      </TouchableOpacity>
                    );
                  }}
                />
              )}

              {/* Action */}
              <TouchableOpacity
                className={`py-4 rounded-2xl items-center mt-3 ${selectedId ? 'bg-orange-500 shadow-md shadow-orange-500/30' : 'bg-gray-200'}`}
                onPress={handleSend}
                disabled={!selectedId}
              >
                <Text className={`text-[15px] font-bold ${selectedId ? 'text-white' : 'text-gray-400'}`}>Gửi hoá đơn đơn hàng</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
