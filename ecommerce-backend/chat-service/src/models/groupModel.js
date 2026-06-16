const { PutCommand, GetCommand, UpdateCommand, DeleteCommand, QueryCommand, BatchGetCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('../config/dynamodb');
const { v4: uuidv4 } = require('uuid');

const TABLE = process.env.DYNAMODB_TABLE_GROUPS || 'chat_groups';
const MEMBERS_TABLE = process.env.DYNAMODB_TABLE_GROUP_MEMBERS || 'chat_group_members';

const createGroup = async (createdBy, name, description = '', avatarUrl = '') => {
  const groupId = uuidv4();
  const now = new Date().toISOString();

  const inviteToken = uuidv4();

  const item = {
    PK: `GROUP#${groupId}`,
    groupId,
    name,
    description,
    avatarUrl,
    createdBy,
    createdAt: now,
    updatedAt: now,
    lastMessageAt: now,
    memberCount: 0,
    rules: '',
    allowMemberPost: true,        // default: all members can post
    highlightAdminMessages: false, // default: no special highlight
    inviteToken,
  };

  await docClient.send(new PutCommand({ TableName: TABLE, Item: item }));
  return item;
};

const getGroupById = async (groupId) => {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE,
      Key: { PK: `GROUP#${groupId}` },
    })
  );
  return result.Item || null;
};

const updateGroup = async (groupId, fields) => {
  const allowed = ['name', 'description', 'avatarUrl', 'rules', 'memberCount', 'allowMemberPost', 'highlightAdminMessages', 'inviteToken'];
  const updates = Object.entries(fields).filter(([k]) => allowed.includes(k));
  if (updates.length === 0) return null;

  updates.push(['updatedAt', new Date().toISOString()]);

  const setExpr = updates.map(([k]) => `#${k} = :${k}`).join(', ');
  const names = Object.fromEntries(updates.map(([k]) => [`#${k}`, k]));
  const values = Object.fromEntries(updates.map(([k, v]) => [`:${k}`, v]));

  const result = await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { PK: `GROUP#${groupId}` },
      UpdateExpression: `SET ${setExpr}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ReturnValues: 'ALL_NEW',
    })
  );
  return result.Attributes || null;
};

const deleteGroup = async (groupId) => {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE,
      Key: { PK: `GROUP#${groupId}` },
    })
  );
};

/**
 * List all groups for a user by querying GSI1_UserGroups on chat_group_members,
 * then batch-fetching group details from chat_groups.
 */
const listGroupsByUser = async (userId) => {
  // Step 1: query GSI1_UserGroups to get all groupIds for this user
  const memberResult = await docClient.send(
    new QueryCommand({
      TableName: MEMBERS_TABLE,
      IndexName: 'GSI1_UserGroups',
      KeyConditionExpression: 'userId = :uid',
      ExpressionAttributeValues: { ':uid': userId },
    })
  );

  const memberItems = memberResult.Items || [];
  if (memberItems.length === 0) return [];

  // Step 2: batch-get group details
  const keys = memberItems.map((m) => ({ PK: `GROUP#${m.groupId}` }));

  // BatchGet supports max 100 per request
  const chunks = [];
  for (let i = 0; i < keys.length; i += 100) chunks.push(keys.slice(i, i + 100));

  const groups = [];
  for (const chunk of chunks) {
    const batchResult = await docClient.send(
      new BatchGetCommand({
        RequestItems: {
          [TABLE]: { Keys: chunk },
        },
      })
    );
    const items = (batchResult.Responses?.[TABLE] || []);
    groups.push(...items);
  }

  // Attach member metadata (role, unreadCount, mutedUntil) to each group
  const memberMap = Object.fromEntries(memberItems.map((m) => [m.groupId, m]));
  return groups
    .map((g) => ({ ...g, memberMeta: memberMap[g.groupId] || {} }))
    .sort((a, b) => (b.lastMessageAt || b.updatedAt || '').localeCompare(a.lastMessageAt || a.updatedAt || ''));
};

/**
 * @param {string} groupId
 * @param {string} timestamp ISO timestamp
 * @param {object} [meta] - { preview, type, senderId }
 */
const updateGroupLastMessage = async (groupId, timestamp, meta = {}) => {
  const { preview, type, senderId } = meta;
  const hasMeta = preview !== undefined || type !== undefined || senderId !== undefined;
  await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { PK: `GROUP#${groupId}` },
      UpdateExpression: hasMeta
        ? 'SET lastMessageAt = :t, lastMessage = :m, lastMessageType = :ty, lastMessageSenderId = :s'
        : 'SET lastMessageAt = :t',
      ExpressionAttributeValues: hasMeta
        ? {
            ':t': timestamp,
            ':m': typeof preview === 'string' ? preview.slice(0, 100) : '',
            ':ty': type || 'TEXT',
            ':s': senderId || '',
          }
        : { ':t': timestamp },
    })
  );
};

module.exports = {
  createGroup,
  getGroupById,
  updateGroup,
  deleteGroup,
  listGroupsByUser,
  updateGroupLastMessage,
};
