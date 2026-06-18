import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  Modal
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ChevronLeft, 
  Package, 
  Truck, 
  CheckCircle, 
  XCircle, 
  Clock, 
  MapPin, 
  MessageSquare,
  AlertTriangle
} from 'lucide-react-native';
import { orderApi } from '../../features/order/api';
import { COLORS } from '../../constants';

const StatusBadge = ({ status }: { status: string }) => {
  const configs: any = {
    PENDING: { color: COLORS.primary, bg: '#fff7ed', icon: Clock, label: 'Chờ xác nhận' },
    CONFIRMED: { color: '#3b82f6', bg: '#eff6ff', icon: CheckCircle, label: 'Đã xác nhận' },
    SHIPPING: { color: '#a855f7', bg: '#f3e8ff', icon: Truck, label: 'Đang giao' },
    DELIVERED: { color: '#22c55e', bg: '#f0fdf4', icon: CheckCircle, label: 'Đã giao' },
    CANCELLED: { color: COLORS.error, bg: '#fef2f2', icon: XCircle, label: 'Đã hủy' },
    REFUNDED: { color: '#eab308', bg: '#fefce8', icon: CheckCircle, label: 'Đã hoàn tiền' },
    DISPUTED: { color: '#eab308', bg: '#fefce8', icon: AlertTriangle, label: 'Đang khiếu nại' },
    REFUND_REQUESTED: { color: '#eab308', bg: '#fefce8', icon: AlertTriangle, label: 'Đang khiếu nại' },
  };

  const config = configs[status] || configs.PENDING;
  const Icon = config.icon;

  return (
    <View style={{ backgroundColor: config.bg }} className="flex-row items-center px-3 py-1.5 rounded-xl self-start">
      <Icon size={14} color={config.color} strokeWidth={2.5} />
      <Text style={{ color: config.color }} className="text-xs font-bold ml-1.5 uppercase tracking-tighter">{config.label}</Text>
    </View>
  );
};

