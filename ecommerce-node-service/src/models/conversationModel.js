const { PutCommand, QueryCommand, GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('../config/dynamodb');
const { v4: uuidv4 } = require('uuid');

const TABLE = process.env.DYNAMODB_TABLE_CONVERSATIONS || 'chat_conversations';
const TTL_DAYS = 30;

const getTTL = () => Math.floor(Date.now() / 1000) + TTL_DAYS * 24 * 60 * 60;

const createConversation = async ({ userId, sellerId, productId }) => {
  const conversationId = uuidv4();
  const now = Date.now();

  const item = {
    PK: `USER#${userId}`,
    SK: `CONV#${conversationId}`,
    conversationId,
    sellerId,
    userId,
    productId: productId || null,
    lastMessage: '',
    lastMessageAt: now,
    unreadUser: 0,
    unreadSeller: 0,
    ttl: getTTL(),
    GSI1PK: `SELLER#${sellerId}`,
    GSI1SK: `CONV#${conversationId}`,
  };

  await docClient.send(new PutCommand({ TableName: TABLE, Item: item }));
  return item;
};

const findExistingConversation = async ({ userId, sellerId, productId }) => {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      FilterExpression: 'sellerId = :sellerId' + (productId ? ' AND productId = :productId' : ''),
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':skPrefix': 'CONV#',
        ':sellerId': sellerId,
        ...(productId ? { ':productId': productId } : {}),
      },
    })
  );
  return result.Items && result.Items.length > 0 ? result.Items[0] : null;
};

const getConversationsByUser = async (userId) => {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':skPrefix': 'CONV#',
      },
      ScanIndexForward: false,
    })
  );
  return result.Items || [];
};

const getConversationsBySeller = async (sellerId) => {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk AND begins_with(GSI1SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': `SELLER#${sellerId}`,
        ':skPrefix': 'CONV#',
      },
      ScanIndexForward: false,
    })
  );
  return result.Items || [];
};

const getConversationById = async (conversationId) => {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = begins_with(GSI1PK, :prefix)',
      FilterExpression: 'conversationId = :convId',
      ExpressionAttributeValues: {
        ':prefix': 'SELLER#',
        ':convId': conversationId,
      },
      Limit: 1,
    })
  );

  if (result.Items && result.Items.length > 0) {
    return result.Items[0];
  }
  return null;
};

const scanConversationById = async (conversationId) => {
  const { ScanCommand } = require('@aws-sdk/lib-dynamodb');
  const result = await docClient.send(
    new ScanCommand({
      TableName: TABLE,
      FilterExpression: 'conversationId = :convId',
      ExpressionAttributeValues: {
        ':convId': conversationId,
      },
      Limit: 1,
    })
  );
  return result.Items && result.Items.length > 0 ? result.Items[0] : null;
};

const updateLastMessage = async (conversation, message) => {
  const isFromUser = message.senderRole === 'USER';

  await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { PK: conversation.PK, SK: conversation.SK },
      UpdateExpression:
        'SET lastMessage = :msg, lastMessageAt = :ts, #ttl = :ttl' +
        (isFromUser ? ', unreadSeller = unreadSeller + :one' : ', unreadUser = unreadUser + :one'),
      ExpressionAttributeNames: {
        '#ttl': 'ttl',
      },
      ExpressionAttributeValues: {
        ':msg': message.content.substring(0, 100),
        ':ts': Date.now(),
        ':ttl': getTTL(),
        ':one': 1,
      },
    })
  );
};

const resetUnread = async (conversation, role) => {
  const field = role === 'USER' ? 'unreadUser' : 'unreadSeller';
  await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { PK: conversation.PK, SK: conversation.SK },
      UpdateExpression: `SET ${field} = :zero`,
      ExpressionAttributeValues: { ':zero': 0 },
    })
  );
};

module.exports = {
  createConversation,
  findExistingConversation,
  getConversationsByUser,
  getConversationsBySeller,
  getConversationById: scanConversationById,
  updateLastMessage,
  resetUnread,
};
