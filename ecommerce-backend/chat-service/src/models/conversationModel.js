const {
  PutCommand,
  QueryCommand,
  GetCommand,
  UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/dynamodb");
const { v4: uuidv4 } = require("uuid");
const { ScanCommand } = require("@aws-sdk/lib-dynamodb");

const TABLE = process.env.DYNAMODB_TABLE_CONVERSATIONS || "chat_conversations";
const TTL_DAYS = 30;

const getTTL = () => Math.floor(Date.now() / 1000) + TTL_DAYS * 24 * 60 * 60;

const createConversation = async ({ userId, sellerId, productId }) => {
  const conversationId = uuidv4();
  const now = Date.now();

  const item = {
    PK: `USER#${userId}`,
    SK: `CONV#${conversationId}`,
    conversationId,
    sellerId,
    userId,
    productId: productId || null,
    conversationType: "PRODUCT",
    lastMessage: "",
    lastMessageAt: now,
    unreadUser: 0,
    unreadSeller: 0,
    ttl: getTTL(),
    GSI1PK: `SELLER#${sellerId}`,
    GSI1SK: `CONV#${conversationId}`,
  };

  await docClient.send(new PutCommand({ TableName: TABLE, Item: item }));
  return item;
};

const findExistingConversation = async ({ userId, sellerId }) => {
  // Dedupe by (userId, sellerId) only — one PRODUCT thread per user↔seller pair,
  // regardless of which product triggered the chat. Excludes DIRECT (friend) convs.
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
      FilterExpression:
        "sellerId = :sellerId AND conversationType = :type" +
        " AND (attribute_not_exists(deletedBy) OR NOT contains(deletedBy, :userId))",
      ExpressionAttributeValues: {
        ":pk": `USER#${userId}`,
        ":skPrefix": "CONV#",
        ":sellerId": sellerId,
        ":type": "PRODUCT",
        ":userId": userId,
      },
    }),
  );
  return result.Items && result.Items.length > 0 ? result.Items[0] : null;
};

const getConversationsByUser = async (userId) => {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
      ExpressionAttributeValues: {
        ":pk": `USER#${userId}`,
        ":skPrefix": "CONV#",
      },
      ScanIndexForward: false,
    }),
  );
  return (result.Items || []).filter(
    (c) => !(c.deletedBy || []).includes(userId),
  );
};

const getConversationsBySeller = async (sellerId) => {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: "GSI1",
      KeyConditionExpression: "GSI1PK = :pk AND begins_with(GSI1SK, :skPrefix)",
      ExpressionAttributeValues: {
        ":pk": `SELLER#${sellerId}`,
        ":skPrefix": "CONV#",
      },
      ScanIndexForward: false,
    }),
  );
  return (result.Items || []).filter(
    (c) => !(c.deletedBy || []).includes(sellerId),
  );
};

// In-memory LRU cache cho scan kết quả — giảm chi phí scan bảng khi nhiều flow
// fallback cùng lúc tra cứu cùng conversationId (vd: recall/delete/sendMessage seller).
// TTL ngắn để dữ liệu (unread, lastMessage...) không bị stale lâu.
const CONV_CACHE_TTL_MS = 60_000; // 1 phút
const CONV_CACHE_MAX = 200;
const conversationCache = new Map(); // conversationId → { item, expireAt }

const cacheGet = (conversationId) => {
  const entry = conversationCache.get(conversationId);
  if (!entry) return null;
  if (Date.now() > entry.expireAt) {
    conversationCache.delete(conversationId);
    return null;
  }
  // Move to end (LRU)
  conversationCache.delete(conversationId);
  conversationCache.set(conversationId, entry);
  return entry.item;
};

const cacheSet = (conversationId, item) => {
  if (conversationCache.size >= CONV_CACHE_MAX) {
    const oldestKey = conversationCache.keys().next().value;
    if (oldestKey) conversationCache.delete(oldestKey);
  }
  conversationCache.set(conversationId, { item, expireAt: Date.now() + CONV_CACHE_TTL_MS });
};

const scanConversationById = async (conversationId) => {
  const cached = cacheGet(conversationId);
  if (cached) return cached;

  let lastKey = undefined;
  do {
    const params = {
      TableName: TABLE,
      FilterExpression: "conversationId = :convId",
      ExpressionAttributeValues: { ":convId": conversationId },
    };
    if (lastKey) params.ExclusiveStartKey = lastKey;
    const result = await docClient.send(new ScanCommand(params));
    if (result.Items && result.Items.length > 0) {
      cacheSet(conversationId, result.Items[0]);
      return result.Items[0];
    }
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);
  return null;
};

// getConversationById: trước đây dùng KeyConditionExpression sai
// ("GSI1PK = begins_with(GSI1PK, :prefix)") khiến DynamoDB throw → fall back
// silent. Hợp nhất với scanConversationById để có cache + đúng kết quả.
const getConversationById = scanConversationById;

