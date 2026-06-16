const groupMessageModel = require('../models/groupMessageModel');
const groupPinModel = require('../models/groupPinModel');
const groupMemberModel = require('../models/groupMemberModel');
const groupModel = require('../models/groupModel');
const { requireMember, requireOwnerOrDeputy } = require('./groupService');
const { getIO } = require('../config/socket');
const groupMuteService = require('./groupMuteService');
const reportService = require('./reportService');

const safeEmit = (fn) => {
  try { fn(); } catch (_) {}
};

const sendGroupMessage = async ({ groupId, senderId, senderRole = 'USER', type = 'TEXT', content, replyTo = null, mentions = [], important = false, isForwarded = false, forwardedFrom = null }) => {
  // Check banned/muted status
  const userMetadata = await reportService.getUserMetadata(senderId);
  if (userMetadata) {
    if (userMetadata.banned) {
      throw Object.assign(new Error("Tài khoản của bạn đã bị khóa vĩnh viễn."), { status: 403 });
    }
    if (userMetadata.mutedUntil && new Date(userMetadata.mutedUntil) > new Date()) {
      throw Object.assign(new Error(`Bạn đang bị hạn chế chat đến ${userMetadata.mutedUntil}`), { status: 403 });
    }
  }

  const member = await requireMember(groupId, senderId);

  // Check if posting is restricted to owner/deputy only
  const group = await groupModel.getGroupById(groupId);
  if (group && group.allowMemberPost === false && member.role === 'MEMBER') {
    throw Object.assign(new Error('Chỉ trưởng nhóm và phó nhóm mới được gửi tin nhắn'), { status: 403 });
  }

  const message = await groupMessageModel.createGroupMessage({
    groupId,
    senderId,
    senderRole,
    type,
    content,
    replyTo,
    mentions,
    important,
    isForwarded,
    forwardedFrom,
  });

  const members = await groupMemberModel.listMembers(groupId);

  safeEmit(() => {
    const io = getIO();
    // Broadcast to group room (for members currently viewing this group)
    io.to(`group:${groupId}`).emit('new_group_message', { groupId, message });

    // Also deliver to each member's personal room so they receive the message
    // even when they're in a different chat or haven't joined the group socket room.
    members.forEach((m) => {
      io.to(`user:${m.userId}`).emit('new_group_message', { groupId, message });

      // Push notification (only for non-sender, non-muted members)
      if (m.userId !== senderId) {
        const isMention = mentions.includes(m.userId);
        const shouldNotify = groupMuteService.shouldNotify(m, isMention);
        if (shouldNotify) {
          io.to(`user:${m.userId}`).emit('new_notification', {
            groupId,
            fromUserId: senderId,
            preview: type === 'TEXT' ? content?.slice(0, 60) : `[${type}]`,
            type: 'GROUP_MESSAGE',
            timestamp: message.createdAt,
          });
        }
      }
    });
  });

  // Increment unread for all members except sender + update group lastMessageAt (fire-and-forget)
  Promise.all([
    ...members
      .filter((m) => m.userId !== senderId)
      .map((m) => groupMemberModel.incrementUnread(groupId, m.userId)),
    groupModel.updateGroupLastMessage(groupId, message.createdAt, {
      preview: type === 'TEXT' ? content : '',
      type,
      senderId,
    }),
  ]).catch(() => {});

  return message;
};

/**
 * Save a system/CALL message without member check — for internal use (e.g. call records).
 */
const sendSystemGroupMessage = async ({ groupId, senderId, type = 'CALL', content }) => {
  const message = await groupMessageModel.createGroupMessage({
    groupId,
    senderId,
    senderRole: 'USER',
    type,
    content,
  });

  const members = await groupMemberModel.listMembers(groupId).catch(() => []);
  Promise.all([
    ...members
      .filter((m) => m.userId !== senderId)
      .map((m) => groupMemberModel.incrementUnread(groupId, m.userId)),
    groupModel.updateGroupLastMessage(groupId, message.createdAt, {
      preview: type === 'TEXT' ? content : '',
      type,
      senderId,
    }),
  ]).catch(() => {});

  return message;
};

