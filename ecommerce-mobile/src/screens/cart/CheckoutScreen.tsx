import React, { useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  MapPin, 
  CreditCard, 
  ChevronLeft, 
  ShieldCheck,
  CheckCircle2,
  Phone,
  User,
  Building
} from 'lucide-react-native';
import { useCartStore } from '../../store/cartStore';
import { orderApi } from '../../features/order/api';
import { COLORS } from '../../constants';

const CheckoutScreen = ({ navigation }: any) => {
  const { items, getTotalPrice, clearCart } = useCartStore();
  const [loading, setLoading] = useState(false);
  
  const [address, setAddress] = useState({
    fullName: '',
    phoneNumber: '',
    street: '',
    province: 'Hà Nội',
    district: '',
    ward: '',
  });

  const handlePlaceOrder = async () => {
    if (!address.fullName || !address.phoneNumber || !address.street) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập đầy đủ thông tin giao hàng.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        totalPrice: getTotalPrice(),
        items: items.map(item => ({
          productId: item.productId,
          productName: item.name,
          productImage: item.image,
          quantity: item.quantity,
          price: item.price,
          variantId: item.variantId
        })),
        shippingAddress: {
          ...address,
          postalCode: '10000',
          fullAddress: `${address.street}, ${address.ward}, ${address.district}, ${address.province}`
        }
      };

      await orderApi.createOrder(payload);
      
      Alert.alert(
        'Thành công',
        'Đơn hàng của bạn đã được gửi thành công!',
        [{ text: 'Về trang chủ', onPress: () => {
          clearCart();
          navigation.navigate('Home');
        }}]
      );
    } catch (error: any) {
      console.error('Order failed', error);
      Alert.alert('Lỗi', error.message || 'Không thể tạo đơn hàng. Vui lòng thử lại.');
    } finally {
      setLoading(false);
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
          <View className="p-6">
            <View className="flex-row items-center mb-6 ml-2">
               <View className="bg-orange-50 p-2 rounded-xl mr-3">
                  <MapPin size={18} color={COLORS.primary} />
               </View>
              <Text className="text-secondary font-bold text-lg tracking-tight">Thông tin nhận hàng</Text>
            </View>
            
            <View className="bg-white p-5 rounded-[32px] border border-gray-100 shadow-sm">
               <InputWithIcon 
                  icon={<User size={18} color="#9ca3af" />}
                  placeholder="Họ và tên người nhận"
                  value={address.fullName}
                  onChangeText={(text: string) => setAddress({...address, fullName: text})}
               />
               <InputWithIcon 
                  icon={<Phone size={18} color="#9ca3af" />}
                  placeholder="Số điện thoại"
                  value={address.phoneNumber}
                  onChangeText={(text: string) => setAddress({...address, phoneNumber: text})}
                  keyboardType="phone-pad"
                  containerStyle="mt-4"
               />
               <InputWithIcon 
                  icon={<Building size={18} color="#9ca3af" />}
                  placeholder="Địa chỉ (Số nhà, Tên đường)"
                  value={address.street}
                  onChangeText={(text: string) => setAddress({...address, street: text})}
                  containerStyle="mt-4"
               />
               <View className="flex-row gap-3 mt-4">
                  <View className="flex-1">
                     <InputWithIcon 
                        placeholder="Phường/Xã"
                        value={address.ward}
                        onChangeText={(text: string) => setAddress({...address, ward: text})}
                     />
                  </View>
                  <View className="flex-1">
                     <InputWithIcon 
                        placeholder="Quận/Huyện"
                        value={address.district}
                        onChangeText={(text: string) => setAddress({...address, district: text})}
                     />
                  </View>
               </View>
            </View>
          </View>

          {/* Order Summary */}
          <View className="px-6 mb-6">
            <Text className="text-secondary font-bold text-base mb-4 ml-2 tracking-tight">Tóm tắt đơn hàng</Text>
            <View className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
               {items.map((item, idx) => (
                 <View key={idx} className="flex-row justify-between mb-4">
                   <View className="flex-1 mr-4">
                      <Text className="text-secondary font-bold text-xs" numberOfLines={1}>{item.name}</Text>
                      <Text className="text-gray-400 text-[10px] mt-0.5">SL: {item.quantity}</Text>
                   </View>
                   <Text className="text-secondary font-bold text-xs">₫{(item.price * item.quantity).toLocaleString()}</Text>
                 </View>
               ))}
               <View className="h-[1px] bg-gray-50 my-2" />
               <View className="flex-row justify-between items-center pt-2">
                 <Text className="text-secondary font-bold text-base uppercase tracking-tighter">Tổng thanh toán</Text>
                 <Text className="text-primary font-bold text-xl">₫{getTotalPrice().toLocaleString()}</Text>
               </View>
            </View>
          </View>

          {/* Payment Method */}
          <View className="px-6 mb-10">
            <Text className="text-secondary font-bold text-base mb-4 ml-2 tracking-tight">Phương thức thanh toán</Text>
            <TouchableOpacity 
               activeOpacity={0.8}
               className="flex-row items-center justify-between p-5 bg-white rounded-[32px] border-2 border-primary shadow-sm"
            >
              <View className="flex-row items-center">
                <View className="bg-orange-50 p-3 rounded-2xl mr-4 border border-orange-100">
                   <CreditCard size={20} color={COLORS.primary} strokeWidth={2.5} />
                </View>
                <View>
                  <Text className="text-secondary font-bold text-sm">Khi nhận hàng (COD)</Text>
                  <Text className="text-gray-400 text-[10px] font-medium">Thanh toán khi đơn hàng đã đến tay</Text>
                </View>
              </View>
              <CheckCircle2 size={24} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          {/* Security Info */}
          <View className="flex-row items-center justify-center mb-10 opacity-40">
            <ShieldCheck size={14} color="#22c55e" />
            <Text className="text-gray-400 text-[9px] font-bold uppercase tracking-widest ml-1.5">ZORA SECURITY ENFORCED</Text>
          </View>
        </ScrollView>

        {/* Place Order Button */}
        <View className="absolute bottom-0 left-0 right-0 bg-white p-6 pb-12 rounded-t-[48px] shadow-2xl border-t border-gray-50">
          <TouchableOpacity 
            onPress={handlePlaceOrder}
            disabled={loading}
            className="bg-primary pt-5 pb-5 rounded-3xl shadow-xl shadow-orange-500/30 items-center justify-center flex-row"
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Text className="text-white font-bold text-lg uppercase tracking-widest mr-2">Xác nhận đặt hàng</Text>
                <CheckCircle2 size={20} color="white" strokeWidth={2.5} />
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

function InputWithIcon({ icon, containerStyle = "", ...props }: any) {
   return (
      <View className={`flex-row items-center bg-gray-50 px-4 py-3.5 rounded-2xl border border-gray-100 ${containerStyle}`}>
         {icon && <View className="mr-3">{icon}</View>}
         <TextInput 
            className="flex-1 text-secondary text-sm font-medium"
            placeholderTextColor="#9ca3af"
            {...props}
         />
      </View>
   );
}

export default CheckoutScreen;
