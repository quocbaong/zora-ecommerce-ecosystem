import React, { useEffect } from 'react';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, ShoppingCart, MessageSquare, User } from 'lucide-react-native';
import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HomeStack from './HomeStack';
import CartStack from './CartStack';
import ProfileStack from './ProfileStack';
import ChatStack from './ChatStack';
import { COLORS } from '../constants';
import GlobalCallOverlay from '../features/chat/components/GlobalCallOverlay';
import socketService from '../services/socket/socketService';

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  const insets = useSafeAreaInsets();
  const bottomPadding = insets.bottom > 0 ? insets.bottom : 12;
  const tabHeight = 58 + bottomPadding;

  const tabBarStyle = {
    height: tabHeight,
    paddingBottom: bottomPadding,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#ffffff',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
  };

  useEffect(() => {
    socketService.fetchAndJoinGroups();
  }, []);

  return (
    <>
      <Tab.Navigator
        screenOptions={{
          headerTitleAlign: 'center',
          headerTintColor: COLORS.secondary,
          headerTitleStyle: {
            fontFamily: 'Inter_700Bold',
            fontSize: 18,
            letterSpacing: -0.5,
          },
          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: '#94a3b8',
          tabBarShowLabel: true,
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '700',
            marginBottom: 4,
          },
          tabBarStyle: tabBarStyle,
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeStack}
          options={{
            headerShown: false,
            tabBarIcon: ({ color, size, focused }) => (
              <View className={focused ? 'bg-orange-50 p-2 rounded-xl' : ''}>
                <Home color={color} size={size} strokeWidth={focused ? 2.5 : 2} />
              </View>
            ),
          }}
        />
        <Tab.Screen
          name="CartTab"
          component={CartStack}
          options={{
            headerShown: false,
            title: 'Giỏ hàng',
            tabBarIcon: ({ color, size, focused }) => (
              <View className={focused ? 'bg-orange-50 p-2 rounded-xl' : ''}>
                <ShoppingCart color={color} size={size} strokeWidth={focused ? 2.5 : 2} />
                <View className="absolute -top-1 -right-1 bg-primary w-4 h-4 rounded-full items-center justify-center border border-white">
                  <Text className="text-white text-[8px] font-bold">1</Text>
                </View>
              </View>
            ),
          }}
        />
        <Tab.Screen
          name="ChatTab"
          component={ChatStack}
          listeners={({ navigation }) => ({
            tabPress: (e) => {
              e.preventDefault();
              navigation.navigate('ChatTab', { screen: 'ConversationList' });
            },
          })}
          options={({ route }) => {
            const routeName = getFocusedRouteNameFromRoute(route) ?? 'ConversationList';
            return {
              headerShown: false,
              title: 'Chat',
              tabBarStyle: ['ChatDetail', 'GroupChatScreen', 'VideoCallModal', 'GroupVideoCallModal'].includes(routeName)
                ? { display: 'none' }
                : tabBarStyle,
              tabBarIcon: ({ color, size, focused }) => (
                <View className={focused ? 'bg-orange-50 p-2 rounded-xl' : ''}>
                  <MessageSquare color={color} size={size} strokeWidth={focused ? 2.5 : 2} />
                </View>
              ),
            };
          }}
        />
        <Tab.Screen
          name="ProfileTab"
          component={ProfileStack}
          options={{
            headerShown: false,
            title: 'Cá nhân',
            tabBarIcon: ({ color, size, focused }) => (
              <View className={focused ? 'bg-orange-50 p-2 rounded-xl' : ''}>
                <User color={color} size={size} strokeWidth={focused ? 2.5 : 2} />
              </View>
            ),
          }}
        />
      </Tab.Navigator>
      <GlobalCallOverlay />
    </>
  );
}
