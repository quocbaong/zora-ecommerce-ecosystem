import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Sparkles, User } from 'lucide-react-native';
import { COLORS } from '../../../constants';
import dayjs from 'dayjs';

interface AiMessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  time: Date;
}

export default function AiMessageBubble({ role, content, time }: AiMessageBubbleProps) {
  const isUser = role === 'user';

  return (
    <View style={[styles.container, isUser ? styles.containerUser : styles.containerBot]}>
      {!isUser && (
        <View style={styles.botAvatar}>
          <Sparkles size={16} color="#fff" />
        </View>
      )}
      
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleBot]}>
        <Text style={[styles.text, isUser ? styles.textUser : styles.textBot]}>
          {content}
        </Text>
        <Text style={[styles.time, isUser ? styles.timeUser : styles.timeBot]}>
          {dayjs(time).format('HH:mm')}
        </Text>
      </View>

      {isUser && (
        <View style={styles.userAvatar}>
          <User size={16} color="#9ca3af" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
    maxWidth: '85%',
  },
  containerUser: {
    alignSelf: 'flex-end',
  },
  containerBot: {
    alignSelf: 'flex-start',
  },
  botAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  userAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
  },
  bubbleUser: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  bubbleBot: {
    backgroundColor: '#f3f4f6',
    borderBottomLeftRadius: 4,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
  },
  textUser: {
    color: '#ffffff',
  },
  textBot: {
    color: '#374151',
  },
  time: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  timeUser: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  timeBot: {
    color: '#9ca3af',
  },
});
