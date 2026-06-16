import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator,
  Modal,
  ScrollView,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Send, Sparkles, Bot, Clock, RotateCcw, X, Trash2 } from 'lucide-react-native';
import { COLORS } from '../../constants';
import { useAiChat } from '../../features/ai/hooks/useAiChat';
import AiMessageBubble from '../../features/ai/components/AiMessageBubble';
import { useAuthStore } from '../../store/authStore';

export default function AiChatScreen({ navigation }: any) {
  const { messages, loading, sendMessage, newConversation, loadHistory, openConversation, conversations, deleteAllHistory } = useAiChat();
  const [text, setText] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const [showHistory, setShowHistory] = useState(false);
  const user = useAuthStore((s) => s.user);
  const isSeller = user?.role?.toUpperCase() === 'SELLER';

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleSend = () => {
    if (text.trim() && !loading) {
      sendMessage(text);
      setText('');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 z-10" style={{ backgroundColor: '#0A2540' }}>
        <TouchableOpacity 
          onPress={() => navigation.navigate('ConversationList')}
          className="w-8 h-8 rounded-full items-center justify-center mr-2"
        >
          <ChevronLeft color="#ffffff" size={24} />
        </TouchableOpacity>
        
        <View className="w-10 h-10 rounded-full items-center justify-center mr-3" style={{ backgroundColor: '#FF6B35' }}>
          <Bot color="#ffffff" size={20} />
        </View>

        <View className="flex-1">
          <Text className="text-white font-bold text-base leading-tight">ZORA AI</Text>
          <View className="flex-row items-center mt-0.5">
            <View className="w-2 h-2 rounded-full bg-green-400 mr-1" />
            <Text className="text-white/60 text-xs">Đang hoạt động</Text>
          </View>
        </View>

        {/* Nút Lịch sử (dự phòng cho tính năng sau này nếu bạn muốn mở Drawer) */}
        <TouchableOpacity 
          onPress={() => setShowHistory(true)}
          className="w-8 h-8 rounded-full items-center justify-center mr-2"
        >
          <Clock color="rgba(255,255,255,0.6)" size={20} />
        </TouchableOpacity>

        {/* Nút Làm mới (Tạo hội thoại mới) */}
        <TouchableOpacity 
          onPress={newConversation}
          className="w-8 h-8 rounded-full items-center justify-center"
        >
          <RotateCcw color="rgba(255,255,255,0.6)" size={18} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          ref={flatListRef}
          data={[...messages].reverse()}
          inverted
          keyExtractor={(_, index) => index.toString()}
          contentContainerStyle={{ padding: 16, flexGrow: 1, justifyContent: 'flex-end' }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <AiMessageBubble 
              role={item.role} 
              content={item.content} 
              time={item.time} 
            />
          )}
          ListHeaderComponent={
            loading ? (
              <View className="flex-row mb-4 items-end max-w-[85%]">
                <View className="w-7 h-7 rounded-full bg-primary items-center justify-center mr-2">
                  <Sparkles size={16} color="#fff" />
                </View>
                <View className="bg-gray-100 px-4 py-3 rounded-3xl rounded-bl-sm flex-row items-center justify-center min-w-[60px]">
                  <ActivityIndicator size="small" color={COLORS.primary} />
                </View>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-10 scale-y-[-1]">
              <View className="w-16 h-16 rounded-full items-center justify-center mb-4" style={{ backgroundColor: '#FF6B3520' }}>
                <Bot size={32} color="#FF6B35" />
              </View>
              <Text className="text-secondary font-bold text-lg">Xin chào! Tôi là ZORA AI</Text>
              <Text className="text-gray-400 text-center text-xs mt-2 px-8 mb-6 leading-5">
                {isSeller
                  ? 'Hỏi tôi về thống kê shop, đơn hàng, chính sách sàn...'
                  : 'Hỏi tôi về đơn hàng, sản phẩm, chính sách đổi trả...'}
              </Text>

              <View className="w-full px-6 flex-col">
                {(isSeller
                  ? ['Thống kê doanh thu shop?', 'Đơn hàng cần xác nhận?', 'Chính sách Seller?']
                  : ['Chính sách đổi trả?', 'Theo dõi đơn hàng ở đâu?', 'Thời gian giao hàng?']
                ).map((q, idx) => (
                  <TouchableOpacity 
                    key={idx}
                    onPress={() => {
                      if (!loading) sendMessage(q);
                    }}
                    className="mb-3 px-4 py-3 rounded-full border items-start"
                    style={{ borderColor: 'rgba(255, 107, 53, 0.4)', backgroundColor: 'rgba(255, 107, 53, 0.08)' }}
                  >
                    <Text className="text-xs font-medium" style={{ color: '#FF6B35' }}>
                      {q}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          }
        />

        {/* Input Area */}
        <View className="px-4 py-3 bg-white border-t border-gray-100 flex-row items-center">
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Hỏi ZORA AI điều gì đó..."
            placeholderTextColor="#9ca3af"
            multiline
            className="flex-1 bg-gray-50 rounded-3xl px-5 py-3.5 max-h-32 text-secondary"
            style={{ paddingTop: 14 }}
          />
          <TouchableOpacity 
            onPress={handleSend}
            disabled={!text.trim() || loading}
            className={`ml-3 w-12 h-12 rounded-full items-center justify-center ${
              text.trim() && !loading ? 'bg-primary' : 'bg-gray-200'
            }`}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Send size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Lịch sử Modal */}
      <Modal visible={showHistory} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowHistory(false)}>
        <SafeAreaView className="flex-1 bg-[#F4F5F7]">
          <View className="flex-row items-center justify-between px-4 py-3 bg-[#0A2540]">
            <Text className="text-white font-bold text-lg">Lịch sử trò chuyện</Text>
            <TouchableOpacity onPress={() => setShowHistory(false)} className="p-2">
              <X color="#fff" size={24} />
            </TouchableOpacity>
          </View>
          <ScrollView className="flex-1">
            {conversations.length === 0 ? (
              <View className="flex-1 items-center justify-center py-20">
                <Clock size={40} color="#cbd5e1" />
                <Text className="text-gray-400 mt-4">Chưa có cuộc trò chuyện nào</Text>
              </View>
            ) : (
              conversations.map((conv) => (
                <TouchableOpacity 
                  key={conv.id} 
                  onPress={() => {
                    openConversation(conv);
                    setShowHistory(false);
                  }}
                  className="flex-row items-center px-4 py-4 bg-white border-b border-gray-100"
                >
                  <View className="w-10 h-10 rounded-full items-center justify-center bg-orange-50 mr-3">
                    <Bot color="#FF6B35" size={20} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-secondary font-bold text-sm" numberOfLines={1}>{conv.title}</Text>
                    <Text className="text-gray-400 text-xs mt-1">Cập nhật: {new Date(conv.updatedAt).toLocaleString('vi-VN')}</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>

          {conversations.length > 0 && (
            <View className="p-4 bg-white border-t border-gray-200 flex-row justify-between">
              <TouchableOpacity 
                onPress={() => {
                  Alert.alert(
                    "Xác nhận xoá", 
                    "Xoá toàn bộ lịch sử trò chuyện AI?", 
                    [
                      { text: "Hủy", style: "cancel" },
                      { 
                        text: "Xoá hết", 
                        style: "destructive",
                        onPress: async () => {
                          await deleteAllHistory();
                          setShowHistory(false);
                        }
                      }
                    ]
                  );
                }}
                className="flex-row items-center bg-red-50 px-4 py-3 rounded-xl"
              >
                <Trash2 color="#ef4444" size={20} />
                <Text className="text-red-500 font-bold ml-2">Xoá tất cả</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => {
                  newConversation();
                  setShowHistory(false);
                }}
                className="flex-row items-center bg-primary px-4 py-3 rounded-xl"
              >
                <RotateCcw color="#fff" size={20} />
                <Text className="text-white font-bold ml-2">Chat mới</Text>
              </TouchableOpacity>
            </View>
          )}
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}
