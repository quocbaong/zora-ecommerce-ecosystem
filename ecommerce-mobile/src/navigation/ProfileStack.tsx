import { createStackNavigator } from '@react-navigation/stack';
import ProfileScreen from '../screens/user/ProfileScreen';
import ChangePasswordScreen from '../screens/user/ChangePasswordScreen';
import OrdersScreen from '../screens/user/OrdersScreen';
import AddressListScreen from '../screens/user/AddressListScreen';
import EditProfileScreen from '../screens/user/EditProfileScreen';
import SellerProductScreen from '../screens/user/SellerProductScreen';
import AddAddressScreen from '../screens/user/AddressFormScreen';
import EditAddressScreen from '../screens/user/AddressFormScreen';
import AddProductScreen from '../screens/user/AddProductScreen';
import OrderDetailScreen from '../screens/user/OrderDetailScreen';
import ReviewFormScreen from '../screens/user/ReviewFormScreen';
import DisputeFormScreen from '../screens/user/DisputeFormScreen';

const Stack = createStackNavigator();

export default function ProfileStack() {
  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false, // Tắt Header mặc định để tránh dư thừa (nội dung đã có Custom Header)
        headerTitleAlign: 'center',
        headerTintColor: '#102a43',
        headerTitleStyle: { fontFamily: 'Inter_700Bold' },
      }}
    >
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Orders" component={OrdersScreen} />
      <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
      <Stack.Screen name="ReviewForm" component={ReviewFormScreen} />
      <Stack.Screen name="DisputeForm" component={DisputeFormScreen} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      <Stack.Screen name="AddressList" component={AddressListScreen} />
      <Stack.Screen name="AddAddress" component={AddAddressScreen} />
      <Stack.Screen name="EditAddress" component={EditAddressScreen} />
      <Stack.Screen name="AddProduct" component={AddProductScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="SellerProducts" component={SellerProductScreen} />
    </Stack.Navigator>
  );
}
