const groupModel = require('../models/groupModel');
const groupMemberModel = require('../models/groupMemberModel');
const { getIO } = require('../config/socket');
const { v4: uuidv4 } = require('uuid');

// ─── helpers ────────────────────────────────────────────────────────────────

const safeEmit = (fn) => {
  try { fn(); } catch (_) {}
};

/** Verify requester is a member; returns member record or throws */
const requireMember = async (groupId, userId) => {
  const member = await groupMemberModel.getMember(groupId, userId);
  if (!member) throw Object.assign(new Error('Bạn không phải thành viên nhóm này'), { status: 403 });
  return member;
};

/** Verify requester has OWNER or DEPUTY role */
const requireOwnerOrDeputy = async (groupId, userId) => {
  const member = await requireMember(groupId, userId);
  if (member.role !== 'OWNER' && member.role !== 'DEPUTY') {
    throw Object.assign(new Error('Chỉ trưởng nhóm hoặc phó nhóm mới có quyền này'), { status: 403 });
  }
  return member;
};

/** Verify requester is OWNER */
const requireOwner = async (groupId, userId) => {
  const member = await requireMember(groupId, userId);
  if (member.role !== 'OWNER') {
    throw Object.assign(new Error('Chỉ trưởng nhóm mới có quyền này'), { status: 403 });
  }
  return member;
};

// ─── Group CRUD ──────────────────────────────────────────────────────────────

/**
 * Create a new group, add creator as OWNER, add initial members.
 */
const createGroup = async ({ creatorId, name, description = '', avatarUrl = '', initialMemberIds = [] }) => {
  const uniqueMembers = [...new Set(initialMemberIds)].filter((id) => id !== creatorId);
  if (uniqueMembers.length < 2) {
    throw Object.assign(new Error('Nhóm phải có ít nhất 2 thành viên khác ngoài bạn'), { status: 400 });
  }

  const group = await groupModel.createGroup(creatorId, name, description, avatarUrl);
  const { groupId } = group;

  // Add creator as OWNER
  await groupMemberModel.addMember(groupId, creatorId, 'OWNER');

  // Add initial members
  await Promise.all(uniqueMembers.map((uid) => groupMemberModel.addMember(groupId, uid, 'MEMBER')));

  const memberCount = 1 + uniqueMembers.length;
  await groupModel.updateGroup(groupId, { memberCount });

  // Notify each member about new group
  safeEmit(() => {
    const io = getIO();
    const allMembers = [creatorId, ...uniqueMembers];
    allMembers.forEach((uid) => {
      io.to(`user:${uid}`).emit('group_created', { groupId, name, avatarUrl });
    });
  });

  return { ...group, memberCount };
};

const getGroup = async (groupId, requesterId) => {
  await requireMember(groupId, requesterId);
  return groupModel.getGroupById(groupId);
};

const updateGroupInfo = async (groupId, requesterId, fields) => {
  await requireOwnerOrDeputy(groupId, requesterId);
  const updated = await groupModel.updateGroup(groupId, fields);

  safeEmit(() => {
    const io = getIO();
    io.to(`group:${groupId}`).emit('group_info_updated', {
      groupId,
      ...fields,
    });
  });

  return updated;
};

const deleteGroup = async (groupId, requesterId) => {
  await requireOwner(groupId, requesterId);

  // Remove all members first
  const members = await groupMemberModel.listMembers(groupId);
  await Promise.all(members.map((m) => groupMemberModel.removeMember(groupId, m.userId)));

  await groupModel.deleteGroup(groupId);

  safeEmit(() => {
    const io = getIO();
    io.to(`group:${groupId}`).emit('group_deleted', { groupId });
  });
};

const listUserGroups = async (userId) => {
  return groupModel.listGroupsByUser(userId);
};

// ─── Member management ───────────────────────────────────────────────────────

