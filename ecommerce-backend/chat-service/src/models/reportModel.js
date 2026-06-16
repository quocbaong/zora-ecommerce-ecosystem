const {
  PutCommand,
  QueryCommand,
  GetCommand,
  UpdateCommand,
  ScanCommand,
} = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/dynamodb");
const { v4: uuidv4 } = require("uuid");

const TABLE = process.env.DYNAMODB_TABLE_REPORTS || "chat_reports";

// Report Reason Enum
const ReportReason = {
  SPAM: "SPAM",
  SCAM: "SCAM",
  FAKE_PRODUCT: "FAKE_PRODUCT",
  HARASSMENT: "HARASSMENT",
  OTHER: "OTHER",
};

// Report Status Enum
const ReportStatus = {
  PENDING: "PENDING",
  RESOLVED: "RESOLVED",
  REJECTED: "REJECTED",
};

const createReport = async ({
  reporterId,
  reportedUserId,
  conversationId,
  reason,
  description,
  evidenceMessages = [],
  evidenceImages = [],
}) => {
  const reportId = uuidv4();
  const now = new Date().toISOString();

  const item = {
    PK: `REPORT#${reportId}`,
    SK: `#METADATA`,
    reportId,
    reporterId,
    reportedUserId,
    conversationId,
    reason,
    description,
    evidence: evidenceMessages, // Array of message objects
    evidenceImages, // Array of strings (URLs)
    status: ReportStatus.PENDING,
    adminNote: "",
    createdAt: now,
    updatedAt: now,
    // GSI for querying by reporterId
    GSI1PK: `REPORTER#${reporterId}`,
    GSI1SK: `#${now}#${reportId}`,
    // GSI for querying by conversationId
    GSI2PK: `CONVERSATION#${conversationId}`,
    GSI2SK: `#${now}#${reportId}`,
    // GSI for querying by status
    GSI3PK: `STATUS#${ReportStatus.PENDING}`,
    GSI3SK: `#${now}#${reportId}`,
  };

  await docClient.send(new PutCommand({ TableName: TABLE, Item: item }));
  return item;
};

const getReportById = async (reportId) => {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE,
      Key: {
        PK: `REPORT#${reportId}`,
        SK: `#METADATA`,
      },
    })
  );
  return result.Item || null;
};

const getReportsByConversation = async (conversationId, limit = 20, lastKey = null) => {
  const params = {
    TableName: TABLE,
    IndexName: "GSI2",
    KeyConditionExpression: "GSI2PK = :pk AND begins_with(GSI2SK, :sk)",
    ExpressionAttributeValues: {
      ":pk": `CONVERSATION#${conversationId}`,
      ":sk": "#",
    },
    ScanIndexForward: false,
    Limit: limit,
  };

  if (lastKey) {
    params.ExclusiveStartKey = JSON.parse(
      Buffer.from(lastKey, "base64").toString()
    );
  }

  const result = await docClient.send(new QueryCommand(params));

  let nextKey = null;
  if (result.LastEvaluatedKey) {
    nextKey = Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString(
      "base64"
    );
  }

  return {
    reports: result.Items || [],
    nextKey,
  };
};

const getReportsByStatus = async (
  status = ReportStatus.PENDING,
  limit = 20,
  lastKey = null
) => {
  const params = {
    TableName: TABLE,
    IndexName: "GSI3",
    KeyConditionExpression: "GSI3PK = :pk AND begins_with(GSI3SK, :sk)",
    ExpressionAttributeValues: {
      ":pk": `STATUS#${status}`,
      ":sk": "#",
    },
    ScanIndexForward: false,
    Limit: limit,
  };

  if (lastKey) {
    params.ExclusiveStartKey = JSON.parse(
      Buffer.from(lastKey, "base64").toString()
    );
  }

  const result = await docClient.send(new QueryCommand(params));

  let nextKey = null;
  if (result.LastEvaluatedKey) {
    nextKey = Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString(
      "base64"
    );
  }

  return {
    reports: result.Items || [],
    nextKey,
  };
};

