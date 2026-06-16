const groupMemberModel = require('../models/groupMemberModel');

/**
 * Mute a group for a user.
 * @param {string} groupId
 * @param {string} userId
 * @param {number} durationMs  -1 = forever
 * @param {boolean} mentionsOnly  true = still notify on @mention
 */
const muteGroup = async (groupId, userId, durationMs, mentionsOnly = false) => {
  const mutedUntil =
    durationMs === -1
      ? 'FOREVER'
      : new Date(Date.now() + durationMs).toISOString();

  await groupMemberModel.setMute(groupId, userId, mutedUntil, mentionsOnly);
  return { mutedUntil, mentionsOnly };
};

const unmuteGroup = async (groupId, userId) => {
  await groupMemberModel.unsetMute(groupId, userId);
};

/**
 * Decide whether to push a notification to a member.
 * @param {object} member  member record with mutedUntil, muteMentionsOnly
 * @param {boolean} isMention  true if this message @mentions the member
 */
const shouldNotify = (member, isMention = false) => {
  const { mutedUntil, muteMentionsOnly } = member;

  if (!mutedUntil) return true; // not muted

  if (mutedUntil === 'FOREVER') {
    // Still notify if mentions-only mode and this is a mention
    return muteMentionsOnly && isMention;
  }

  // Check if mute has expired
  if (new Date(mutedUntil) < new Date()) {
    // Auto-unset asynchronously — don't block the request
    groupMemberModel.unsetMute(member.groupId, member.userId).catch(() => {});
    return true;
  }

  // Within mute window
  if (muteMentionsOnly && isMention) return true;
  return false;
};

module.exports = {
  muteGroup,
  unmuteGroup,
  shouldNotify,
};
