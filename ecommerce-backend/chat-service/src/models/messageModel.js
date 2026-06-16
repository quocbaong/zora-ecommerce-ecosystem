const { PutCommand, QueryCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('../config/dynamodb');
const { v4: uuidv4 } = require('uuid');
const { deleteFile } = require('../services/uploadService');

const TABLE = process.env.DYNAMODB_TABLE_MESSAGES || 'chat_messages';
const TTL_DAYS = 30;

const getTTL = () => Math.floor(Date.now() / 1000) + TTL_DAYS * 24 * 60 * 60;

const createMessage = async ({ conversationId, senderId, senderRole, type, content, isForwarded = false, forwardedFrom = null }) => {
  const messageId = uuidv4();
  const timestamp = new Date().toISOString();

  const item = {
    PK: `CONV#${conversationId}`,
    SK: `MSG#${timestamp}#${messageId}`,
    conversationId,
    messageId,
    senderId,
    senderRole,
    type: type || 'TEXT',
    content,
    recalled: false,
    isDeleted: false,
    reactions: {},
    readBy: [senderId],
    isForwarded: !!isForwarded,
    forwardedFrom: forwardedFrom || null,
    createdAt: timestamp,
    ttl: getTTL(),
  };

  await docClient.send(new PutCommand({ TableName: TABLE, Item: item }));
  return item;
};

const getMessages = async (conversationId, userId, limit = 20, lastKey = null, clearedAt = 0) => {
  const params = {
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
    ExpressionAttributeValues: {
      ':pk': `CONV#${conversationId}`,
      ':skPrefix': 'MSG#',
    },
    ScanIndexForward: false,
    Limit: limit,
  };

  if (lastKey) {
    params.ExclusiveStartKey = JSON.parse(Buffer.from(lastKey, 'base64').toString());
  }

  const result = await docClient.send(new QueryCommand(params));

  let nextKey = null;
  if (result.LastEvaluatedKey) {
    nextKey = Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64');
  }

  console.log('GET MESSAGES result.Items length:', result.Items ? result.Items.length : 0);
  console.log('Parameters:', { conversationId, userId, limit, lastKey, clearedAt });
  return {
    messages: (result.Items || [])
      .map(item => {
        if (!item.createdAt && item.SK) {
          const parts = item.SK.split('#');
          if (parts.length >= 2) item.createdAt = parts[1];
        }
        return item;
      })
      .filter(item => {
        if (item.isDeleted) return false;
        if (item.deletedBy && item.deletedBy.includes(userId)) return false;
        if (clearedAt > 0 && item.createdAt) {
          const time = new Date(item.createdAt).getTime();
          if (!isNaN(time) && time < clearedAt) return false;
        }
        return true;
      })
      .reverse(),
    nextKey,
  };
};

// Find a single message by messageId within a conversation (query by PK, filter by messageId)
const getMessageById = async (conversationId, messageId) => {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      FilterExpression: 'messageId = :mid',
      ExpressionAttributeValues: {
        ':pk': `CONV#${conversationId}`,
        ':skPrefix': 'MSG#',
        ':mid': messageId,
      },
      Limit: 100,
    })
  );
  return result.Items && result.Items.length > 0 ? result.Items[0] : null;
};

const recallMessage = async (conversationId, messageId) => {
  const msg = await getMessageById(conversationId, messageId);
  if (!msg) return null;

  // If message is IMAGE or VIDEO, delete file from S3
  console.log('[recallMessage] msg.type:', msg.type, '| msg.content:', msg.content?.substring(0, 80));
  if ((msg.type === 'IMAGE' || msg.type === 'VIDEO') && msg.content) {
    console.log('[recallMessage] Deleting S3 file for', msg.type, 'message...');
    await deleteFile(msg.content);
  }

  await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { PK: msg.PK, SK: msg.SK },
      UpdateExpression: 'SET recalled = :t, content = :c',
      ExpressionAttributeValues: { ':t': true, ':c': '' },
    })
  );
  return { ...msg, recalled: true, content: '' };
};

const softDeleteMessage = async (conversationId, messageId, userId) => {
  const msg = await getMessageById(conversationId, messageId);
  if (!msg) return null;

  const currentDeletedBy = msg.deletedBy || [];
  if (!currentDeletedBy.includes(userId)) {
    currentDeletedBy.push(userId);
  }

  await docClient.send(new UpdateCommand({
    TableName: TABLE,
    Key: { PK: msg.PK, SK: msg.SK },
    UpdateExpression: 'SET deletedBy = :db',
    ExpressionAttributeValues: { ':db': currentDeletedBy },
  }));
  return { messageId, isDeleted: true };
};

const addReaction = async (conversationId, messageId, emoji, userId) => {
  const msg = await getMessageById(conversationId, messageId);
  if (!msg) return null;
  // reactions is a map { emoji: [userId, ...] }
  const existing = (msg.reactions || {})[emoji] || [];
  const alreadyReacted = existing.includes(userId);
  let updatedList;
  if (alreadyReacted) {
    // Toggle off
    updatedList = existing.filter((id) => id !== userId);
  } else {
    updatedList = [...existing, userId];
  }
  const newReactions = { ...(msg.reactions || {}), [emoji]: updatedList };
  // Clean up empty arrays
  if (newReactions[emoji].length === 0) delete newReactions[emoji];

  await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { PK: msg.PK, SK: msg.SK },
      UpdateExpression: 'SET reactions = :r',
      ExpressionAttributeValues: { ':r': newReactions },
    })
  );
  return { messageId, reactions: newReactions };
};

module.exports = {
  createMessage,
  getMessages,
  getMessageById,
  recallMessage,
  softDeleteMessage,
  addReaction,
};
