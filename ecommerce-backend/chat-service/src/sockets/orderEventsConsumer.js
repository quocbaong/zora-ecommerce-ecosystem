const { kafka } = require('../config/kafka');
const reportService = require('../services/reportService');

/**
 * Kafka consumer cho topic `order_update` từ order-service.
 * Payload: { orderId, userId, status }
 * Phát Socket.IO event `order_status_updated` cho client để invalidate cache
 * và render lại INVOICE/ORDER card với status mới.
 *
 * Broadcast tới tất cả socket — payload chỉ {orderId, status} nhẹ, client tự lọc
 * (chỉ component đang render card đúng orderId mới re-fetch). Đỡ phải lookup
 * sellerIds từ order-service.
 */
const registerOrderEventsConsumer = async (io) => {
  const consumer = kafka.consumer({ groupId: 'chat-service-order-events' });
  try {
    await consumer.connect();
    await consumer.subscribe({ topic: 'order_update', fromBeginning: false });
    await consumer.subscribe({ topic: 'user_unbanned', fromBeginning: false });
    await consumer.subscribe({ topic: 'USER_CHAT_BANNED', fromBeginning: false });

    await consumer.run({
      eachMessage: async ({ topic, message }) => {
        try {
          const raw = message.value?.toString();
          if (!raw) return;
          const event = JSON.parse(raw);
          if (topic === 'user_unbanned') {
            const { userId } = event;
            if (userId) {
              await reportService.unbanUser(userId);
              console.log(`[KAFKA] user_unbanned processed for userId=${userId}`);
            }
            return;
          }

          if (topic === 'USER_CHAT_BANNED') {
            const { userId, chatBanUntil } = event;
            if (userId && chatBanUntil) {
              await reportService.updateUserChatBan(userId, chatBanUntil);
              console.log(`[KAFKA] USER_CHAT_BANNED processed for userId=${userId}, until=${chatBanUntil}`);
            }
            return;
          }

          const { orderId, userId, status } = event;
          if (!orderId || !status) return;

          io.emit('order_status_updated', { orderId, status, userId });
          console.log(`[KAFKA] order_status_updated relayed: orderId=${orderId} status=${status}`);
        } catch (err) {
          console.error('[KAFKA] order_update parse error:', err.message);
        }
      },
    });

    console.log('[KAFKA] order_update consumer started');
  } catch (err) {
    console.error('[KAFKA] order_update consumer failed to start:', err.message);
  }
};

module.exports = { registerOrderEventsConsumer };
