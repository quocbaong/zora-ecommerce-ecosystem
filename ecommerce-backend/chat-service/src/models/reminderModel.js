const { PutCommand, GetCommand, UpdateCommand, DeleteCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('../config/dynamodb');
const { v4: uuidv4 } = require('uuid');

const TABLE = process.env.DYNAMODB_TABLE_REMINDERS || 'chat_reminders';
// Auto-delete reminders 30 days after they fire
const TTL_DAYS = 30;

const createReminder = async (groupId, createdBy, title, remindAt, participants = []) => {
  const reminderId = uuidv4();
  const now = new Date().toISOString();
  const remindAtDate = new Date(remindAt).toISOString().slice(0, 10); // YYYY-MM-DD for GSI partition
  const ttl = Math.floor(remindAt / 1000) + TTL_DAYS * 24 * 60 * 60;

  const item = {
    PK: `GROUP#${groupId}`,
    SK: `REMINDER#${reminderId}`,
    reminderId,
    groupId,
    createdBy,
    title,
    remindAt, // epoch ms
    remindAtDate, // YYYY-MM-DD — GSI1 hash key
    participants, // array of userId strings
    done: false,
    createdAt: now,
    ttl,
  };

  await docClient.send(new PutCommand({ TableName: TABLE, Item: item }));
  return item;
};

const getReminder = async (groupId, reminderId) => {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE,
      Key: { PK: `GROUP#${groupId}`, SK: `REMINDER#${reminderId}` },
    })
  );
  return result.Item || null;
};

const listReminders = async (groupId) => {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      ExpressionAttributeValues: {
        ':pk': `GROUP#${groupId}`,
        ':prefix': 'REMINDER#',
      },
      ScanIndexForward: true, // oldest first
    })
  );
  return result.Items || [];
};

/**
 * Query by date via GSI1_RemindAt, then filter remindAt <= now and done=false.
 * Called by cron job every 60 seconds.
 */
const listDueReminders = async (date) => {
  const now = Date.now();

  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1_RemindAt',
      KeyConditionExpression: 'remindAtDate = :date',
      FilterExpression: 'done = :f',
      ExpressionAttributeValues: {
        ':date': date, // YYYY-MM-DD
        ':f': false,
      },
    })
  );

  return (result.Items || []).filter((r) => r.remindAt <= now);
};

const markReminderDone = async (groupId, reminderId) => {
  await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { PK: `GROUP#${groupId}`, SK: `REMINDER#${reminderId}` },
      UpdateExpression: 'SET done = :t',
      ExpressionAttributeValues: { ':t': true },
    })
  );
};

const deleteReminder = async (groupId, reminderId) => {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE,
      Key: { PK: `GROUP#${groupId}`, SK: `REMINDER#${reminderId}` },
    })
  );
};

module.exports = {
  createReminder,
  getReminder,
  listReminders,
  listDueReminders,
  markReminderDone,
  deleteReminder,
};
