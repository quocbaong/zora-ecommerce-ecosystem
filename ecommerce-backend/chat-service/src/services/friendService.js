const https = require('https');
const http = require('http');
const conversationModel = require('../models/conversationModel');
const messageModel = require('../models/messageModel');
const { getIO } = require('../config/socket');

const _rawUserServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:8082';
const USER_SERVICE_URL = _rawUserServiceUrl.startsWith('http') ? _rawUserServiceUrl : `http://${_rawUserServiceUrl}`;

const _rawAuthServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:8081';
const AUTH_SERVICE_URL = _rawAuthServiceUrl.startsWith('http') ? _rawAuthServiceUrl : `http://${_rawAuthServiceUrl}`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * HTTP GET (1 lần thử) — hỗ trợ http và https.
 */
const httpGetOnce = (url) =>
  new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 400) {
          const err = new Error(`HTTP ${res.statusCode}`);
          err.statusCode = res.statusCode;
          return reject(err);
        }
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });

/**
 * HTTP GET có retry: thử lại tối đa 3 lần, cách nhau 3s.
 * Chỉ retry lỗi TẠM THỜI (mất kết nối/timeout/5xx); KHÔNG retry 4xx (vd 404 user not found).
 */
const httpGet = async (url, maxAttempts = 3, delayMs = 3000) => {
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await httpGetOnce(url);
    } catch (err) {
      lastErr = err;
      const retryable = !err.statusCode || err.statusCode >= 500;
      if (!retryable || attempt === maxAttempts) break;
      await sleep(delayMs);
    }
  }
  throw lastErr;
};

/**
 * Search for a user by email:
 * 1. Auth-service (always has emails from registration) → get userId
 * 2. User-service → get profile by userId (may not have email yet for old users)
 */
const searchUserByEmail = async (email) => {
  // Step 1: resolve userId from auth-service
  const authData = await httpGet(
    `${AUTH_SERVICE_URL}/auth/internal/user-by-email?email=${encodeURIComponent(email)}`
  );
  const userId = authData.id;

  // Step 2: get profile from user-service (best-effort; fall back to auth data)
  try {
    const profile = await httpGet(`${USER_SERVICE_URL}/users/${userId}`);
    return { ...profile, email: profile.email || authData.email };
  } catch (_) {
    // Profile not created yet in user-service
    return { id: userId, email: authData.email };
  }
};

/**
 * Get or create a conversation between two users.
 * Always reuses an existing DIRECT conversation even if one side has soft-deleted
 * their copy — deletion is per-user history clearing and must not destroy the
 * friendship link (or duplicate the conv with a fresh friendshipStatus=NONE).
 */
const getOrCreateDirectConversation = async (user1Id, user2Id) => {
  // 1. Existing DIRECT from user1's view (any state, including soft-deleted)
  let conv = await conversationModel.findDirectConversationAnyState(user1Id, user2Id);
  if (conv) return conv;

  // 2. Existing DIRECT from user2's view
  conv = await conversationModel.findDirectConversationAnyState(user2Id, user1Id);
  if (conv) return conv;

  // 3. Reuse existing PRODUCT conversation (buyer→seller direction)
  const user1Convs = await conversationModel.getConversationsByUser(user1Id);
  const productAsUser1 = user1Convs.find((c) => c.sellerId === user2Id);
  if (productAsUser1) return productAsUser1;

  // 4. Reuse existing PRODUCT conversation (seller→buyer direction — user2 is buyer)
  const user2Convs = await conversationModel.getConversationsByUser(user2Id);
  const productAsUser2 = user2Convs.find((c) => c.sellerId === user1Id);
  if (productAsUser2) {
    const user1Record = user1Convs.find((c) => c.conversationId === productAsUser2.conversationId);
    if (user1Record) return user1Record;
  }

  // 5. No usable existing conversation — create new DIRECT
  return conversationModel.createDirectConversation(user1Id, user2Id);
};

/**
 * Send a friend request:
 * 1. Get or create DIRECT conversation
 * 2. Set friendshipStatus = PENDING on both records
 * 3. Send a FRIEND_REQUEST message
 */
