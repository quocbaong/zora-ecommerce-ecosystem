const { PutCommand, UpdateCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('../config/dynamodb');
const { v4: uuidv4 } = require('uuid');

const TABLE = process.env.DYNAMODB_TABLE_GROUP_MESSAGES || 'chat_group_messages';
const NUM_SHARDS = 10;
const TTL_DAYS = 30;

const getTTL = () => Math.floor(Date.now() / 1000) + TTL_DAYS * 24 * 60 * 60;

const encodeCursor = (cursor) => Buffer.from(JSON.stringify(cursor)).toString('base64');

const decodeCursor = (cursor) => {
  if (!cursor) return null;
  try {
    return JSON.parse(Buffer.from(cursor, 'base64').toString());
  } catch (_) {
    return null;
  }
};

const queryShardMessages = async (groupId, shard, beforeSk = null) => {
  const items = [];
  let exclusiveStartKey;

  while (true) {
    const params = {
      TableName: TABLE,
      KeyConditionExpression: beforeSk
        ? 'PK = :pk AND SK < :beforeSk'
        : 'PK = :pk AND begins_with(SK, :prefix)',
      ExpressionAttributeValues: beforeSk
        ? {
            ':pk': `GROUP#${groupId}#SHARD#${shard}`,
            ':beforeSk': beforeSk,
          }
        : {
            ':pk': `GROUP#${groupId}#SHARD#${shard}`,
            ':prefix': 'MSG#',
          },
      ScanIndexForward: false,
    };

    if (exclusiveStartKey) {
      params.ExclusiveStartKey = exclusiveStartKey;
    }

    const result = await docClient.send(new QueryCommand(params));
    items.push(...(result.Items || []));

    if (!result.LastEvaluatedKey) break;
    exclusiveStartKey = result.LastEvaluatedKey;
  }

  return items;
};

/**
 * Create a message in a random shard to avoid hot partition.
 * PK = GROUP#groupId#SHARD#N  (N = timestamp % 10)
 * SK = MSG#timestamp#messageId
 */
const createGroupMessage = async ({ groupId, senderId, senderRole = 'USER', type = 'TEXT', content, replyTo = null, mentions = [], important = false, isForwarded = false, forwardedFrom = null }) => {
  const messageId = uuidv4();
  const now = new Date().toISOString();
  const shard = Date.now() % NUM_SHARDS;

  const item = {
    PK: `GROUP#${groupId}#SHARD#${shard}`,
    SK: `MSG#${now}#${messageId}`,
    messageId,
    groupId,
    senderId,
    senderRole,
    type,
    content,
    recalled: false,
    deletedBy: [],
    reactions: {},
    replyTo: replyTo || null,
    mentions: mentions || [],
    isPinned: false,
    important: !!important,
    isForwarded: !!isForwarded,
    forwardedFrom: forwardedFrom || null,
    createdAt: now,
    ttl: getTTL(),
  };

  await docClient.send(new PutCommand({ TableName: TABLE, Item: item }));
  return item;
};

/**
 * Query all 10 shards in parallel, merge, sort DESC, apply filters, paginate.
 */
const getGroupMessages = async (groupId, userId, limit = 30, lastKey = null, clearedAt = 0) => {
  const cursor = decodeCursor(lastKey);
  const beforeSk = cursor?.beforeSk || null;

  const shardQueries = Array.from({ length: NUM_SHARDS }, (_, i) =>
    queryShardMessages(groupId, i, beforeSk)
  );

  const allItems = (await Promise.all(shardQueries)).flat();

  // Sort DESC by SK (MSG#timestamp#id)
  allItems.sort((a, b) => b.SK.localeCompare(a.SK));

  // Filter
  const filtered = allItems.filter((item) => {
    if (item.recalled) return true; // still show recalled bubble
    if (item.deletedBy && item.deletedBy.includes(userId)) return false;
    if (clearedAt > 0 && item.createdAt) {
      const t = new Date(item.createdAt).getTime();
      if (!isNaN(t) && t < clearedAt) return false;
    }
    return true;
  });

  const pageItems = filtered.slice(0, limit);
  // Capture the oldest SK BEFORE reversing — pageItems is sorted DESC so the
  // last element is the oldest. After .reverse() the indexes flip and the
  // cursor would point at the newest item, causing the next page to overlap
  // and only advance by 1 message after dedupe on the client.
  const oldestSk = pageItems.length > 0 ? pageItems[pageItems.length - 1].SK : null;
  const page = pageItems.reverse();
  const hasMore = filtered.length > limit;
  const nextKey = hasMore && oldestSk ? encodeCursor({ beforeSk: oldestSk }) : null;

  return { messages: page, nextKey };
};

/**
 * Find a single message by messageId — query all shards, filter by messageId.
 */
const getGroupMessageById = async (groupId, messageId) => {
  const shardQueries = Array.from({ length: NUM_SHARDS }, (_, i) =>
    docClient.send(
      new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
        FilterExpression: 'messageId = :mid',
        ExpressionAttributeValues: {
          ':pk': `GROUP#${groupId}#SHARD#${i}`,
          ':prefix': 'MSG#',
          ':mid': messageId,
        },
      })
    )
  );

  const results = await Promise.all(shardQueries);
  for (const r of results) {
    if (r.Items && r.Items.length > 0) return r.Items[0];
  }
  return null;
};

const recallGroupMessage = async (groupId, messageId) => {
  const msg = await getGroupMessageById(groupId, messageId);
  if (!msg) return null;

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

const softDeleteGroupMessage = async (groupId, messageId, userId) => {
  const msg = await getGroupMessageById(groupId, messageId);
  if (!msg) return null;

  const current = msg.deletedBy || [];
  if (!current.includes(userId)) current.push(userId);

  await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { PK: msg.PK, SK: msg.SK },
      UpdateExpression: 'SET deletedBy = :db',
      ExpressionAttributeValues: { ':db': current },
    })
  );
  return { messageId, deletedBy: current };
};

const addGroupReaction = async (groupId, messageId, emoji, userId) => {
  const msg = await getGroupMessageById(groupId, messageId);
  if (!msg) return null;

  const existing = (msg.reactions || {})[emoji] || [];
  const alreadyReacted = existing.includes(userId);
  let updatedList = alreadyReacted
    ? existing.filter((id) => id !== userId)
    : [...existing, userId];

  const newReactions = { ...(msg.reactions || {}), [emoji]: updatedList };
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

const setPinned = async (groupId, messageId, isPinned) => {
  const msg = await getGroupMessageById(groupId, messageId);
  if (!msg) return null;

  await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { PK: msg.PK, SK: msg.SK },
      UpdateExpression: 'SET isPinned = :p',
      ExpressionAttributeValues: { ':p': isPinned },
    })
  );
  return { messageId, isPinned };
};

const updateGroupMessageContent = async (groupId, messageId, content) => {
  const msg = await getGroupMessageById(groupId, messageId);
  if (!msg) return null;
  await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { PK: msg.PK, SK: msg.SK },
      UpdateExpression: 'SET content = :c',
      ExpressionAttributeValues: { ':c': content },
    })
  );
  return { ...msg, content };
};

module.exports = {
  createGroupMessage,
  getGroupMessages,
  getGroupMessageById,
  updateGroupMessageContent,
  recallGroupMessage,
  softDeleteGroupMessage,
  addGroupReaction,
  setPinned,
};
