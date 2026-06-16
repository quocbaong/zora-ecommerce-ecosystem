const faqModel = require('../models/faqModel');
const conversationModel = require('../models/conversationModel');
const messageModel = require('../models/messageModel');
const { getIO } = require('../config/socket');

const MAX_FAQS = 7;

/** GET /faqs/:sellerId — public, fetch FAQ list for a seller */
const getSellerFaqs = async (req, res) => {
  try {
    const { sellerId } = req.params;
    const faqs = await faqModel.getFaqs(sellerId);
    res.json({ success: true, data: faqs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/** PUT /faqs — seller saves/replaces their FAQ list */
const saveSellerFaqs = async (req, res) => {
  try {
    const sellerId = req.userId;
    const { faqs } = req.body;

    if (!Array.isArray(faqs)) {
      return res.status(400).json({ success: false, error: 'faqs must be an array' });
    }

    const valid = faqs
      .filter((f) => f.question?.trim() && f.answer?.trim())
      .slice(0, MAX_FAQS);

    const saved = await faqModel.saveFaqs(sellerId, valid);
    res.json({ success: true, data: saved });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * POST /conversations/:id/faq-reply — user triggers auto-reply from seller.
 * Backend tìm FAQ → gửi answer như tin nhắn từ sellerId.
 */
const triggerFaqReply = async (req, res) => {
  try {
    const conversationId = req.params.id;
    const { faqId } = req.body;
    const userId = req.userId;

    if (!faqId) {
      return res.status(400).json({ success: false, error: 'faqId is required' });
    }

    // Lấy thông tin conversation để biết sellerId
    let conversation = await conversationModel.getUserConversationRecord(userId, conversationId);
    if (!conversation) {
      conversation = await conversationModel.getConversationById(conversationId);
    }
    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    const sellerId = conversation.sellerId;
    if (!sellerId) {
      return res.status(400).json({ success: false, error: 'Not a shop conversation' });
    }

    // Tìm FAQ answer
    const faq = await faqModel.getFaqById(sellerId, faqId);
    if (!faq) {
      return res.status(404).json({ success: false, error: 'FAQ not found' });
    }

    // Gửi tin nhắn từ sellerId
    const message = await messageModel.createMessage({
      conversationId,
      senderId: sellerId,
      senderRole: 'SELLER',
      type: 'TEXT',
      content: faq.answer,
    });

    // Cập nhật lastMessage (seller gửi → tăng unreadUser)
    await conversationModel.updateLastMessage(conversation, message);

    // Emit real-time qua WebSocket — giống sendMessage
    try {
      const io = getIO();
      const payload = { message: { ...message, conversationId } };

      io.to(conversationId).emit('new_message', payload);
      io.to(`user:${sellerId}`).emit('new_message', payload);
      io.to(`user:${userId}`).emit('new_message', payload);

      io.to(`user:${userId}`).emit('new_notification', {
        conversationId,
        fromUserId: sellerId,
        fromRole: 'SELLER',
        preview: faq.answer.substring(0, 50),
        type: 'TEXT',
        timestamp: message.createdAt,
      });
    } catch (e) {
      console.error('[FAQ] emit error:', e?.message);
    }

    res.status(201).json({ success: true, data: message });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { getSellerFaqs, saveSellerFaqs, triggerFaqReply };