const addMembers = async (groupId, requesterId, userIds) => {
  await requireMember(groupId, requesterId);

  const unique = [...new Set(userIds)];
  const added = [];

  for (const uid of unique) {
    const existing = await groupMemberModel.getMember(groupId, uid);
    if (existing) continue;
    // All members can add directly — no OWNER approval flow
    await groupMemberModel.addMember(groupId, uid, 'MEMBER');
    added.push(uid);
  }

  if (added.length > 0) {
    // Increment memberCount
    const group = await groupModel.getGroupById(groupId);
    if (group) {
      await groupModel.updateGroup(groupId, { memberCount: (group.memberCount || 0) + added.length });
    }

    // Emit a SYSTEM chat message for each added user so it appears in the
    // group conversation (Zalo-style "X được Y thêm vào nhóm").
    const groupMessageService = require('./groupMessageService');
    safeEmit(async () => {
      const io = getIO();
      io.to(`group:${groupId}`).emit('group_member_added', { groupId, userIds: added });
      for (const uid of added) {
        io.to(`user:${uid}`).emit('group_created', {
          groupId,
          name: group?.name,
          avatarUrl: group?.avatarUrl,
        });
        // Make already-connected sockets of the new member join the group room
        const sockets = await io.in(`user:${uid}`).fetchSockets();
        sockets.forEach((s) => s.join(`group:${groupId}`));

        // SYSTEM message in chat
        try {
          const sysMessage = await groupMessageService.sendSystemGroupMessage({
            groupId,
            senderId: requesterId,
            type: 'SYSTEM',
            content: JSON.stringify({ action: 'MEMBER_ADDED', userId: uid, actorId: requesterId }),
          });
          io.to(`group:${groupId}`).emit('new_group_message', { groupId, message: sysMessage });
        } catch (_) { /* non-fatal */ }
      }
    });
  }

  // Always return only `added` — no more pending list since approval is removed
  const pending = [];

  return { added, pending };
};

const getPendingMembers = async (groupId, requesterId) => {
  await requireOwner(groupId, requesterId);
  const members = await groupMemberModel.listMembers(groupId);
  return members.filter(m => m.role === 'PENDING');
};

const approveMember = async (groupId, requesterId, targetUserId) => {
  await requireOwner(groupId, requesterId);
  const member = await groupMemberModel.getMember(groupId, targetUserId);
  if (!member || member.role !== 'PENDING') {
    throw Object.assign(new Error('Yêu cầu phê duyệt không tồn tại'), { status: 404 });
  }

  await groupMemberModel.updateMemberRole(groupId, targetUserId, 'MEMBER');

  const group = await groupModel.getGroupById(groupId);
  if (group) {
    await groupModel.updateGroup(groupId, { memberCount: (group.memberCount || 0) + 1 });
  }

  safeEmit(() => {
    const io = getIO();
    io.to(`group:${groupId}`).emit('group_member_added', { groupId, userIds: [targetUserId] });
    io.to(`user:${targetUserId}`).emit('group_created', {
      groupId,
      name: group?.name,
      avatarUrl: group?.avatarUrl,
    });
  });
};

const rejectMember = async (groupId, requesterId, targetUserId) => {
  await requireOwner(groupId, requesterId);
  const member = await groupMemberModel.getMember(groupId, targetUserId);
  if (!member || member.role !== 'PENDING') {
    throw Object.assign(new Error('Yêu cầu phê duyệt không tồn tại'), { status: 404 });
  }

  await groupMemberModel.removeMember(groupId, targetUserId);

  safeEmit(() => {
    const io = getIO();
    io.to(`group:${groupId}`).emit('group_member_rejected', { groupId, userId: targetUserId });
  });
};

// Auto-dissolve the group when fewer than 2 members remain.
// Returns true if the group was dissolved.
const dissolveIfTooFewMembers = async (groupId) => {
  const remaining = await groupMemberModel.listMembers(groupId);
  if (remaining.length < 2) {
    await Promise.all(remaining.map((m) => groupMemberModel.removeMember(groupId, m.userId)));
    await groupModel.deleteGroup(groupId);
    safeEmit(() => {
      const io = getIO();
      io.to(`group:${groupId}`).emit('group_deleted', { groupId, reason: 'too_few_members' });
    });
    return true;
  }
  return false;
};

