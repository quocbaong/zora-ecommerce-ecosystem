const conversationModel = require('../models/conversationModel');
const messageModel = require('../models/messageModel');
const { publishNewMessage } = require('./notificationService');

const getOrCreateConversation = async ({ userId, userRole, sellerId, productId }) => {
  let targetUserId, targetSellerId;

  if (userRole === 'SELLER') {
    targetSellerId = userId;
    targetUserId = sellerId;
  } else {
    targetUserId = userId;
    targetSellerId = sellerId;
  }

  const existing = await conversationModel.findExistingConversation({
    userId: targetUserId,
    sellerId: targetSellerId,
    productId,
  });

  if (existing) return existing;

  return conversationModel.createConversation({
    userId: targetUserId,
    sellerId: targetSellerId,
    productId,
  });
};

const getConversations = async (userId, role) => {
  if (role === 'SELLER') {
    return conversationModel.getConversationsBySeller(userId);
  }
  return conversationModel.getConversationsByUser(userId);
};

const getConversationDetail = async (conversationId, userId) => {
  const conv = await conversationModel.getConversationById(conversationId);
  if (!conv) return null;
  if (conv.userId !== userId && conv.sellerId !== userId) return null;
  return conv;
};

const sendMessage = async ({ conversationId, senderId, senderRole, type, content }) => {
  const conversation = await conversationModel.getConversationById(conversationId);
  if (!conversation) throw new Error('Conversation not found');

  if (conversation.userId !== senderId && conversation.sellerId !== senderId) {
    throw new Error('Access denied');
  }

  const message = await messageModel.createMessage({
    conversationId,
    senderId,
    senderRole,
    type,
    content,
  });

  await conversationModel.updateLastMessage(conversation, message);

  const recipientId = senderId === conversation.userId ? conversation.sellerId : conversation.userId;
  publishNewMessage({
    toUserId: recipientId,
    fromUserId: senderId,
    conversationId,
    preview: content,
    type,
  });

  return { message, conversation };
};

const getMessages = async (conversationId, userId, limit, lastKey) => {
  const conversation = await conversationModel.getConversationById(conversationId);
  if (!conversation) throw new Error('Conversation not found');
  if (conversation.userId !== userId && conversation.sellerId !== userId) {
    throw new Error('Access denied');
  }

  return messageModel.getMessages(conversationId, limit, lastKey);
};

const markAsRead = async (conversationId, userId, userRole) => {
  const conversation = await conversationModel.getConversationById(conversationId);
  if (!conversation) throw new Error('Conversation not found');
  if (conversation.userId !== userId && conversation.sellerId !== userId) {
    throw new Error('Access denied');
  }

  await conversationModel.resetUnread(conversation, userRole);
  return { success: true };
};

module.exports = {
  getOrCreateConversation,
  getConversations,
  getConversationDetail,
  sendMessage,
  getMessages,
  markAsRead,
};
