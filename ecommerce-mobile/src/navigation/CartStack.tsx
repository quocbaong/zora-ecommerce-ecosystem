import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import CartScreen from '../screens/cart/CartScreen';
import CheckoutScreen from '../screens/cart/CheckoutScreen';

const Stack = createStackNavigator();

export default function CartStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerTitleAlign: 'center',
        headerTintColor: '#102a43',
        headerTitleStyle: { fontFamily: 'Inter_700Bold' },
      }}
    >
      <Stack.Screen 
        name="CartMain" 
        component={CartScreen} 
        options={{ title: 'Giỏ hàng của tôi' }}
      />
      <Stack.Screen 
        name="Checkout" 
        component={CheckoutScreen}
        options={{ title: 'Thanh toán' }}
      />
    </Stack.Navigator>
  );
}