export default function OrderDetailScreen({ route, navigation }: any) {
  const { orderId } = route.params;
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [reviewedOrders, setReviewedOrders] = useState<Record<string, boolean>>({});

  useFocusEffect(
    React.useCallback(() => {
      AsyncStorage.getItem('reviewed_orders').then((res) => {
        if (res) setReviewedOrders(JSON.parse(res));
      });
    }, [])
  );

  const fetchOrderDetail = async () => {
    try {
      const data = await orderApi.getOrderById(orderId);
      setOrder(data);
    } catch (error) {
      console.error('Failed to fetch order detail', error);
      Alert.alert('Lỗi', 'Không thể tải chi tiết đơn hàng.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderDetail();
    let interval: NodeJS.Timeout;
    const activeStates = ['PENDING', 'CONFIRMED', 'SHIPPING'];
    if (!order || activeStates.includes(order.status)) {
      interval = setInterval(() => {
        fetchOrderDetail();
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [orderId, order?.status]);

  const handleCancelOrder = async () => {
    setShowCancelModal(false);
    setProcessing(true);
    try {
      await orderApi.cancelOrder(orderId);
      Alert.alert('Thành công', 'Đã hủy đơn hàng');
      fetchOrderDetail();
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể hủy đơn hàng lúc này.');
    } finally {
      setProcessing(false);
    }
  };

  const handleConfirmReceived = () => {
    Alert.alert('Đã nhận được hàng', 'Xác nhận bạn đã nhận được hàng và sản phẩm không có vấn đề gì?', [
      { text: 'Chưa nhận', style: 'cancel' },
      { 
        text: 'Đã nhận', 
        onPress: async () => {
          setProcessing(true);
          try {
            await orderApi.confirmDelivery(orderId);
            Alert.alert('Thành công', 'Cảm ơn bạn đã xác nhận!');
            fetchOrderDetail();
          } catch (error) {
            Alert.alert('Lỗi', 'Không thể xác nhận lúc này.');
          } finally {
            setProcessing(false);
          }
        }
      }
    ]);
  };

  if (loading || !order) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // Mock tracking timeline
  const trackingTimeline = [
    { title: 'Đơn hàng đã đặt', time: new Date(order.createdAt).toLocaleString('vi-VN'), completed: true, icon: Package },
    { title: 'Người bán đã chuẩn bị hàng', time: 'Đang cập nhật', completed: order.status !== 'PENDING' && order.status !== 'CANCELLED', icon: Package },
    { title: 'Đang giao hàng', time: 'Tài xế Nguyễn Văn A đang giao', completed: order.status === 'SHIPPING' || order.status === 'DELIVERED', icon: Truck },
    { title: 'Giao hàng thành công', time: order.status === 'DELIVERED' ? 'Đã hoàn thành' : 'Chờ giao hàng', completed: order.status === 'DELIVERED', icon: CheckCircle },
  ];

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="px-6 pt-4 pb-6 bg-white shadow-sm flex-row items-center border-b border-gray-50 z-10">
         <TouchableOpacity onPress={() => navigation.goBack()} className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
            <ChevronLeft size={20} color={COLORS.secondary} />
         </TouchableOpacity>
         <View className="ml-4 flex-1">
            <Text className="text-secondary font-bold text-xl tracking-tighter">Chi tiết đơn hàng</Text>
            <Text className="text-gray-400 font-medium text-[10px] tracking-wider uppercase">#{order.id.slice(-6).toUpperCase()}</Text>
         </View>
         <StatusBadge status={order.status} />
      </View>

      <ScrollView className="flex-1 bg-gray-50/50" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* Timeline */}
        {(order.status !== 'CANCELLED' && !order.status.includes('REFUND')) && (
          <View className="bg-white p-6 mb-2 border-b border-gray-100">
            <Text className="text-secondary font-bold text-base tracking-tight mb-4">Lịch trình giao hàng</Text>
            {trackingTimeline.map((step, idx) => {
              const StepIcon = step.icon;
              return (
                <View key={idx} className="flex-row mb-4">
                  <View className="items-center mr-4">
                    <View className={`w-8 h-8 rounded-full border items-center justify-center ${step.completed ? 'bg-orange-50 border-primary' : 'bg-white border-gray-200'}`}>
                      <StepIcon size={14} color={step.completed ? COLORS.primary : '#d1d5db'} />
                    </View>
                    {idx < trackingTimeline.length - 1 && (
                      <View className={`w-[2px] h-10 ${trackingTimeline[idx + 1].completed ? 'bg-primary' : 'bg-gray-200'} mt-1`} />
                    )}
                  </View>
                  <View className="flex-1 justify-center mt-[-6px]">
                    <Text className={`font-bold text-sm ${step.completed ? 'text-secondary' : 'text-gray-400'}`}>{step.title}</Text>
                    <Text className="text-gray-400 text-[10px] mt-0.5">{step.time}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Shipping Address */}
        <View className="bg-white p-6 mb-2 border-b border-gray-100">
          <View className="flex-row items-center mb-3">
             <MapPin size={18} color={COLORS.primary} className="mr-2" />
             <Text className="text-secondary font-bold text-base tracking-tight">Địa chỉ nhận hàng</Text>
          </View>
          <View className="ml-6">
            <Text className="text-secondary font-bold text-sm mb-1">{order.shippingAddress?.fullName}</Text>
            <Text className="text-gray-500 text-xs mb-1">{order.shippingAddress?.phoneNumber}</Text>
            <Text className="text-gray-500 text-xs leading-5">
              {order.shippingAddress?.street}, {order.shippingAddress?.ward}, {order.shippingAddress?.district}, {order.shippingAddress?.province}
            </Text>
          </View>
        </View>

        {/* Order Items */}
        <View className="bg-white p-6 mb-2 border-b border-gray-100">
          <Text className="text-secondary font-bold text-base tracking-tight mb-4">Sản phẩm</Text>
          {order.items?.map((item: any, idx: number) => (
            <View key={idx} className="flex-row justify-between mb-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <View className="flex-1 mr-4 flex-row items-center">
                 <View className="w-12 h-12 bg-white rounded-xl items-center justify-center border border-gray-200 mr-3">
                   <Package size={20} color="#d1d5db" />
                 </View>
                 <View className="flex-1">
                   <Text className="text-secondary font-bold text-xs leading-5" numberOfLines={2}>{item.productName}</Text>
                   {item.variantName && <Text className="text-gray-400 text-[10px] mt-0.5">{item.variantName}</Text>}
                   <Text className="text-gray-400 text-[10px] mt-1 font-medium">SL: {item.quantity}</Text>
                 </View>
              </View>
              <View className="items-end justify-center">
                 <Text className="text-secondary font-bold text-sm">₫{(item.price * item.quantity).toLocaleString()}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Payment Summary */}
        <View className="bg-white p-6 border-b border-gray-100">
          <Text className="text-secondary font-bold text-base tracking-tight mb-4">Chi tiết thanh toán</Text>
          <View className="space-y-3">
            <View className="flex-row justify-between">
              <Text className="text-gray-500 text-xs">Tổng tiền hàng</Text>
              <Text className="text-secondary font-bold text-xs">₫{order.totalPrice?.toLocaleString()}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-gray-500 text-xs">Phí vận chuyển</Text>
              <Text className="text-secondary font-bold text-xs">₫0</Text>
            </View>
            <View className="h-[1px] bg-gray-100 my-2" />
            <View className="flex-row justify-between items-center">
              <Text className="text-secondary font-bold text-sm uppercase tracking-tighter">Tổng thanh toán</Text>
              <Text className="text-primary font-bold text-xl">₫{order.totalPrice?.toLocaleString()}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View className="bg-white p-4 pt-4 pb-8 border-t border-gray-100 shadow-2xl flex-row justify-end space-x-3">
        {order.status === 'PENDING' && (
          <TouchableOpacity 
            onPress={() => setShowCancelModal(true)}
            disabled={processing}
            className="px-6 py-3 rounded-2xl bg-red-50 border border-red-200 flex-row items-center mr-3"
          >
            <XCircle size={16} color="#ef4444" className="mr-2" />
            <Text className="text-red-500 font-bold">Hủy đơn</Text>
          </TouchableOpacity>
        )}
        {(order.status === 'SHIPPING' || order.status === 'DELIVERED') && (
          <TouchableOpacity 
            onPress={handleConfirmReceived}
            disabled={processing}
            className="px-6 py-3 rounded-2xl bg-green-50 border border-green-200 flex-row items-center mr-3"
          >
            <CheckCircle size={16} color="#16a34a" className="mr-2" />
            <Text className="text-green-600 font-bold">Đã nhận hàng</Text>
          </TouchableOpacity>
        )}
        {order.status === 'DELIVERED' && (
          <>
            {!reviewedOrders[order.id] && (
              <TouchableOpacity 
                onPress={() => navigation.navigate('ReviewForm', { orderId: order.id, items: order.items })}
                className="px-4 py-3 rounded-2xl bg-orange-50 border border-orange-200 flex-row items-center mr-3"
              >
                <MessageSquare size={16} color={COLORS.primary} className="mr-2" />
                <Text className="text-primary font-bold text-xs">Đánh giá</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              onPress={() => navigation.navigate('DisputeForm', { orderId: order.id })}
              className="px-4 py-3 rounded-2xl bg-red-50 border border-red-200 flex-row items-center"
            >
              <AlertTriangle size={16} color="#ef4444" className="mr-2" />
              <Text className="text-red-500 font-bold text-xs">Trả hàng</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <Modal visible={showCancelModal} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-center items-center px-6">
          <View className="bg-white w-full rounded-3xl p-6 items-center">
            <View className="w-16 h-16 bg-red-50 rounded-full items-center justify-center mb-4">
              <XCircle size={32} color="#ef4444" />
            </View>
            <Text className="text-secondary font-bold text-xl mb-2 text-center">Xác nhận hủy đơn?</Text>
            <Text className="text-gray-500 text-sm text-center mb-6 leading-5">Đơn hàng này sẽ bị hủy ngay lập tức và không thể khôi phục. Bạn có chắc chắn không?</Text>
            <View className="flex-row w-full space-x-3">
              <TouchableOpacity onPress={() => setShowCancelModal(false)} className="flex-1 bg-gray-100 py-4 rounded-2xl items-center mr-2">
                <Text className="text-secondary font-bold">Giữ lại</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCancelOrder} className="flex-1 bg-red-500 py-4 rounded-2xl items-center ml-2">
                <Text className="text-white font-bold">Chắc chắn Hủy</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
