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

const publishReportCreated = async (report) => {
  try {
    await connectProducer();
    const event = {
      event: 'REPORT_CREATED',
      reportId: report.reportId,
      reporterId: report.reporterId,
      reportedUserId: report.reportedUserId,
      conversationId: report.conversationId,
      reason: report.reason,
      timestamp: Date.now(),
    };
    await producer.send({
      topic: 'chat.report.created',
      messages: [
        {
          key: report.reportId,
          value: JSON.stringify(event),
        },
      ],
    });
    console.log(`Kafka event sent to chat.report.created:`, event.event);
  } catch (err) {
    console.error('Failed to publish Kafka event for report creation:', err.message);
  }
};

const publishUserBanned = async (userId, reason) => {
  try {
    await connectProducer();
    const event = {
      userId,
      email: null,
      name: null,
      reason: reason || "Vi phạm nhiều lần",
    };
    await producer.send({
      topic: 'user_banned',
      messages: [
        {
          key: userId,
          value: JSON.stringify(event),
        },
      ],
    });
    console.log(`Kafka event sent to user_banned:`, userId);
  } catch (err) {
    console.error('Failed to publish Kafka user_banned event:', err.message);
  }
};

const http = require('http');

const getUserEmail = (userId) => {
  return new Promise((resolve) => {
    const userUrl = process.env.USER_SERVICE_URL || (process.env.KAFKA_SERVER ? "http://user-service:8082" : "http://localhost:8082");
    const req = http.request(`${userUrl}/users/${userId}`, { method: 'GET' }, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try {
          const user = JSON.parse(data);
          resolve(user.email || null);
        } catch (e) {
          resolve(null);
        }
      });
    });
    req.on("error", () => resolve(null));
    req.end();
  });
};

const sendPersistentNotification = async (userId, type, title, message) => {
  const email = await getUserEmail(userId);
  return new Promise((resolve) => {
    const postData = JSON.stringify({ userId, type, title, message, email });

    const options = {
      hostname: 'notification-service',
      port: 8087,
      path: '/notifications',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      res.on('data', () => {});
      res.on('end', () => resolve(true));
    });

    req.on('error', (err) => {
      console.error('Failed to send persistent notification:', err.message);
      resolve(false);
    });

    req.write(postData);
    req.end();
  });
};

module.exports = { publishNewMessage, publishReportCreated, publishUserBanned, sendPersistentNotification };
