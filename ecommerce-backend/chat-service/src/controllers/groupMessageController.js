const groupMessageService = require('../services/groupMessageService');
const groupMuteService = require('../services/groupMuteService');

const handleErr = (res, err) => {
  const status = err.status || 500;
  res.status(status).json({ success: false, error: err.message });
};

const getGroupMessages = async (req, res) => {
  try {
    const { limit = 30, lastKey } = req.query;
    const result = await groupMessageService.getGroupMessages(
      req.params.groupId,
      req.userId,
      Number(limit),
      lastKey || null
    );
    res.json({ success: true, data: result });
  } catch (err) { handleErr(res, err); }
};

const sendGroupMessage = async (req, res) => {
  try {
    const { type = 'TEXT', content, replyTo, mentions, important = false, isForwarded, forwardedFrom } = req.body;
    if (!content && type === 'TEXT') {
      return res.status(400).json({ success: false, error: 'Nội dung tin nhắn là bắt buộc' });
    }
    const reportService = require('../services/reportService');
    const userMeta = await reportService.getUserMetadata(req.userId);
    if (userMeta && userMeta.mutedUntil && new Date(userMeta.mutedUntil) > new Date()) {
        return res.status(403).json({ success: false, error: "Bạn đã bị cấm chat đến " + new Date(userMeta.mutedUntil).toLocaleString() });
    }
    const message = await groupMessageService.sendGroupMessage({
      groupId: req.params.groupId,
      senderId: req.userId,
      senderRole: req.userRole,
      type,
      content,
      replyTo: replyTo || null,
      mentions: mentions || [],
      important,
      isForwarded: !!isForwarded,
      forwardedFrom: forwardedFrom || null,
    });
    res.status(201).json({ success: true, data: message });
  } catch (err) { handleErr(res, err); }
};

const recallGroupMessage = async (req, res) => {
  try {
    const result = await groupMessageService.recallGroupMessage(
      req.params.groupId,
      req.params.msgId,
      req.userId
    );
    res.json({ success: true, data: result });
  } catch (err) { handleErr(res, err); }
};

const deleteGroupMessage = async (req, res) => {
  try {
    await groupMessageService.deleteGroupMessage(req.params.groupId, req.params.msgId, req.userId);
    res.json({ success: true });
  } catch (err) { handleErr(res, err); }
};

const addGroupReaction = async (req, res) => {
  try {
    const { emoji } = req.body;
    if (!emoji) return res.status(400).json({ success: false, error: 'emoji là bắt buộc' });
    const result = await groupMessageService.addGroupReaction(
      req.params.groupId,
      req.params.msgId,
      emoji,
      req.userId
    );
    res.json({ success: true, data: result });
  } catch (err) { handleErr(res, err); }
};

const getPinnedMessages = async (req, res) => {
  try {
    const pins = await groupMessageService.getPinnedMessages(req.params.groupId, req.userId);
    res.json({ success: true, data: pins });
  } catch (err) { handleErr(res, err); }
};

const pinMessage = async (req, res) => {
  try {
    const pin = await groupMessageService.pinMessage(req.params.groupId, req.params.msgId, req.userId);
    res.json({ success: true, data: pin });
  } catch (err) { handleErr(res, err); }
};

const unpinMessage = async (req, res) => {
  try {
    await groupMessageService.unpinMessage(req.params.groupId, req.params.msgId, req.userId);
    res.json({ success: true });
  } catch (err) { handleErr(res, err); }
};

const markAsRead = async (req, res) => {
  try {
    await groupMessageService.markAsRead(req.params.groupId, req.userId);
    res.json({ success: true });
  } catch (err) { handleErr(res, err); }
};

const muteGroup = async (req, res) => {
  try {
    const { durationMs = -1, mentionsOnly = false } = req.body;
    const result = await groupMuteService.muteGroup(req.params.groupId, req.userId, durationMs, mentionsOnly);
    res.json({ success: true, data: result });
  } catch (err) { handleErr(res, err); }
};

const unmuteGroup = async (req, res) => {
  try {
    await groupMuteService.unmuteGroup(req.params.groupId, req.userId);
    res.json({ success: true });
  } catch (err) { handleErr(res, err); }
};

module.exports = {
  getGroupMessages,
  sendGroupMessage,
  recallGroupMessage,
  deleteGroupMessage,
  addGroupReaction,
  getPinnedMessages,
  pinMessage,
  unpinMessage,
  markAsRead,
  muteGroup,
  unmuteGroup,
};
