import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from '../screens/HomeScreen';
import ProductDetailScreen from '../screens/product/ProductDetailScreen';
import NotificationScreen from '../screens/NotificationScreen';
import QRScannerScreen from '../screens/chat/QRScannerScreen';
import MyQRCodeScreen from '../screens/chat/MyQRCodeScreen';

const Stack = createStackNavigator();

export default function HomeStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerTitleAlign: 'center',
        headerTintColor: '#102a43',
        headerTitleStyle: { fontFamily: 'Inter_700Bold' },
      }}
    >
      <Stack.Screen 
        name="HomeScreen" 
        component={HomeScreen} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="ProductDetail" 
        component={ProductDetailScreen}
        options={{ title: 'Chi tiết sản phẩm' }}
      />
      <Stack.Screen 
        name="Notification" 
        component={NotificationScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="QRScannerScreen" 
        component={QRScannerScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="MyQRCodeScreen" 
        component={MyQRCodeScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