const updateLastMessage = async (conversation, message) => {
  const isFromUser = message.senderRole === "USER";

  await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { PK: conversation.PK, SK: conversation.SK },
      UpdateExpression:
        "SET lastMessage = :msg, lastMessageAt = :ts, #ttl = :ttl" +
        (isFromUser
          ? ", unreadSeller = if_not_exists(unreadSeller, :zero) + :one"
          : ", unreadUser = if_not_exists(unreadUser, :zero) + :one"),
      ExpressionAttributeNames: {
        "#ttl": "ttl",
      },
      ExpressionAttributeValues: {
        ":msg": (message.content || "").substring(0, 100),
        ":ts": Date.now(),
        ":ttl": getTTL(),
        ":one": 1,
        ":zero": 0,
      },
    }),
  );
};

const resetUnread = async (conversation, role) => {
  const field = role === "USER" ? "unreadUser" : "unreadSeller";
  await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { PK: conversation.PK, SK: conversation.SK },
      UpdateExpression: `SET ${field} = :zero`,
      ExpressionAttributeValues: { ":zero": 0 },
    }),
  );
};

const deleteConversation = async (conversationId, userId) => {
  let conv = await getUserConversationRecord(userId, conversationId);
  if (!conv) {
    conv = await scanConversationById(conversationId);
    if (!conv) return;
    if (conv.userId !== userId && conv.sellerId !== userId) return;
  }

  if (!conv) return;

  const currentDeletedBy = conv.deletedBy || [];
  if (!currentDeletedBy.includes(userId)) {
    currentDeletedBy.push(userId);
  }

  const clearedAtField = `clearedAt_${userId.replace(/[^a-zA-Z0-9_]/g, "")}`;

  await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { PK: conv.PK, SK: conv.SK },
      UpdateExpression: "SET deletedBy = :db, #clearedAt = :ts",
      ExpressionAttributeNames: { "#clearedAt": clearedAtField },
      ExpressionAttributeValues: { ":db": currentDeletedBy, ":ts": Date.now() },
    }),
  );
};

// ── DIRECT conversation helpers ──────────────────────────────────────────────

/**
 * Get a specific user's conversation record using GetItem (fast, O(1)).
 */
const getUserConversationRecord = async (userId, conversationId) => {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE,
      Key: { PK: `USER#${userId}`, SK: `CONV#${conversationId}` },
    })
  );
  return result.Item || null;
};

/**
 * Create a DIRECT (friend) conversation — stores TWO records so each user
 * can find it via getConversationsByUser.
 */
const createDirectConversation = async (user1Id, user2Id) => {
  const conversationId = uuidv4();
  const now = Date.now();
  const base = {
    conversationId,
    lastMessage: "",
    lastMessageAt: now,
    unreadUser: 0,
    ttl: getTTL(),
    conversationType: "DIRECT",
    friendshipStatus: "NONE",
  };
  await Promise.all([
    docClient.send(new PutCommand({
      TableName: TABLE,
      Item: { PK: `USER#${user1Id}`, SK: `CONV#${conversationId}`, ...base, userId: user1Id, sellerId: user2Id },
    })),
    docClient.send(new PutCommand({
      TableName: TABLE,
      Item: { PK: `USER#${user2Id}`, SK: `CONV#${conversationId}`, ...base, userId: user2Id, sellerId: user1Id },
    })),
  ]);
  return { conversationId, ...base, userId: user1Id, sellerId: user2Id };
};

/** Find an existing DIRECT conversation between two users (from user1's perspective). */
const findExistingDirectConversation = async (user1Id, user2Id) => {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
      FilterExpression:
        "sellerId = :sellerId AND conversationType = :type" +
        " AND (attribute_not_exists(deletedBy) OR NOT contains(deletedBy, :userId))",
      ExpressionAttributeValues: {
        ":pk": `USER#${user1Id}`,
        ":skPrefix": "CONV#",
        ":sellerId": user2Id,
        ":type": "DIRECT",
        ":userId": user1Id,
      },
    })
  );
  return result.Items && result.Items.length > 0 ? result.Items[0] : null;
};

/**
 * Update last message on BOTH participant records of a DIRECT conversation.
 * Increments unreadUser only on the recipient's record.
 */
const updateDirectLastMessage = async (conversationId, senderId, recipientId, message) => {
  const now = Date.now();
  // Friend request/accept messages have JSON content like {fromUserId,toUserId}
  // — store a human-readable preview instead of the raw JSON so it doesn't leak
  // into the sidebar.
  let preview;
  if (message.type === "FRIEND_REQUEST") {
    preview = "[Lời mời kết bạn]";
  } else if (message.type === "FRIEND_ACCEPT") {
    preview = "[Đã chấp nhận kết bạn]";
  } else {
    preview = typeof message.content === "string" ? message.content.substring(0, 100) : "";
  }
  await Promise.all([
    docClient.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: `USER#${senderId}`, SK: `CONV#${conversationId}` },
      // Also REMOVE deletedBy so the conv reappears in the sender's list after
      // they previously soft-deleted it (re-engagement = un-delete).
      UpdateExpression: "SET lastMessage = :msg, lastMessageAt = :ts, #ttl = :ttl REMOVE deletedBy",
      ExpressionAttributeNames: { "#ttl": "ttl" },
      ExpressionAttributeValues: { ":msg": preview, ":ts": now, ":ttl": getTTL() },
    })),
    docClient.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: `USER#${recipientId}`, SK: `CONV#${conversationId}` },
      // Same for recipient: an incoming message brings the conv back to their list.
      UpdateExpression: "SET lastMessage = :msg, lastMessageAt = :ts, #ttl = :ttl, unreadUser = if_not_exists(unreadUser, :zero) + :one REMOVE deletedBy",
      ExpressionAttributeNames: { "#ttl": "ttl" },
      ExpressionAttributeValues: { ":msg": preview, ":ts": now, ":ttl": getTTL(), ":one": 1, ":zero": 0 },
    })),
  ]);
};