const removeMember = async (groupId, requesterId, targetUserId) => {
  const requester = await requireMember(groupId, requesterId);
  const target = await groupMemberModel.getMember(groupId, targetUserId);
  if (!target) throw Object.assign(new Error('Thành viên không tồn tại'), { status: 404 });

  // OWNER can remove anyone; DEPUTY can only remove MEMBER
  if (requester.role === 'DEPUTY' && target.role !== 'MEMBER') {
    throw Object.assign(new Error('Phó nhóm chỉ có thể xóa thành viên thường'), { status: 403 });
  }
  if (requester.role === 'MEMBER') {
    throw Object.assign(new Error('Không có quyền xóa thành viên'), { status: 403 });
  }

  await groupMemberModel.removeMember(groupId, targetUserId);

  if (await dissolveIfTooFewMembers(groupId)) return;

  const group = await groupModel.getGroupById(groupId);
  if (group) {
    await groupModel.updateGroup(groupId, { memberCount: Math.max(0, (group.memberCount || 1) - 1) });
  }

  const groupMessageService = require('./groupMessageService');
  safeEmit(async () => {
    const io = getIO();
    io.to(`group:${groupId}`).emit('group_member_removed', { groupId, userId: targetUserId });
    try {
      const sysMessage = await groupMessageService.sendSystemGroupMessage({
        groupId,
        senderId: requesterId,
        type: 'SYSTEM',
        content: JSON.stringify({ action: 'MEMBER_REMOVED', userId: targetUserId, actorId: requesterId }),
      });
      io.to(`group:${groupId}`).emit('new_group_message', { groupId, message: sysMessage });
    } catch (_) { /* non-fatal */ }
  });
};

const leaveGroup = async (groupId, userId) => {
  const member = await requireMember(groupId, userId);

  // If OWNER leaving: auto-transfer to a DEPUTY, or first MEMBER if no DEPUTY
  if (member.role === 'OWNER') {
    const deputies = await groupMemberModel.listByRole(groupId, 'DEPUTY');
    if (deputies.length > 0) {
      await groupMemberModel.updateMemberRole(groupId, deputies[0].userId, 'OWNER');
    } else {
      const members = await groupMemberModel.listMembers(groupId);
      const others = members.filter((m) => m.userId !== userId);
      if (others.length > 0) {
        await groupMemberModel.updateMemberRole(groupId, others[0].userId, 'OWNER');
      }
      // If no other members, group will be empty — delete it
      else {
        await groupMemberModel.removeMember(groupId, userId);
        await groupModel.deleteGroup(groupId);
        return;
      }
    }
  }

  await groupMemberModel.removeMember(groupId, userId);

  if (await dissolveIfTooFewMembers(groupId)) return;

  const group = await groupModel.getGroupById(groupId);
  if (group) {
    await groupModel.updateGroup(groupId, { memberCount: Math.max(0, (group.memberCount || 1) - 1) });
  }

  const groupMessageService = require('./groupMessageService');
  safeEmit(async () => {
    const io = getIO();
    io.to(`group:${groupId}`).emit('group_member_removed', { groupId, userId });
    try {
      const sysMessage = await groupMessageService.sendSystemGroupMessage({
        groupId,
        senderId: userId,
        type: 'SYSTEM',
        content: JSON.stringify({ action: 'MEMBER_LEFT', userId }),
      });
      io.to(`group:${groupId}`).emit('new_group_message', { groupId, message: sysMessage });
    } catch (_) { /* non-fatal */ }
  });
};

