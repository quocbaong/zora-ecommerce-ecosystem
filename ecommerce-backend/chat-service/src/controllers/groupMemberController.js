const groupService = require('../services/groupService');

const handleErr = (res, err) => {
  const status = err.status || 500;
  res.status(status).json({ success: false, error: err.message });
};

const getMembers = async (req, res) => {
  try {
    const members = await groupService.getMembers(req.params.groupId, req.userId);
    res.json({ success: true, data: members });
  } catch (err) { handleErr(res, err); }
};

const addMembers = async (req, res) => {
  try {
    const { userIds } = req.body;
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ success: false, error: 'userIds là bắt buộc' });
    }
    const result = await groupService.addMembers(req.params.groupId, req.userId, userIds);
    res.json({ success: true, data: result });
  } catch (err) { handleErr(res, err); }
};

const removeMember = async (req, res) => {
  try {
    await groupService.removeMember(req.params.groupId, req.userId, req.params.userId);
    res.json({ success: true });
  } catch (err) { handleErr(res, err); }
};

const changeRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!role) return res.status(400).json({ success: false, error: 'role là bắt buộc' });
    await groupService.changeRole(req.params.groupId, req.userId, req.params.userId, role);
    res.json({ success: true });
  } catch (err) { handleErr(res, err); }
};

const updateNickname = async (req, res) => {
  try {
    const { nickname } = req.body;
    if (nickname === undefined) return res.status(400).json({ success: false, error: 'nickname là bắt buộc' });
    await groupService.updateNickname(req.params.groupId, req.userId, req.params.userId, nickname);
    res.json({ success: true });
  } catch (err) { handleErr(res, err); }
};

const leaveGroup = async (req, res) => {
  try {
    await groupService.leaveGroup(req.params.groupId, req.userId);
    res.json({ success: true });
  } catch (err) { handleErr(res, err); }
};

const getPendingMembers = async (req, res) => {
  try {
    const members = await groupService.getPendingMembers(req.params.groupId, req.userId);
    res.json({ success: true, data: members });
  } catch (err) { handleErr(res, err); }
};

const approveMember = async (req, res) => {
  try {
    await groupService.approveMember(req.params.groupId, req.userId, req.params.userId);
    res.json({ success: true });
  } catch (err) { handleErr(res, err); }
};

const rejectMember = async (req, res) => {
  try {
    await groupService.rejectMember(req.params.groupId, req.userId, req.params.userId);
    res.json({ success: true });
  } catch (err) { handleErr(res, err); }
};

module.exports = {
  getMembers,
  addMembers,
  removeMember,
  changeRole,
  updateNickname,
  leaveGroup,
  getPendingMembers,
  approveMember,
  rejectMember,
};