const sendFriendRequest = async (fromUserId, toUserId, senderRole) => {
  const conversation = await getOrCreateDirectConversation(fromUserId, toUserId);
  const conversationId = conversation.conversationId;

  // Only allow sending if status is NONE
  const fromRecord = await conversationModel.getUserConversationRecord(fromUserId, conversationId);
  if (fromRecord && fromRecord.friendshipStatus && fromRecord.friendshipStatus !== 'NONE') {
    return { conversation, alreadySent: true };
  }

  // Set PENDING + lưu ai là người gửi để phía nhận có thể accept đúng,
  // tránh trường hợp sender tự accept request của chính mình.
  await conversationModel.updateFriendshipStatus(conversationId, fromUserId, toUserId, 'PENDING', fromUserId);

  const message = await messageModel.createMessage({
    conversationId,
    senderId: fromUserId,
    senderRole: senderRole || 'USER',
    type: 'FRIEND_REQUEST',
    content: JSON.stringify({ fromUserId, toUserId }),
  });

  await conversationModel.updateDirectLastMessage(conversationId, fromUserId, toUserId, message);

  try {
    const io = getIO();
    io.to(conversationId).emit('new_message', { message });
    io.to(`user:${toUserId}`).emit('new_notification', {
      conversationId,
      fromUserId,
      preview: 'Đã gửi lời mời kết bạn',
      type: 'FRIEND_REQUEST',
      timestamp: message.SK,
    });
  } catch (_) { }

  return { conversation, message };
};

/**
 * Accept a friend request:
 * 1. Update friendshipStatus = ACCEPTED on both records
 * 2. Send a FRIEND_ACCEPT message
 */
const acceptFriendRequest = async (userId, conversationId, senderRole) => {
  const userRecord = await conversationModel.getUserConversationRecord(userId, conversationId);
  if (!userRecord) throw new Error('Conversation not found');

  // Chỉ phía RECIPIENT mới được accept, không phải bên gửi request.
  // Yêu cầu: friendshipStatus = PENDING và requestSentBy !== userId.
  if (userRecord.friendshipStatus !== 'PENDING') {
    throw new Error('Không có lời mời kết bạn đang chờ');
  }
  if (userRecord.requestSentBy && userRecord.requestSentBy === userId) {
    throw new Error('Không thể tự chấp nhận lời mời do chính bạn gửi');
  }

  // Resolve participant kia: với DIRECT record, ta lưu cặp (userId, sellerId)
  // theo góc nhìn của từng phía. otherUserId là phía còn lại trong cặp đó.
  const otherUserId = userRecord.userId === userId ? userRecord.sellerId : userRecord.userId;
  if (!otherUserId) throw new Error('Không xác định được người gửi lời mời');

  await conversationModel.updateFriendshipStatus(conversationId, userId, otherUserId, 'ACCEPTED');

  const message = await messageModel.createMessage({
    conversationId,
    senderId: userId,
    senderRole: senderRole || 'USER',
    type: 'FRIEND_ACCEPT',
    content: JSON.stringify({ fromUserId: otherUserId, toUserId: userId }),
  });

  await conversationModel.updateDirectLastMessage(conversationId, userId, otherUserId, message);

  try {
    const io = getIO();
    io.to(conversationId).emit('new_message', { message });
    io.to(`user:${otherUserId}`).emit('new_notification', {
      conversationId,
      fromUserId: userId,
      preview: 'Đã chấp nhận lời mời kết bạn',
      type: 'FRIEND_ACCEPT',
      timestamp: message.SK,
    });
  } catch (_) { }

  return { message };
};

/**
 * Get all accepted friends — any conversation (DIRECT or PRODUCT) with friendshipStatus = ACCEPTED.
 */
const getFriends = async (userId) => {
  // Include soft-deleted records so friends stay visible after a conv delete.
  const [userConvs, sellerConvs] = await Promise.all([
    conversationModel.getAllUserConversationsAnyState(userId),
    conversationModel.getAllSellerConversationsAnyState(userId),
  ]);

  const accepted = [...userConvs, ...sellerConvs].filter((c) => c.friendshipStatus === 'ACCEPTED');

  // Dedupe by the OTHER user's id, not by conversationId — one user may have
  // both a PRODUCT and a DIRECT conv with the same friend; we only want one
  // entry per actual friend. Prefer DIRECT (the friend-chat thread).
  const byOtherUser = new Map();
  for (const conv of accepted) {
    const otherId = conv.userId === userId ? conv.sellerId : conv.userId;
    if (!otherId) continue;
    const existing = byOtherUser.get(otherId);
    if (!existing) {
      byOtherUser.set(otherId, conv);
    } else if (conv.conversationType === 'DIRECT' && existing.conversationType !== 'DIRECT') {
      byOtherUser.set(otherId, conv);
    }
  }

  return Array.from(byOtherUser.values());
};

module.exports = {
  searchUserByEmail,
  getOrCreateDirectConversation,
  sendFriendRequest,
  acceptFriendRequest,
  getFriends,
};