const changeRole = async (groupId, requesterId, targetUserId, newRole) => {
  await requireOwner(groupId, requesterId);
  if (!['OWNER', 'DEPUTY', 'MEMBER'].includes(newRole)) {
    throw Object.assign(new Error('Role không hợp lệ'), { status: 400 });
  }

  // If promoting to OWNER, demote current owner to DEPUTY
  if (newRole === 'OWNER') {
    await groupMemberModel.updateMemberRole(groupId, requesterId, 'DEPUTY');
  }

  await groupMemberModel.updateMemberRole(groupId, targetUserId, newRole);

  safeEmit(() => {
    const io = getIO();
    io.to(`group:${groupId}`).emit('group_role_changed', { groupId, userId: targetUserId, newRole });
  });
};

const updateNickname = async (groupId, requesterId, targetUserId, nickname) => {
  const requester = await requireMember(groupId, requesterId);

  // Members can only change their own nickname; OWNER/DEPUTY can change any
  if (requesterId !== targetUserId && requester.role === 'MEMBER') {
    throw Object.assign(new Error('Không có quyền đổi nickname người khác'), { status: 403 });
  }

  await groupMemberModel.updateMemberNickname(groupId, targetUserId, nickname);
};

const getMembers = async (groupId, requesterId) => {
  await requireMember(groupId, requesterId);
  const members = await groupMemberModel.listMembers(groupId);
  return members.filter(m => m.role !== 'PENDING');
};

const getInviteLink = async (groupId, requesterId) => {
  await requireMember(groupId, requesterId);
  const group = await groupModel.getGroupById(groupId);
  if (!group) throw Object.assign(new Error('Nhóm không tồn tại'), { status: 404 });
  
  if (!group.inviteToken) {
    const token = uuidv4();
    await groupModel.updateGroup(groupId, { inviteToken: token });
    return token;
  }
  return group.inviteToken;
};

const resetInviteLink = async (groupId, requesterId) => {
  await requireOwnerOrDeputy(groupId, requesterId);
  const token = uuidv4();
  await groupModel.updateGroup(groupId, { inviteToken: token });
  return token;
};

const joinViaLink = async (groupId, inviteToken, userId) => {
  const group = await groupModel.getGroupById(groupId);
  if (!group) throw Object.assign(new Error('Nhóm không tồn tại'), { status: 404 });
  if (group.inviteToken !== inviteToken) throw Object.assign(new Error('Mã mời không hợp lệ hoặc đã hết hạn'), { status: 400 });

  const existing = await groupMemberModel.getMember(groupId, userId);
  if (existing) return { alreadyMember: true, groupId };

  await groupMemberModel.addMember(groupId, userId, 'MEMBER');
  
  await groupModel.updateGroup(groupId, { memberCount: (group.memberCount || 0) + 1 });

  safeEmit(() => {
    const io = getIO();
    io.to(`group:${groupId}`).emit('group_member_added', { groupId, userIds: [userId] });
    io.to(`user:${userId}`).emit('group_created', {
      groupId,
      name: group.name,
      avatarUrl: group.avatarUrl,
    });
  });

  return { joined: true, groupId };
};

const previewGroupViaLink = async (groupId, inviteToken, userId) => {
  const group = await groupModel.getGroupById(groupId);
  if (!group) throw Object.assign(new Error('Nhóm không tồn tại'), { status: 404 });
  if (group.inviteToken !== inviteToken) throw Object.assign(new Error('Mã mời không hợp lệ hoặc đã hết hạn'), { status: 400 });
  
  let isMember = false;
  if (userId) {
    const existing = await groupMemberModel.getMember(groupId, userId);
    if (existing) isMember = true;
  }

  return {
    groupId: group.groupId,
    name: group.name,
    avatarUrl: group.avatarUrl,
    memberCount: group.memberCount,
    isMember,
  };
};

module.exports = {
  createGroup,
  getGroup,
  updateGroupInfo,
  deleteGroup,
  listUserGroups,
  addMembers,
  removeMember,
  leaveGroup,
  changeRole,
  updateNickname,
  getMembers,
  getPendingMembers,
  approveMember,
  rejectMember,
  getInviteLink,
  resetInviteLink,
  joinViaLink,
  previewGroupViaLink,
  // export helpers for use by other services
  requireMember,
  requireOwnerOrDeputy,
  requireOwner,
};