const updateReportStatus = async (reportId, { status, adminNote, moderationAction, resolvedAt, resolvedBy, rejectedAt }) => {
  const report = await getReportById(reportId);
  if (!report) return null;

  const now = new Date().toISOString();
  
  let UpdateExpression;
  const ExpressionAttributeNames = {
    "#status": "status",
  };
  const ExpressionAttributeValues = {
    ":status": status,
    ":adminNote": adminNote || "",
    ":updatedAt": now,
    ":gsi3pk": `STATUS#${status}`,
    ":gsi3sk": `#${now}#${reportId}`,
  };

  if (status === "RESOLVED") {
    UpdateExpression = "SET #status = :status, adminNote = :adminNote, moderationAction = :moderationAction, resolvedAt = :resolvedAt, resolvedBy = :resolvedBy, updatedAt = :updatedAt, GSI3PK = :gsi3pk, GSI3SK = :gsi3sk REMOVE rejectedAt";
    ExpressionAttributeValues[":moderationAction"] = moderationAction || "NONE";
    ExpressionAttributeValues[":resolvedAt"] = resolvedAt || now;
    ExpressionAttributeValues[":resolvedBy"] = resolvedBy || "";
  } else {
    UpdateExpression = "SET #status = :status, adminNote = :adminNote, rejectedAt = :rejectedAt, updatedAt = :updatedAt, GSI3PK = :gsi3pk, GSI3SK = :gsi3sk REMOVE moderationAction, resolvedAt, resolvedBy";
    ExpressionAttributeValues[":rejectedAt"] = rejectedAt || now;
  }

  await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: {
        PK: `REPORT#${reportId}`,
        SK: `#METADATA`,
      },
      UpdateExpression,
      ExpressionAttributeNames,
      ExpressionAttributeValues,
    })
  );

  const updatedReport = {
    ...report,
    status,
    adminNote: adminNote || "",
    updatedAt: now,
  };

  if (status === "RESOLVED") {
    updatedReport.moderationAction = moderationAction || "NONE";
    updatedReport.resolvedAt = resolvedAt || now;
    updatedReport.resolvedBy = resolvedBy || "";
    delete updatedReport.rejectedAt;
  } else {
    updatedReport.rejectedAt = rejectedAt || now;
    delete updatedReport.moderationAction;
    delete updatedReport.resolvedAt;
    delete updatedReport.resolvedBy;
  }

  return updatedReport;
};

const getReportsByReporter = async (reporterId, limit = 20, lastKey = null) => {
  const params = {
    TableName: TABLE,
    IndexName: "GSI1",
    KeyConditionExpression: "GSI1PK = :pk AND begins_with(GSI1SK, :sk)",
    ExpressionAttributeValues: {
      ":pk": `REPORTER#${reporterId}`,
      ":sk": "#",
    },
    ScanIndexForward: false,
    Limit: limit,
  };

  if (lastKey) {
    params.ExclusiveStartKey = JSON.parse(
      Buffer.from(lastKey, "base64").toString()
    );
  }

  const result = await docClient.send(new QueryCommand(params));

  let nextKey = null;
  if (result.LastEvaluatedKey) {
    nextKey = Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString(
      "base64"
    );
  }

  return {
    reports: result.Items || [],
    nextKey,
  };
};

const getUserMetadata = async (userId) => {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE,
      Key: {
        PK: `USER#${userId}`,
        SK: `#METADATA`,
      },
    })
  );
  return result.Item || {
    userId,
    violationCount: 0,
    banned: false,
    accountStatus: "ACTIVE",
  };
};

const updateUserMetadata = async (userId, updates) => {
  const current = await getUserMetadata(userId);
  const now = new Date().toISOString();
  const item = {
    ...current,
    ...updates,
    PK: `USER#${userId}`,
    SK: `#METADATA`,
    userId,
    updatedAt: now,
  };

  // If updates explicitly clears mutedUntil, delete it from the item
  if (updates.mutedUntil === null || updates.mutedUntil === undefined) {
    delete item.mutedUntil;
  }

  await docClient.send(new PutCommand({ TableName: TABLE, Item: item }));
  return item;
};

module.exports = {
  createReport,
  getReportById,
  getReportsByConversation,
  getReportsByStatus,
  updateReportStatus,
  getReportsByReporter,
  getUserMetadata,
  updateUserMetadata,
  ReportReason,
  ReportStatus,
};
