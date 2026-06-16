const { PutCommand, GetCommand, DeleteCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('../config/dynamodb');
const pollModel = require('./pollModel');

const TABLE = process.env.DYNAMODB_TABLE_POLL_VOTES || 'chat_poll_votes';

const getVote = async (pollId, userId) => {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE,
      Key: { PK: `POLL#${pollId}`, SK: `USER#${userId}` },
    })
  );
  return result.Item || null;
};

const countVotesForPoll = async (pollId) => {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `POLL#${pollId}`,
      },
    })
  );
  const votes = result.Items || [];
  const counts = {};
  for (const vote of votes) {
    for (const optionId of vote.optionIds || []) {
      counts[optionId] = (counts[optionId] || 0) + 1;
    }
  }
  return counts;
};

/**
 * Vote (or change vote) for a poll.
 * - Gets existing vote to compute delta
 * - Upserts vote record
 * - Updates voteCount on each affected option in chat_polls
 */
const vote = async (groupId, pollId, userId, optionIds) => {
  const existing = await getVote(pollId, userId);
  const oldOptionIds = existing ? (existing.optionIds || []) : [];

  // Compute deltas
  const added = optionIds.filter((id) => !oldOptionIds.includes(id));
  const removed = oldOptionIds.filter((id) => !optionIds.includes(id));

  // Upsert vote record
  await docClient.send(
    new PutCommand({
      TableName: TABLE,
      Item: {
        PK: `POLL#${pollId}`,
        SK: `USER#${userId}`,
        pollId,
        userId,
        optionIds,
        votedAt: new Date().toISOString(),
      },
    })
  );

  // Update vote counts sequentially (DynamoDB TransactWrite limited to 25 items)
  for (const optionId of added) {
    await pollModel.updateOptionVoteCount(groupId, pollId, optionId, +1);
  }
  for (const optionId of removed) {
    await pollModel.updateOptionVoteCount(groupId, pollId, optionId, -1);
  }

  return { pollId, userId, optionIds };
};

/**
 * Remove all votes for a user on a poll.
 */
const unvote = async (groupId, pollId, userId) => {
  const existing = await getVote(pollId, userId);
  if (!existing) return null;

  await docClient.send(
    new DeleteCommand({
      TableName: TABLE,
      Key: { PK: `POLL#${pollId}`, SK: `USER#${userId}` },
    })
  );

  // Decrement each option the user had voted for
  for (const optionId of existing.optionIds || []) {
    await pollModel.updateOptionVoteCount(groupId, pollId, optionId, -1);
  }

  return { pollId, userId };
};

module.exports = {
  getVote,
  vote,
  unvote,
  countVotesForPoll,
};
