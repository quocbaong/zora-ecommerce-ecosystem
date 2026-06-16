require("dotenv").config({ path: "../.env" });
const {
  DynamoDBClient,
  CreateTableCommand,
} = require("@aws-sdk/client-dynamodb");

const client = new DynamoDBClient({
  region: "ap-southeast-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const S = (n) => ({ AttributeName: n, AttributeType: "S" });
const H = (n) => ({ AttributeName: n, KeyType: "HASH" });
const R = (n) => ({ AttributeName: n, KeyType: "RANGE" });
const gsi = (IndexName, h, r, ProjectionType = "ALL") => ({
  IndexName,
  KeySchema: [H(h), R(r)],
  Projection: { ProjectionType },
});

const tables = [
  {
    TableName: "chat_conversations",
    KeySchema: [H("PK"), R("SK")],
    AttributeDefinitions: [S("PK"), S("SK"), S("GSI1PK"), S("GSI1SK")],
    GlobalSecondaryIndexes: [gsi("GSI1", "GSI1PK", "GSI1SK")],
  },

  {
    TableName: "chat_messages",
    KeySchema: [H("PK"), R("SK")],
    AttributeDefinitions: [S("PK"), S("SK")],
  },

  {
    TableName: "chat_groups",
    KeySchema: [H("PK")],
    AttributeDefinitions: [S("PK"), S("createdBy"), S("createdAt")],
    GlobalSecondaryIndexes: [gsi("GSI1_CreatedBy", "createdBy", "createdAt")],
  },

  {
    TableName: "chat_group_members",
    KeySchema: [H("PK"), R("SK")],
    AttributeDefinitions: [
      S("PK"),
      S("SK"),
      S("userId"),
      S("groupId"),
      S("roleSK"),
      S("mutedUntil"),
    ],
    GlobalSecondaryIndexes: [
      gsi("GSI2_GroupRoles", "PK", "roleSK"),
      gsi("GSI1_UserGroups", "userId", "groupId"),
      gsi("GSI3_UserMuted", "userId", "mutedUntil", "KEYS_ONLY"),
    ],
  },

  {
    TableName: "chat_group_messages",
    KeySchema: [H("PK"), R("SK")],
    AttributeDefinitions: [S("PK"), S("SK"), S("senderId"), S("createdAt")],
    GlobalSecondaryIndexes: [
      gsi("GSI1_SenderMessages", "senderId", "createdAt"),
    ],
  },

  {
    TableName: "chat_group_pins",
    KeySchema: [H("PK"), R("SK")],
    AttributeDefinitions: [S("PK"), S("SK")],
  },

  {
    TableName: "chat_polls",
    KeySchema: [H("PK"), R("SK")],
    AttributeDefinitions: [S("PK"), S("SK")],
  },

  {
    TableName: "chat_poll_votes",
    KeySchema: [H("PK"), R("SK")],
    AttributeDefinitions: [S("PK"), S("SK")],
  },

  {
    TableName: "chat_reminders",
    KeySchema: [H("PK"), R("SK")],
    AttributeDefinitions: [S("PK"), S("SK"), S("remindAtDate"), S("groupId")],
    GlobalSecondaryIndexes: [gsi("GSI1_RemindAt", "remindAtDate", "groupId")],
  },

  {
    TableName: "chat_reports",
    KeySchema: [H("PK"), R("SK")],
    AttributeDefinitions: [
      S("PK"),
      S("SK"),
      S("GSI1PK"),
      S("GSI1SK"),
      S("GSI2PK"),
      S("GSI2SK"),
      S("GSI3PK"),
      S("GSI3SK"),
    ],
    GlobalSecondaryIndexes: [
      gsi("GSI1", "GSI1PK", "GSI1SK"),
      gsi("GSI2", "GSI2PK", "GSI2SK"),
      gsi("GSI3", "GSI3PK", "GSI3SK"),
    ],
  },
];

(async () => {
  for (const t of tables) {
    try {
      await client.send(
        new CreateTableCommand({ ...t, BillingMode: "PAY_PER_REQUEST" }),
      );
      console.log("✓ Created:", t.TableName);
    } catch (e) {
      if (e.name === "ResourceInUseException")
        console.log("• Exists, skip:", t.TableName);
      else console.error("✗ ERROR", t.TableName, e.name, e.message);
    }
  }
})();
