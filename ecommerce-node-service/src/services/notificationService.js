const { producer, connectProducer } = require('../config/kafka');

const TOPIC = 'chat.message.sent';

const publishNewMessage = async ({ toUserId, fromUserId, conversationId, preview, type }) => {
  try {
    await connectProducer();

    const event = {
      event: 'NEW_MESSAGE',
      toUserId,
      fromUserId,
      conversationId,
      preview: preview ? preview.substring(0, 50) : '',
      type: type || 'TEXT',
      timestamp: Date.now(),
    };

    await producer.send({
      topic: TOPIC,
      messages: [
        {
          key: toUserId,
          value: JSON.stringify(event),
        },
      ],
    });

    console.log(`Kafka event sent to ${TOPIC}:`, event.event);
  } catch (err) {
    console.error('Failed to publish Kafka event:', err.message);
  }
};

module.exports = { publishNewMessage };
