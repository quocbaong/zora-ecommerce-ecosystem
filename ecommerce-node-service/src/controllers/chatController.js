const chatService = require('../services/chatService');

const createConversation = async (req, res) => {
  try {
    const { sellerId, productId } = req.body;
    if (!sellerId) {
      return res.status(400).json({ success: false, error: 'sellerId is required' });
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
    const conversations = await chatService.getConversations(req.userId, req.userRole);
    res.json({ success: true, data: conversations });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const getConversationDetail = async (req, res) => {
  try {
    const conversation = await chatService.getConversationDetail(req.params.id, req.userId);
    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }
    res.json({ success: true, data: conversation });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const getMessages = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const lastKey = req.query.lastKey || null;

    const result = await chatService.getMessages(req.params.id, req.userId, limit, lastKey);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const sendMessage = async (req, res) => {
  try {
    const { type, content } = req.body;
    if (!content) {
      return res.status(400).json({ success: false, error: 'content is required' });
    }

    const { message } = await chatService.sendMessage({
      conversationId: req.params.id,
      senderId: req.userId,
      senderRole: req.userRole,
      type: type || 'TEXT',
      content,
    });

    res.status(201).json({ success: true, data: message });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const markAsRead = async (req, res) => {
  try {
    await chatService.markAsRead(req.params.id, req.userId, req.userRole);
    res.json({ success: true, message: 'Marked as read' });
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
};
