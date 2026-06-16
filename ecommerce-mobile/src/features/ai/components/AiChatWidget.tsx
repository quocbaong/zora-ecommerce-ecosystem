import React from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { Bot } from 'lucide-react-native';
import { COLORS } from '../../../constants';
import * as NavigationService from '../../../navigation/navigationRef';

export default function AiChatWidget() {
  return (
    <TouchableOpacity 
      activeOpacity={0.8}
      onPress={() => NavigationService.navigate('ChatTab', { screen: 'AiChatScreen' })}
      style={styles.container}
    >
      <View style={styles.button}>
        <Bot color="#ffffff" size={28} strokeWidth={2} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 30, // Điều chỉnh độ cao so với Bottom Tab
    right: 20,
    zIndex: 999,
  },
  button: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF6B35', // Màu cam nổi bật tương tự hình
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  }
});
