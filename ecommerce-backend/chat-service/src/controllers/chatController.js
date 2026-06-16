const chatService = require("../services/chatService");
const reportService = require("../services/reportService");
const { getIO } = require("../config/socket");

const createConversation = async (req, res) => {
  try {
    const { sellerId, productId } = req.body;
    if (!sellerId) {
      return res
        .status(400)
        .json({ success: false, error: "sellerId is required" });
    }

    const conversation = await chatService.getOrCreateConversation({
      userId: req.userId,
      userRole: req.userRole,
      sellerId,
      productId,
    });

    res.status(201).json({ success: true, data: conversation });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const getConversations = async (req, res) => {
  try {
    const userMeta = await reportService.getUserMetadata(req.userId);
    if (userMeta && userMeta.banned) {
      return res.status(403).json({ success: false, error: "Tài khoản của bạn đã bị khóa vĩnh viễn." });
    }

    const conversations = await chatService.getConversations(
      req.userId,
      req.userRole,
    );
    res.json(conversations);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const getConversationDetail = async (req, res) => {
  try {
    const userMeta = await reportService.getUserMetadata(req.userId);
    if (userMeta && userMeta.banned) {
      return res.status(403).json({ success: false, error: "Tài khoản của bạn đã bị khóa vĩnh viễn." });
    }

    const conversation = await chatService.getConversationDetail(
      req.params.id,
      req.userId,
    );
    if (!conversation) {
      return res
        .status(404)
        .json({ success: false, error: "Conversation not found" });
    }
    res.json({ success: true, data: conversation });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const getMessages = async (req, res) => {
  try {
    const userMeta = await reportService.getUserMetadata(req.userId);
    if (userMeta && userMeta.banned) {
      return res.status(403).json({ success: false, error: "Tài khoản của bạn đã bị khóa vĩnh viễn." });
    }

    const limit = parseInt(req.query.limit) || 20;
    const lastKey = req.query.lastKey || null;

    const result = await chatService.getMessages(
      req.params.id,
      req.userId,
      limit,
      lastKey,
    );
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const sendMessage = async (req, res) => {
  try {
    const { type, content, isForwarded, forwardedFrom } = req.body;
    if (!content) {
      return res
        .status(400)
        .json({ success: false, error: "content is required" });
    }

    const userMeta = await reportService.getUserMetadata(req.userId);
    if (userMeta && userMeta.mutedUntil && new Date(userMeta.mutedUntil) > new Date()) {
        return res.status(403).json({ success: false, error: "Bạn đã bị cấm chat đến " + new Date(userMeta.mutedUntil).toLocaleString() });
    }

    const { message, conversation } = await chatService.sendMessage({
      conversationId: req.params.id,
      senderId: req.userId,
      senderRole: req.userRole,
      type: type || "TEXT",
      content,
      isForwarded: !!isForwarded,
      forwardedFrom: forwardedFrom || null,
    });

    // Emit real-time events via WebSocket
    try {
      const io = getIO();
      const conversationId = req.params.id;

      const recipientId =
        req.userId === conversation.userId
          ? conversation.sellerId
          : conversation.userId;

      // The message payload includes conversationId so the frontend can route it correctly
      const payload = { message: { ...message, conversationId } };

      // 1. Push to conversation room (both users who have opened this chat)
      io.to(conversationId).emit('new_message', payload);

      // 2. Push to each participant's personal room so they receive it
      //    even when they're viewing a different conversation or the chat list.
      io.to(`user:${req.userId}`).emit('new_message', payload);
      io.to(`user:${recipientId}`).emit('new_message', payload);

      // 3. Push new_notification to recipient for unread badge
      io.to(`user:${recipientId}`).emit('new_notification', {
        conversationId,
        fromUserId: req.userId,
        fromRole: req.userRole,
        preview: typeof content === 'string' ? content.substring(0, 50) : '',
        type: type || 'TEXT',
        timestamp: message.createdAt,
      });
    } catch (e) {
      console.error('[CHAT] sendMessage emit error:', e?.message);
    }

    res.status(201).json({ success: true, data: message });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ success: false, error: err.message });
  }
};

const markAsRead = async (req, res) => {
  try {
    await chatService.markAsRead(req.params.id, req.userId, req.userRole);
    res.json({ success: true, message: "Marked as read" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const recallMessage = async (req, res) => {
  try {
    const { id: conversationId, msgId } = req.params;
    const result = await chatService.recallMessage(conversationId, msgId, req.userId);
    if (!result) return res.status(404).json({ success: false, error: "Message not found" });

    // Broadcast to conversation room
    try {
      const io = getIO();
      io.to(conversationId).emit("message_recalled", { conversationId, messageId: msgId });
    } catch (_) {}

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(err.message === "Access denied" ? 403 : 500).json({ success: false, error: err.message });
  }
};

const deleteConversation = async (req, res) => {
  try {
    const { id } = req.params;
    await chatService.deleteConversation(id, req.userId);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const deleteMessage = async (req, res) => {
  try {
    const { id: conversationId, msgId } = req.params;
    const result = await chatService.deleteMessage(conversationId, msgId, req.userId);
    if (!result) return res.status(404).json({ success: false, error: 'Message not found' });
    res.json({ success: true, data: result });
  } catch (err) {
    const status = err.message === 'Access denied' ? 403 : 500;
    res.status(status).json({ success: false, error: err.message });
  }
};

const addReaction = async (req, res) => {
  try {
    const { id: conversationId, msgId } = req.params;
    const { emoji } = req.body;
    if (!emoji) return res.status(400).json({ success: false, error: "emoji is required" });

    const result = await chatService.addReaction(conversationId, msgId, emoji, req.userId);
    if (!result) return res.status(404).json({ success: false, error: "Message not found" });

    // Broadcast to conversation room
    try {
      const io = getIO();
      io.to(conversationId).emit("reaction_updated", { conversationId, messageId: msgId, reactions: result.reactions });
    } catch (_) {}

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  createConversation,
  getConversations,
  getConversationDetail,
  getMessages,
  sendMessage,
  markAsRead,
  recallMessage,
  deleteMessage,
  deleteConversation,
  addReaction,
};
