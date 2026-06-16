const conversationModel = require('../models/conversationModel');
const messageModel = require('../models/messageModel');
const reportService = require('./reportService');

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
  });

  if (existing) return existing;

  return conversationModel.createConversation({
    userId: targetUserId,
    sellerId: targetSellerId,
    productId,
  });
};

const getConversations = async (userId, role) => {
  // Always fetch conversations where user is the "userId" owner (includes DIRECT convs)
  const userConvs = await conversationModel.getConversationsByUser(userId);

  if (role === 'SELLER') {
    // Also fetch PRODUCT conversations where user is the seller (via GSI1)
    const sellerConvs = await conversationModel.getConversationsBySeller(userId);
    const productSellerConvs = sellerConvs.filter((c) => c.conversationType !== 'DIRECT');

    // Merge, deduplicate by conversationId
    const seen = new Set();
    const merged = [...productSellerConvs, ...userConvs];
    return merged.filter((c) => {
      const id = c.conversationId;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }

  return userConvs;
};

const getConversationDetail = async (conversationId, userId) => {
  // Try fast GetItem from user's perspective first
  const userRecord = await conversationModel.getUserConversationRecord(userId, conversationId);
  if (userRecord) return userRecord;

  // Fallback: scan (for PRODUCT conversations where userId might be sellerId in the record)
  const conv = await conversationModel.getConversationById(conversationId);
  if (!conv) return null;
  if (conv.userId !== userId && conv.sellerId !== userId) return null;
  return conv;
};

const sendMessage = async ({ conversationId, senderId, senderRole, type, content, isForwarded = false, forwardedFrom = null }) => {
  // Check banned/muted status of sender
  const userMetadata = await reportService.getUserMetadata(senderId);
  if (userMetadata) {
    if (userMetadata.banned) {
      const err = new Error("Tài khoản của bạn đã bị khóa.");
      err.status = 403;
      throw err;
    }
    if (userMetadata.mutedUntil && new Date(userMetadata.mutedUntil) > new Date()) {
      const err = new Error(`Bạn đang bị hạn chế chat đến ${new Date(userMetadata.mutedUntil).toLocaleString('vi-VN')}`);
      err.status = 403;
      throw err;
    }
  }

  let conversation = await conversationModel.getUserConversationRecord(senderId, conversationId);

  if (!conversation || !conversation.userId || !conversation.sellerId) {
    conversation = await conversationModel.getConversationById(conversationId);
    if (!conversation) throw new Error('Conversation not found');
    if (conversation.userId !== senderId && conversation.sellerId !== senderId) {
      throw new Error('Access denied');
    }
  }

  // Check banned status of recipient
  const recipientId = senderId === conversation.userId ? conversation.sellerId : conversation.userId;
  if (recipientId) {
    const recipientMetadata = await reportService.getUserMetadata(recipientId);
    if (recipientMetadata && recipientMetadata.banned) {
      const err = new Error("Không thể gửi tin nhắn vì tài khoản người nhận đang bị khóa.");
      err.status = 403;
      throw err;
    }
  }

  const message = await messageModel.createMessage({
    conversationId,
    senderId,
    senderRole,
    type,
    content,
    isForwarded,
    forwardedFrom,
  });

  if (conversation.conversationType === 'DIRECT') {
    await conversationModel.updateDirectLastMessage(conversationId, senderId, recipientId, message);
  } else {
    await conversationModel.updateLastMessage(conversation, message);
  }

  return { message, conversation };
};

const getMessages = async (conversationId, userId, limit, lastKey) => {
  let record = await conversationModel.getUserConversationRecord(userId, conversationId);
  if (!record) {
    record = await conversationModel.getConversationById(conversationId);
    if (!record || (record.userId !== userId && record.sellerId !== userId)) {
      throw new Error('Access denied');
    }
  }

  const clearedAtField = `clearedAt_${(userId || '').replace(/[^a-zA-Z0-9_]/g, '')}`;
  const clearedAt = (record && record[clearedAtField]) || 0;

  return messageModel.getMessages(conversationId, userId, limit, lastKey, clearedAt);
};

const recallMessage = async (conversationId, messageId, userId) => {
  const userRecord = await conversationModel.getUserConversationRecord(userId, conversationId);
  if (!userRecord) {
    const conv = await conversationModel.getConversationById(conversationId);
    if (!conv || (conv.userId !== userId && conv.sellerId !== userId)) {
      throw new Error('Access denied');
    }
  }
  const msg = await messageModel.getMessageById(conversationId, messageId);
  if (!msg) return null;
  if (msg.senderId !== userId) throw new Error('Access denied');
  return messageModel.recallMessage(conversationId, messageId);
};

const deleteMessage = async (conversationId, messageId, userId) => {
  const userRecord = await conversationModel.getUserConversationRecord(userId, conversationId);
  if (!userRecord) {
    const conv = await conversationModel.getConversationById(conversationId);
    if (!conv || (conv.userId !== userId && conv.sellerId !== userId)) {
      throw new Error('Access denied');
    }
  }
  return messageModel.softDeleteMessage(conversationId, messageId, userId);
};

const addReaction = async (conversationId, messageId, emoji, userId) => {
  const userRecord = await conversationModel.getUserConversationRecord(userId, conversationId);
  if (!userRecord) {
    const conv = await conversationModel.getConversationById(conversationId);
    if (!conv || (conv.userId !== userId && conv.sellerId !== userId)) {
      throw new Error('Access denied');
    }
  }
  return messageModel.addReaction(conversationId, messageId, emoji, userId);
};

const markAsRead = async (conversationId, userId, userRole) => {
  const userRecord = await conversationModel.getUserConversationRecord(userId, conversationId);

  if (userRecord) {
    if (userRecord.conversationType === 'DIRECT') {
      await conversationModel.resetDirectUnread(userId, conversationId);
    } else {
      await conversationModel.resetUnread(userRecord, userRole);
    }
    return { success: true };
  }

  // Fallback for PRODUCT convs (seller record found via scan)
  const conv = await conversationModel.getConversationById(conversationId);
  if (!conv) throw new Error('Conversation not found');
  await conversationModel.resetUnread(conv, userRole);
  return { success: true };
};

const deleteConversation = async (conversationId, userId) => {
  return conversationModel.deleteConversation(conversationId, userId);
};

module.exports = {
  getOrCreateConversation,
  getConversations,
  getConversationDetail,
  sendMessage,
  getMessages,
  markAsRead,
  recallMessage,
  deleteMessage,
  deleteConversation,
  addReaction,
};