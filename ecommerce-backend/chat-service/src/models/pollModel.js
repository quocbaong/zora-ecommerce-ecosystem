const { PutCommand, GetCommand, UpdateCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('../config/dynamodb');
const { v4: uuidv4 } = require('uuid');

const TABLE = process.env.DYNAMODB_TABLE_POLLS || 'chat_polls';

const createPoll = async (groupId, messageId, question, options, isMultiple, createdBy, autoCloseAt = null) => {
  const pollId = uuidv4();
  const now = new Date().toISOString();

  const item = {
    PK: `GROUP#${groupId}`,
    SK: `POLL#${pollId}`,
    pollId,
    groupId,
    messageId,
    question,
    // options: [{ optionId, text, voteCount }] — no userId lists stored here
    options: options.map((text) => ({
      optionId: uuidv4(),
      text,
      voteCount: 0,
    })),
    isMultiple: !!isMultiple,
    createdBy,
    createdAt: now,
    closedAt: null,
    autoCloseAt: autoCloseAt || null, // epoch ms — null means no deadline
  };

  await docClient.send(new PutCommand({ TableName: TABLE, Item: item }));
  return item;
};

const getPoll = async (groupId, pollId) => {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE,
      Key: { PK: `GROUP#${groupId}`, SK: `POLL#${pollId}` },
    })
  );
  return result.Item || null;
};

const listPolls = async (groupId) => {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      ExpressionAttributeValues: {
        ':pk': `GROUP#${groupId}`,
        ':prefix': 'POLL#',
      },
      ScanIndexForward: false,
    })
  );
  return result.Items || [];
};

const closePoll = async (groupId, pollId) => {
  const now = new Date().toISOString();
  await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { PK: `GROUP#${groupId}`, SK: `POLL#${pollId}` },
      UpdateExpression: 'SET closedAt = :ca',
      ExpressionAttributeValues: { ':ca': now },
    })
  );
};

/**
 * Atomically update voteCount on a specific option.
 * delta = +1 or -1
 *
 * Dùng UpdateExpression `ADD options[idx].voteCount :delta` để DynamoDB tự
 * tăng/giảm nguyên tử, tránh race khi 2 user vote song song (read-modify-write
 * cũ sẽ ghi đè nhau và mất 1 vote).
 *
 * options là list — index có thể đổi nếu admin thêm/xoá option, nhưng theo
 * design hiện tại options chỉ được set lúc tạo poll, không sửa sau đó.
 * pollVoteModel kiểm tra vote tồn tại trước khi gọi delta = -1, nên không
 * cần ConditionExpression bảo vệ voteCount âm.
 */
const updateOptionVoteCount = async (groupId, pollId, optionId, delta) => {
  const poll = await getPoll(groupId, pollId);
  if (!poll) return null;

  const idx = (poll.options || []).findIndex((opt) => opt.optionId === optionId);
  if (idx === -1) return null;

  await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { PK: `GROUP#${groupId}`, SK: `POLL#${pollId}` },
      UpdateExpression: `ADD #opts[${idx}].voteCount :delta`,
      ExpressionAttributeNames: { '#opts': 'options' },
      ExpressionAttributeValues: { ':delta': delta },
    })
  );

  const refreshed = await getPoll(groupId, pollId);
  return refreshed?.options || null;
};

/**
 * Return all polls that have autoCloseAt in the past and are not yet closed.
 * Uses a Scan — acceptable since this runs infrequently and poll table is small.
 */
const { ScanCommand } = require('@aws-sdk/lib-dynamodb');
const listDueAutoClose = async () => {
  const now = Date.now();
  const result = await docClient.send(
    new ScanCommand({
      TableName: TABLE,
      FilterExpression: 'autoCloseAt <= :now AND attribute_not_exists(closedAt)',
      ExpressionAttributeValues: { ':now': now },
    })
  );
  return result.Items || [];
};

module.exports = {
  createPoll,
  getPoll,
  listPolls,
  closePoll,
  updateOptionVoteCount,
  listDueAutoClose,
};
