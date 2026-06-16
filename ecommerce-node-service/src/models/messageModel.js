const { PutCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('../config/dynamodb');
const { v4: uuidv4 } = require('uuid');

const TABLE = process.env.DYNAMODB_TABLE_MESSAGES || 'chat_messages';
const TTL_DAYS = 30;

const getTTL = () => Math.floor(Date.now() / 1000) + TTL_DAYS * 24 * 60 * 60;

const createMessage = async ({ conversationId, senderId, senderRole, type, content }) => {
  const messageId = uuidv4();
  const timestamp = new Date().toISOString();

  const item = {
    PK: `CONV#${conversationId}`,
    SK: `MSG#${timestamp}#${messageId}`,
    messageId,
    senderId,
    senderRole,
    type: type || 'TEXT',
    content,
    readBy: [senderId],
    ttl: getTTL(),
  };

  await docClient.send(new PutCommand({ TableName: TABLE, Item: item }));
  return item;
};

const getMessages = async (conversationId, limit = 20, lastKey = null) => {
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

  return {
    messages: (result.Items || []).reverse(),
    nextKey,
  };
};

module.exports = {
  createMessage,
  getMessages,
};
