import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import ConversationListScreen from '../screens/chat/ConversationListScreen';
import ChatScreen from '../screens/chat/ChatScreen';
import GroupChatScreen from '../screens/chat/GroupChatScreen';
import CreateGroupScreen from '../screens/chat/CreateGroupScreen';
import FriendsScreen from '../screens/chat/FriendsScreen';
import MyQRCodeScreen from '../screens/chat/MyQRCodeScreen';
import GroupQRCodeScreen from '../screens/chat/GroupQRCodeScreen';
import QRScannerScreen from '../screens/chat/QRScannerScreen';
import VideoCallModal from '../features/chat/components/VideoCallModal';
import GroupVideoCallModal from '../features/chat/components/GroupVideoCallModal';
import AiChatScreen from '../screens/chat/AiChatScreen';

const Stack = createStackNavigator();

export default function ChatStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ConversationList" component={ConversationListScreen} />
      <Stack.Screen name="ChatDetail" component={ChatScreen} />
      <Stack.Screen name="GroupChatScreen" component={GroupChatScreen} />
      <Stack.Screen name="CreateGroup" component={CreateGroupScreen} />
      <Stack.Screen name="FriendsScreen" component={FriendsScreen} />
      <Stack.Screen name="MyQRCodeScreen" component={MyQRCodeScreen} />
      <Stack.Screen name="GroupQRCodeScreen" component={GroupQRCodeScreen} />
      <Stack.Screen name="QRScannerScreen" component={QRScannerScreen} />
      <Stack.Screen name="AiChatScreen" component={AiChatScreen} />
      <Stack.Screen 
        name="VideoCallModal" 
        component={VideoCallModal} 
        options={{ presentation: 'modal' }} 
      />
      <Stack.Screen 
        name="GroupVideoCallModal" 
        component={GroupVideoCallModal} 
        options={{ presentation: 'modal' }} 
      />
    </Stack.Navigator>
  );
}