/**
 * Like getConversationsByUser/BySeller but DOES include soft-deleted records.
 * Used by friend list so friendships stay visible after a conv soft-delete.
 */
const getAllUserConversationsAnyState = async (userId) => {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
      ExpressionAttributeValues: {
        ":pk": `USER#${userId}`,
        ":skPrefix": "CONV#",
      },
      ScanIndexForward: false,
    }),
  );
  return result.Items || [];
};

const getAllSellerConversationsAnyState = async (sellerId) => {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: "GSI1",
      KeyConditionExpression: "GSI1PK = :pk AND begins_with(GSI1SK, :skPrefix)",
      ExpressionAttributeValues: {
        ":pk": `SELLER#${sellerId}`,
        ":skPrefix": "CONV#",
      },
      ScanIndexForward: false,
    }),
  );
  return result.Items || [];
};

/** Find DIRECT conv between two users, ignoring soft-delete state. */
const findDirectConversationAnyState = async (user1Id, user2Id) => {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
      FilterExpression: "sellerId = :sellerId AND conversationType = :type",
      ExpressionAttributeValues: {
        ":pk": `USER#${user1Id}`,
        ":skPrefix": "CONV#",
        ":sellerId": user2Id,
        ":type": "DIRECT",
      },
    }),
  );
  return result.Items && result.Items.length > 0 ? result.Items[0] : null;
};

/** Reset unread count on a specific user's own DIRECT conversation record. */
const resetDirectUnread = async (userId, conversationId) => {
  await docClient.send(new UpdateCommand({
    TableName: TABLE,
    Key: { PK: `USER#${userId}`, SK: `CONV#${conversationId}` },
    UpdateExpression: "SET unreadUser = :zero",
    ExpressionAttributeValues: { ":zero": 0 },
  }));
};

/**
 * Update friendshipStatus on both participants' records.
 * Khi status = PENDING, lưu thêm `requestSentBy` (userId gửi lời mời) để phía
 * nhận có thể accept; phía gửi không thể tự accept.
 * Khi status khác (ACCEPTED/NONE), xoá `requestSentBy`.
 *
 * QUAN TRỌNG: dùng ConditionExpression `attribute_exists(PK)` để DynamoDB
 * không tự tạo item rỗng khi record không tồn tại. Trước đây với PRODUCT conv
 * chỉ có buyer's record, update bên seller tạo ra orphan stub không có
 * userId/sellerId, khiến sendMessage sau đó không xác định được recipient.
 */
const updateFriendshipStatus = async (conversationId, userId1, userId2, status, requestSentBy = null) => {
  const isPending = status === "PENDING" && !!requestSentBy;
  const updateExpr = isPending
    ? "SET friendshipStatus = :s, requestSentBy = :req"
    : "SET friendshipStatus = :s REMOVE requestSentBy";
  const exprValues = isPending
    ? { ":s": status, ":req": requestSentBy }
    : { ":s": status };

  const updateOne = (userId) => docClient.send(new UpdateCommand({
    TableName: TABLE,
    Key: { PK: `USER#${userId}`, SK: `CONV#${conversationId}` },
    UpdateExpression: updateExpr,
    ConditionExpression: "attribute_exists(PK)",
    ExpressionAttributeValues: exprValues,
  })).catch((err) => {
    // ConditionalCheckFailed = record không tồn tại (vd: PRODUCT conv chỉ có
    // 1 record của buyer, seller không có) — bỏ qua, không tạo stub rỗng.
    if (err?.name !== 'ConditionalCheckFailedException') throw err;
  });

  await Promise.all([updateOne(userId1), updateOne(userId2)]);
};

module.exports = {
  createConversation,
  findExistingConversation,
  getConversationsByUser,
  getConversationsBySeller,
  getConversationById: scanConversationById,
  updateLastMessage,
  resetUnread,
  deleteConversation,
  // DIRECT conversation helpers
  getUserConversationRecord,
  createDirectConversation,
  findExistingDirectConversation,
  findDirectConversationAnyState,
  updateDirectLastMessage,
  resetDirectUnread,
  updateFriendshipStatus,
  // Helpers that include soft-deleted records (used by friend list)
  getAllUserConversationsAnyState,
  getAllSellerConversationsAnyState,
};
