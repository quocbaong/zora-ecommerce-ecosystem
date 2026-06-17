import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { 
  MapPin, 
  CreditCard, 
  ChevronLeft, 
  ShieldCheck,
  CheckCircle2,
  Truck,
  Ticket,
  ChevronRight,
  User,
  Phone
} from 'lucide-react-native';
import { useCartStore } from '../../store/cartStore';
import { orderApi } from '../../features/order/api';
import apiClient from '../../api/client';
import { COLORS } from '../../constants';

const CheckoutScreen = ({ route, navigation }: any) => {
  const { selectedItemIds } = route.params || { selectedItemIds: [] };
  const { items, fetchCart } = useCartStore();
  const [loading, setLoading] = useState(false);
  
  const checkoutItems = items.filter(i => selectedItemIds.includes(i.id));
  const subTotal = checkoutItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const [address, setAddress] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'VNPAY'>('COD');
  
  // WebView Payment State
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [showWebView, setShowWebView] = useState(false);

  useEffect(() => {
    if (route.params?.selectedAddress) {
      setAddress(route.params.selectedAddress);
    } else {
      fetchDefaultAddress();
    }
  }, [route.params?.selectedAddress]);

  const fetchDefaultAddress = async () => {
    try {
      const res = await apiClient.get('/users/addresses');
      const addrs = res.data?.data || res.data;
      if (addrs && addrs.length > 0) {
        const defaultAddr = addrs.find((a: any) => a.default) || addrs[0];
        setAddress(defaultAddr);
      }
    } catch (error) {
      console.error('Error fetching address', error);
    }
  };

  const handlePlaceOrder = async () => {
    if (!address) {
      Alert.alert('Thiếu thông tin', 'Vui lòng chọn địa chỉ giao hàng.');
      return;
    }

    setLoading(true);
    try {
      // Create Order
      const payload = {
        items: checkoutItems.map(item => ({
          productId: item.productId,
          productName: item.name,
          productImage: item.image,
          quantity: item.quantity,
          price: item.price,
          variantId: item.variantId,
          sellerId: item.sellerId,
        })),
        shippingAddress: {
          fullName: address.receiverName || address.fullName,
          phoneNumber: address.phone || address.phoneNumber,
          street: address.street,
          ward: address.ward,
          district: address.district,
          province: address.province,
          postalCode: '10000',
          fullAddress: `${address.street}, ${address.ward}, ${address.district}, ${address.province}`
        },
        paymentMethod: paymentMethod === 'VNPAY' ? 'PAYOS' : 'COD'
      };

      const orderRes = await orderApi.createOrder(payload);
      const orderData = orderRes.data || orderRes;
      
      // Clear checked out items from server cart
      for (const item of checkoutItems) {
        await apiClient.delete(`/cart/items/${item.id}`);
      }
      await fetchCart();

      if (paymentMethod === 'VNPAY') {
        // Fetch Payment URL
        const payRes = await apiClient.post(`/payments/create?method=PAYOS`, {
          orderId: orderData.id,
          amount: subTotal,
          currency: 'vnd'
        });
        
        const url = payRes.data?.clientSecret || payRes.data?.paymentUrl;
        if (url) {
          setPaymentUrl(url);
          setShowWebView(true);
        } else {
          Alert.alert('Lỗi', 'Không thể tạo link thanh toán.');
        }
      } else {
        Alert.alert(
          'Thành công',
          'Đơn hàng của bạn đã được xác nhận!',
          [{ text: 'Về trang chủ', onPress: () => navigation.navigate('Home') }]
        );
      }
    } catch (error: any) {
      console.error('Order failed', error);
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể tạo đơn hàng. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleNavigationStateChange = (navState: any) => {
    const { url } = navState;
    // Lắng nghe URL trả về từ cổng thanh toán để đóng WebView
    if (url.includes('payment-success') || url.includes('success=true') || url.includes('cancel=false')) {
      setShowWebView(false);
      Alert.alert(
        'Thành công',
        'Thanh toán thành công! Đơn hàng đã được xác nhận.',
        [{ text: 'OK', onPress: () => navigation.navigate('Home') }]
      );
    } else if (url.includes('cancel=true') || url.includes('payment-failed')) {
      setShowWebView(false);
      Alert.alert('Thất bại', 'Thanh toán đã bị hủy hoặc thất bại.');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 bg-gray-50/30"
      >
        <View className="px-6 pt-4 pb-6 bg-white rounded-b-[40px] shadow-sm flex-row items-center border-b border-gray-50">
           <TouchableOpacity onPress={() => navigation.goBack()} className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
              <ChevronLeft size={20} color={COLORS.secondary} />
           </TouchableOpacity>
           <View className="ml-4">
              <Text className="text-secondary font-bold text-2xl tracking-tighter">Thanh toán</Text>
              <Text className="text-gray-400 font-medium text-[10px] tracking-wider uppercase">Bước cuối cùng</Text>
           </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 160 }}>
          
          {/* Shipping Address */}
          <View className="p-6 pb-2">
            <View className="flex-row items-center justify-between mb-4 ml-2">
               <View className="flex-row items-center">
                  <MapPin size={18} color={COLORS.primary} className="mr-2" />
                  <Text className="text-secondary font-bold text-base tracking-tight">Địa chỉ nhận hàng</Text>
               </View>
            </View>
            
            <TouchableOpacity 
              activeOpacity={0.7}
              onPress={() => navigation.navigate('AddressList', { isSelectionMode: true })}
              className="bg-white p-5 rounded-[32px] border border-orange-100 shadow-sm shadow-orange-100/50 flex-row items-center justify-between"
            >
              {address ? (
                <View className="flex-1 mr-4">
                  <View className="flex-row items-center mb-1">
                    <Text className="text-secondary font-bold text-sm">{address.receiverName || address.fullName}</Text>
                    <Text className="text-gray-300 mx-2">|</Text>
                    <Text className="text-gray-500 text-xs">{address.phone || address.phoneNumber}</Text>
                  </View>
                  <Text className="text-gray-600 text-xs leading-5">
                    {address.street}, {address.ward}, {address.district}, {address.province}
                  </Text>
                </View>
              ) : (
                <Text className="text-gray-400 text-sm flex-1">Nhấn để thêm địa chỉ giao hàng</Text>
              )}
              <ChevronRight size={20} color="#d1d5db" />
            </TouchableOpacity>
          </View>

          {/* Order Summary */}
          <View className="px-6 mb-6 mt-4">
            <Text className="text-secondary font-bold text-base mb-4 ml-2 tracking-tight">Đơn hàng của bạn</Text>
            <View className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
               {checkoutItems.map((item, idx) => (
                 <View key={idx} className="flex-row justify-between mb-4">
                   <View className="flex-1 mr-4">
                      <Text className="text-secondary font-bold text-xs leading-5" numberOfLines={2}>{item.name}</Text>
                      {item.variantName && <Text className="text-gray-400 text-[10px] mt-0.5">{item.variantName}</Text>}
                      <Text className="text-gray-400 text-[10px] mt-1">SL: {item.quantity}</Text>
                   </View>
                   <Text className="text-secondary font-bold text-sm">₫{(item.price * item.quantity).toLocaleString()}</Text>
                 </View>
               ))}
               <View className="h-[1px] bg-gray-50 my-2" />
               <View className="flex-row justify-between items-center mt-2 mb-2">
                 <Text className="text-gray-500 font-medium text-xs">Phí vận chuyển</Text>
                 <Text className="text-secondary font-bold text-xs">₫0</Text>
               </View>
               <View className="flex-row justify-between items-center pt-2 border-t border-gray-50 border-dashed">
                 <Text className="text-secondary font-bold text-base uppercase tracking-tighter">Tổng thanh toán</Text>
                 <Text className="text-primary font-bold text-xl">₫{subTotal.toLocaleString()}</Text>
               </View>
            </View>
          </View>

          {/* Platform Voucher */}
          <View className="px-6 mb-6">
            <TouchableOpacity className="flex-row items-center justify-between p-4 bg-orange-50/50 rounded-2xl border border-orange-100">
               <View className="flex-row items-center">
                 <Ticket size={20} color={COLORS.primary} className="mr-3" />
                 <Text className="text-secondary font-bold text-sm">Voucher ZORA</Text>
               </View>
               <View className="flex-row items-center">
                 <Text className="text-gray-500 text-xs mr-2">Chọn hoặc nhập mã</Text>
                 <ChevronRight size={16} color="#d1d5db" />
               </View>
            </TouchableOpacity>
          </View>

          {/* Payment Method */}
          <View className="px-6 mb-10">
            <Text className="text-secondary font-bold text-base mb-4 ml-2 tracking-tight">Phương thức thanh toán</Text>
            
            <TouchableOpacity 
               activeOpacity={0.8}
               onPress={() => setPaymentMethod('COD')}
               className={`flex-row items-center justify-between p-5 bg-white rounded-3xl border-2 mb-3 shadow-sm ${paymentMethod === 'COD' ? 'border-primary' : 'border-transparent'}`}
            >
              <View className="flex-row items-center">
                <View className="bg-blue-50 p-3 rounded-xl mr-4 border border-blue-100">
                   <Truck size={20} color="#3b82f6" strokeWidth={2.5} />
                </View>
                <View>
                  <Text className="text-secondary font-bold text-sm">Thanh toán khi nhận hàng</Text>
                  <Text className="text-gray-400 text-[10px] font-medium mt-0.5">Tiền mặt (COD)</Text>
                </View>
              </View>
              {paymentMethod === 'COD' && <CheckCircle2 size={24} color={COLORS.primary} />}
            </TouchableOpacity>

            <TouchableOpacity 
               activeOpacity={0.8}
               onPress={() => setPaymentMethod('VNPAY')}
               className={`flex-row items-center justify-between p-5 bg-white rounded-3xl border-2 shadow-sm ${paymentMethod === 'VNPAY' ? 'border-primary' : 'border-transparent'}`}
            >
              <View className="flex-row items-center">
                <View className="bg-orange-50 p-3 rounded-xl mr-4 border border-orange-100">
                   <CreditCard size={20} color={COLORS.primary} strokeWidth={2.5} />
                </View>
                <View>
                  <Text className="text-secondary font-bold text-sm">Thanh toán Online (VNPay/PayOS)</Text>
                  <Text className="text-gray-400 text-[10px] font-medium mt-0.5">Quét mã QR qua ứng dụng ngân hàng</Text>
                </View>
              </View>
              {paymentMethod === 'VNPAY' && <CheckCircle2 size={24} color={COLORS.primary} />}
            </TouchableOpacity>
          </View>

          {/* Security Info */}
          <View className="flex-row items-center justify-center mb-10 opacity-40">
            <ShieldCheck size={14} color="#22c55e" />
            <Text className="text-gray-400 text-[9px] font-bold uppercase tracking-widest ml-1.5">ZORA SECURITY ENFORCED</Text>
          </View>
        </ScrollView>

        {/* Place Order Button */}
        <View className="absolute bottom-0 left-0 right-0 bg-white p-6 pb-12 rounded-t-[48px] shadow-2xl border-t border-gray-50 flex-row items-center justify-between">
          <View className="mr-4">
             <Text className="text-gray-400 text-[10px] font-medium mb-0.5 uppercase tracking-wider">Tổng cộng</Text>
             <Text className="text-primary font-bold text-2xl">₫{subTotal.toLocaleString()}</Text>
          </View>
          <TouchableOpacity 
            onPress={handlePlaceOrder}
            disabled={loading}
            className="flex-1 bg-primary py-4 rounded-3xl shadow-xl shadow-orange-500/30 items-center justify-center flex-row"
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-base uppercase tracking-widest">Đặt hàng</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Payment WebView Modal */}
      <Modal visible={showWebView} animationType="slide" onRequestClose={() => setShowWebView(false)}>
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-row justify-between items-center p-4 border-b border-gray-200">
            <Text className="font-bold text-lg text-secondary">Thanh toán an toàn</Text>
            <TouchableOpacity onPress={() => setShowWebView(false)}>
              <Text className="text-red-500 font-bold">Đóng</Text>
            </TouchableOpacity>
          </View>
          {paymentUrl && (
            <WebView 
              source={{ uri: paymentUrl }} 
              onNavigationStateChange={handleNavigationStateChange}
              startInLoadingState={true}
              renderLoading={() => <ActivityIndicator size="large" color={COLORS.primary} style={{ flex: 1 }} />}
            />
          )}
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
};

export default CheckoutScreen;
