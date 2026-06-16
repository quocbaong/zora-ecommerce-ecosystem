const { PutCommand, GetCommand, UpdateCommand, DeleteCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('../config/dynamodb');

const TABLE = process.env.DYNAMODB_TABLE_GROUP_MEMBERS || 'chat_group_members';

const addMember = async (groupId, userId, role = 'MEMBER') => {
  const now = new Date().toISOString();
  const item = {
    PK: `GROUP#${groupId}`,
    SK: `MEMBER#${userId}`,
    userId,
    groupId,
    role,
    roleSK: `ROLE#${role}`,
    nickname: '',
    joinedAt: now,
    muteMentionsOnly: false,
    clearedAt: 0,
    unreadCount: 0,
  };
  // mutedUntil omitted when not muted — GSI3_UserMuted only indexes muted members

  try {
    await docClient.send(
      new PutCommand({
        TableName: TABLE,
        Item: item,
        ConditionExpression: 'attribute_not_exists(PK)',
      })
    );
  } catch (e) {
    if (e.name !== 'ConditionalCheckFailedException') throw e;
    // Already a member — return existing record
    return getMember(groupId, userId);
  }

  return item;
};

const removeMember = async (groupId, userId) => {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE,
      Key: { PK: `GROUP#${groupId}`, SK: `MEMBER#${userId}` },
    })
  );
};

const getMember = async (groupId, userId) => {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE,
      Key: { PK: `GROUP#${groupId}`, SK: `MEMBER#${userId}` },
    })
  );
  return result.Item || null;
};

const listMembers = async (groupId) => {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      ExpressionAttributeValues: {
        ':pk': `GROUP#${groupId}`,
        ':prefix': 'MEMBER#',
      },
    })
  );
  return result.Items || [];
};

const listByRole = async (groupId, role) => {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI2_GroupRoles',
      KeyConditionExpression: 'PK = :pk AND roleSK = :rsk',
      ExpressionAttributeValues: {
        ':pk': `GROUP#${groupId}`,
        ':rsk': `ROLE#${role}`,
      },
    })
  );
  return result.Items || [];
};

const updateMemberRole = async (groupId, userId, role) => {
  await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { PK: `GROUP#${groupId}`, SK: `MEMBER#${userId}` },
      UpdateExpression: 'SET #role = :role, roleSK = :roleSK',
      ExpressionAttributeNames: { '#role': 'role' },
      ExpressionAttributeValues: { ':role': role, ':roleSK': `ROLE#${role}` },
    })
  );
};

const updateMemberNickname = async (groupId, userId, nickname) => {
  await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { PK: `GROUP#${groupId}`, SK: `MEMBER#${userId}` },
      UpdateExpression: 'SET nickname = :n',
      ExpressionAttributeValues: { ':n': nickname },
    })
  );
};

const setMute = async (groupId, userId, mutedUntil, mentionsOnly = false) => {
  await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { PK: `GROUP#${groupId}`, SK: `MEMBER#${userId}` },
      UpdateExpression: 'SET mutedUntil = :mu, muteMentionsOnly = :mo',
      ExpressionAttributeValues: { ':mu': mutedUntil, ':mo': mentionsOnly },
    })
  );
};

const unsetMute = async (groupId, userId) => {
  await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { PK: `GROUP#${groupId}`, SK: `MEMBER#${userId}` },
      UpdateExpression: 'REMOVE mutedUntil SET muteMentionsOnly = :f',
      ExpressionAttributeValues: { ':f': false },
    })
  );
};

const clearMemberHistory = async (groupId, userId) => {
  await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { PK: `GROUP#${groupId}`, SK: `MEMBER#${userId}` },
      UpdateExpression: 'SET clearedAt = :ts, unreadCount = :zero',
      ExpressionAttributeValues: { ':ts': Date.now(), ':zero': 0 },
    })
  );
};

const incrementUnread = async (groupId, userId) => {
  await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { PK: `GROUP#${groupId}`, SK: `MEMBER#${userId}` },
      UpdateExpression: 'ADD unreadCount :one',
      ExpressionAttributeValues: { ':one': 1 },
    })
  );
};

const resetUnread = async (groupId, userId) => {
  await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { PK: `GROUP#${groupId}`, SK: `MEMBER#${userId}` },
      UpdateExpression: 'SET unreadCount = :zero',
      ExpressionAttributeValues: { ':zero': 0 },
    })
  );
};

module.exports = {
  addMember,
  removeMember,
  getMember,
  listMembers,
  listByRole,
  updateMemberRole,
  updateMemberNickname,
  setMute,
  unsetMute,
  clearMemberHistory,
  incrementUnread,
  resetUnread,
};
