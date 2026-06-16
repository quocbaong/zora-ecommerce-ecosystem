require('dotenv').config({ path: '../.env' });
const { docClient } = require('./src/config/dynamodb');
const { GetCommand } = require('@aws-sdk/lib-dynamodb');

const groupId = '156cd2d2-e9e6-4c0d-91bf-64b18b40da58';
const targetUserId = '52a5e471-1e9f-45c0-9c09-daefc78c8db3';

async function run() {
  try {
    const TABLE = process.env.DYNAMODB_TABLE_GROUP_MEMBERS || 'chat_group_members';
    console.log("Using table:", TABLE);
    const res = await docClient.send(new GetCommand({
      TableName: TABLE,
      Key: {
        PK: `GROUP#${groupId}`,
        SK: `MEMBER#${targetUserId}`
      }
    }));
    console.log("GetCommand result:", JSON.stringify(res.Item, null, 2));
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
