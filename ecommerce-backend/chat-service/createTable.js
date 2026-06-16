require("dotenv").config({ path: "../.env" });
const {
  DynamoDBClient,
  CreateTableCommand,
  DescribeTableCommand,
} = require("@aws-sdk/client-dynamodb");

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "ap-southeast-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const TABLE_NAME = process.env.DYNAMODB_TABLE_REPORTS || "chat_reports";

const run = async () => {
  try {
    const describe = new DescribeTableCommand({ TableName: TABLE_NAME });
    const res = await client.send(describe);
    console.log("Table Description:", JSON.stringify(res.Table, null, 2));
  } catch (err) {
    console.error("Error describing table:", err);
  }
};

run();