const getGroupMessages = async (groupId, userId, limit = 30, lastKey = null) => {
  const member = await requireMember(groupId, userId);
  const clearedAt = member.clearedAt || 0;
  return groupMessageModel.getGroupMessages(groupId, userId, limit, lastKey, clearedAt);
};

const recallGroupMessage = async (groupId, messageId, requesterId) => {
  const member = await requireMember(groupId, requesterId);

  const msg = await groupMessageModel.getGroupMessageById(groupId, messageId);
  if (!msg) throw Object.assign(new Error('Tin nhắn không tồn tại'), { status: 404 });

  // Only sender OR owner/deputy can recall
  if (msg.senderId !== requesterId && member.role === 'MEMBER') {
    throw Object.assign(new Error('Không có quyền thu hồi tin nhắn này'), { status: 403 });
  }

  const recalled = await groupMessageModel.recallGroupMessage(groupId, messageId);

  safeEmit(() => {
    const io = getIO();
    io.to(`group:${groupId}`).emit('group_message_recalled', { groupId, messageId });
  });

  return recalled;
};

const deleteGroupMessage = async (groupId, messageId, requesterId) => {
  await requireMember(groupId, requesterId);
  return groupMessageModel.softDeleteGroupMessage(groupId, messageId, requesterId);
};

const addGroupReaction = async (groupId, messageId, emoji, userId) => {
  await requireMember(groupId, userId);
  const result = await groupMessageModel.addGroupReaction(groupId, messageId, emoji, userId);

  safeEmit(() => {
    const io = getIO();
    io.to(`group:${groupId}`).emit('group_reaction_updated', { groupId, messageId, reactions: result.reactions });
  });

  return result;
};

const MAX_PINS_PER_GROUP = 5;

const pinMessage = async (groupId, messageId, requesterId) => {
  await requireMember(groupId, requesterId);

  // Enforce max pin limit
  const existingPins = await groupPinModel.listPinnedMessages(groupId);
  if (existingPins.some((p) => p.messageId === messageId)) {
    throw Object.assign(new Error('Tin nhắn này đã được ghim'), { status: 409 });
  }
  if (existingPins.length >= MAX_PINS_PER_GROUP) {
    throw Object.assign(
      new Error(`Chỉ được ghim tối đa ${MAX_PINS_PER_GROUP} tin nhắn. Hãy bỏ ghim bớt rồi thử lại.`),
      { status: 400 },
    );
  }

  const msg = await groupMessageModel.getGroupMessageById(groupId, messageId);
  if (!msg) throw Object.assign(new Error('Tin nhắn không tồn tại'), { status: 404 });

  const pin = await groupPinModel.pinMessage({
    groupId,
    messageId,
    pinnedBy: requesterId,
    senderId: msg.senderId,
    type: msg.type,
    content: msg.content,
  });

  await groupMessageModel.setPinned(groupId, messageId, true);

  safeEmit(() => {
    const io = getIO();
    io.to(`group:${groupId}`).emit('group_message_pinned', { groupId, pin });
  });

  return pin;
};

const unpinMessage = async (groupId, messageId, requesterId) => {
  await requireMember(groupId, requesterId);

  await groupPinModel.unpinMessage(groupId, messageId);
  await groupMessageModel.setPinned(groupId, messageId, false);

  safeEmit(() => {
    const io = getIO();
    io.to(`group:${groupId}`).emit('group_message_unpinned', { groupId, messageId });
  });
};

const getPinnedMessages = async (groupId, requesterId) => {
  await requireMember(groupId, requesterId);
  return groupPinModel.listPinnedMessages(groupId);
};

const markAsRead = async (groupId, userId) => {
  await groupMemberModel.resetUnread(groupId, userId);
};

module.exports = {
  sendGroupMessage,
  sendSystemGroupMessage,
  getGroupMessages,
  recallGroupMessage,
  deleteGroupMessage,
  addGroupReaction,
  pinMessage,
  unpinMessage,
  getPinnedMessages,
  markAsRead,
};
