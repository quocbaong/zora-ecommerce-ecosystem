const pollModel = require('../models/pollModel');
const pollVoteModel = require('../models/pollVoteModel');
const groupMessageModel = require('../models/groupMessageModel');
const { requireMember } = require('./groupService');
const { getIO } = require('../config/socket');

const safeEmit = (fn) => {
  try { fn(); } catch (_) {}
};

const createPoll = async (groupId, senderId, question, options, isMultiple, autoCloseAt = null) => {
  await requireMember(groupId, senderId);

  // Create placeholder message — content will be set to pollId below
  const message = await groupMessageModel.createGroupMessage({
    groupId,
    senderId,
    type: 'POLL',
    content: '_pending_',
  });

  const poll = await pollModel.createPoll(
    groupId, message.messageId, question, options, isMultiple, senderId, autoCloseAt
  );

  // Patch message content in DB to store pollId permanently
  await groupMessageModel.updateGroupMessageContent(groupId, message.messageId, poll.pollId);

  const finalMessage = { ...message, content: poll.pollId };

  safeEmit(() => {
    const io = getIO();
    io.to(`group:${groupId}`).emit('new_group_message', {
      groupId,
      message: finalMessage,
      poll,
    });
  });

  return { message: finalMessage, poll };
};

/**
 * Helper: re-emit the poll message with correct pollId content and bumped timestamp.
 */
const reEmitPollMessage = async (groupId, poll) => {
  const pollMessage = await groupMessageModel.getGroupMessageById(groupId, poll.messageId);
  if (!pollMessage) return;
  safeEmit(() => {
    const io = getIO();
    io.to(`group:${groupId}`).emit('new_group_message', {
      groupId,
      // Always override content with pollId so clients can look it up in cache
      message: { ...pollMessage, content: poll.pollId, createdAt: new Date().toISOString() },
      poll,
    });
  });
};

const enrichPollWithCounts = async (poll) => {
  if (!poll) return null;
  const counts = await pollVoteModel.countVotesForPoll(poll.pollId);
  poll.options = (poll.options || []).map(opt => ({
    ...opt,
    voteCount: counts[opt.optionId] || 0
  }));
  return poll;
};

const vote = async (groupId, pollId, optionIds, userId) => {
  await requireMember(groupId, userId);

  const poll = await pollModel.getPoll(groupId, pollId);
  if (!poll) throw Object.assign(new Error('Bình chọn không tồn tại'), { status: 404 });
  if (poll.closedAt) throw Object.assign(new Error('Bình chọn đã kết thúc'), { status: 400 });
  // Auto-close check
  if (poll.autoCloseAt && Date.now() > poll.autoCloseAt) {
    await pollModel.closePoll(groupId, pollId).catch(() => {});
    throw Object.assign(new Error('Bình chọn đã hết thời gian'), { status: 400 });
  }

  const validIds = poll.options.map((o) => o.optionId);
  const invalid = optionIds.filter((id) => !validIds.includes(id));
  if (invalid.length > 0) throw Object.assign(new Error('Option không hợp lệ'), { status: 400 });
  if (!poll.isMultiple && optionIds.length > 1) {
    throw Object.assign(new Error('Bình chọn này chỉ cho phép chọn 1 đáp án'), { status: 400 });
  }

  await pollVoteModel.vote(groupId, pollId, userId, optionIds);
  const updated = await pollModel.getPoll(groupId, pollId);
  const enriched = await enrichPollWithCounts(updated);

  safeEmit(() => {
    const io = getIO();
    io.to(`group:${groupId}`).emit('poll_updated', {
      groupId, pollId, options: enriched.options, closed: !!enriched.closedAt,
    });
  });

  await reEmitPollMessage(groupId, enriched);
  return enriched;
};

const unvote = async (groupId, pollId, userId) => {
  await requireMember(groupId, userId);

  const poll = await pollModel.getPoll(groupId, pollId);
  if (!poll) throw Object.assign(new Error('Bình chọn không tồn tại'), { status: 404 });
  if (poll.closedAt) throw Object.assign(new Error('Bình chọn đã kết thúc'), { status: 400 });

  await pollVoteModel.unvote(groupId, pollId, userId);
  const updated = await pollModel.getPoll(groupId, pollId);
  const enriched = await enrichPollWithCounts(updated);

  safeEmit(() => {
    const io = getIO();
    io.to(`group:${groupId}`).emit('poll_updated', {
      groupId, pollId, options: enriched.options, closed: false,
    });
  });

  await reEmitPollMessage(groupId, enriched);
  return enriched;
};

const closePoll = async (groupId, pollId, requesterId) => {
  await requireMember(groupId, requesterId);

  const poll = await pollModel.getPoll(groupId, pollId);
  if (!poll) throw Object.assign(new Error('Bình chọn không tồn tại'), { status: 404 });
  if (poll.closedAt) throw Object.assign(new Error('Bình chọn đã kết thúc'), { status: 400 });

  const member = await (require('./groupService')).requireMember(groupId, requesterId);
  if (poll.createdBy !== requesterId && member.role === 'MEMBER') {
    throw Object.assign(new Error('Không có quyền kết thúc bình chọn này'), { status: 403 });
  }

  await pollModel.closePoll(groupId, pollId);
  const enriched = await enrichPollWithCounts(poll);

  safeEmit(() => {
    const io = getIO();
    io.to(`group:${groupId}`).emit('poll_updated', {
      groupId, pollId, options: enriched.options, closed: true,
    });
  });
};

const getPoll = async (groupId, pollId, requesterId) => {
  await requireMember(groupId, requesterId);
  const poll = await pollModel.getPoll(groupId, pollId);
  if (!poll) throw Object.assign(new Error('Bình chọn không tồn tại'), { status: 404 });
  const enriched = await enrichPollWithCounts(poll);

  const myVote = await pollVoteModel.getVote(pollId, requesterId);
  return { ...enriched, myVote: myVote ? myVote.optionIds : [] };
};

const listPolls = async (groupId, requesterId) => {
  await requireMember(groupId, requesterId);
  const polls = await pollModel.listPolls(groupId);
  const enrichedPolls = [];
  for (const poll of polls) {
    enrichedPolls.push(await enrichPollWithCounts(poll));
  }
  return enrichedPolls;
};

/**
 * Auto-close polls whose autoCloseAt has passed. Called by setInterval.
 */
const checkAutoClosePolls = async () => {
  try {
    const due = await pollModel.listDueAutoClose();
    for (const poll of due) {
      const { groupId, pollId } = poll;
      await pollModel.closePoll(groupId, pollId).catch(() => {});
      safeEmit(() => {
        const io = getIO();
        io.to(`group:${groupId}`).emit('poll_updated', {
          groupId, pollId, options: poll.options, closed: true,
        });
      });
      // Re-emit message so card updates to closed state in chat
      await reEmitPollMessage(groupId, { ...poll, closedAt: new Date().toISOString() });
    }
  } catch (err) {
    console.error('[pollService] checkAutoClosePolls error:', err.message);
  }
};

module.exports = {
  createPoll,
  vote,
  unvote,
  closePoll,
  getPoll,
  listPolls,
  checkAutoClosePolls,
};
