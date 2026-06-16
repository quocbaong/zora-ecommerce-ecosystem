const { PutCommand, DeleteCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('../config/dynamodb');

const TABLE = process.env.DYNAMODB_TABLE_GROUP_PINS || 'chat_group_pins';

const pinMessage = async ({ groupId, messageId, pinnedBy, senderId, type, content }) => {
  const pinnedAt = new Date().toISOString();

  const item = {
    PK: `GROUP#${groupId}`,
    SK: `PIN#${pinnedAt}#${messageId}`,
    messageId,
    groupId,
    pinnedBy,
    pinnedAt,
    senderId,
    type,
    // Store preview truncated to 200 chars
    content: typeof content === 'string' ? content.slice(0, 200) : '',
  };

  await docClient.send(new PutCommand({ TableName: TABLE, Item: item }));
  return item;
};

const unpinMessage = async (groupId, messageId) => {
  // Need to find the SK first (contains pinnedAt timestamp)
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      FilterExpression: 'messageId = :mid',
      ExpressionAttributeValues: {
        ':pk': `GROUP#${groupId}`,
        ':prefix': 'PIN#',
        ':mid': messageId,
      },
    })
  );

  const item = result.Items && result.Items.length > 0 ? result.Items[0] : null;
  if (!item) return null;

  await docClient.send(
    new DeleteCommand({
      TableName: TABLE,
      Key: { PK: item.PK, SK: item.SK },
    })
  );
  return { messageId };
};

const listPinnedMessages = async (groupId) => {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      ExpressionAttributeValues: {
        ':pk': `GROUP#${groupId}`,
        ':prefix': 'PIN#',
      },
      ScanIndexForward: false, // newest first
    })
  );
  return result.Items || [];
};

module.exports = {
  pinMessage,
  unpinMessage,
  listPinnedMessages,
};
