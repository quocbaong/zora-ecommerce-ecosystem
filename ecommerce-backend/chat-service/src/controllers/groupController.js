const groupService = require('../services/groupService');
const uploadController = require('./uploadController');
const uploadService = require('../services/uploadService');

const handleErr = (res, err) => {
  const status = err.status || 500;
  res.status(status).json({ success: false, error: err.message });
};

const createGroup = async (req, res) => {
  try {
    const { name, description, avatarUrl, initialMemberIds } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'Tên nhóm là bắt buộc' });

    const group = await groupService.createGroup({
      creatorId: req.userId,
      name,
      description,
      avatarUrl,
      initialMemberIds: initialMemberIds || [],
    });
    res.status(201).json({ success: true, data: group });
  } catch (err) { handleErr(res, err); }
};

const listUserGroups = async (req, res) => {
  try {
    const groups = await groupService.listUserGroups(req.userId);
    res.json({ success: true, data: groups });
  } catch (err) { handleErr(res, err); }
};

const getGroup = async (req, res) => {
  try {
    const group = await groupService.getGroup(req.params.groupId, req.userId);
    if (!group) return res.status(404).json({ success: false, error: 'Nhóm không tồn tại' });
    res.json({ success: true, data: group });
  } catch (err) { handleErr(res, err); }
};

const updateGroupInfo = async (req, res) => {
  try {
    const { name, description, rules, allowMemberPost, highlightAdminMessages } = req.body;
    const updated = await groupService.updateGroupInfo(req.params.groupId, req.userId, {
      name, description, rules, allowMemberPost, highlightAdminMessages,
    });
    res.json({ success: true, data: updated });
  } catch (err) { handleErr(res, err); }
};

const deleteGroup = async (req, res) => {
  try {
    await groupService.deleteGroup(req.params.groupId, req.userId);
    res.json({ success: true });
  } catch (err) { handleErr(res, err); }
};

const uploadGroupAvatar = [
  uploadController.upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ success: false, error: 'File là bắt buộc' });
      const url = await uploadService.uploadFile(req.file, req.params.groupId);
      await groupService.updateGroupInfo(req.params.groupId, req.userId, { avatarUrl: url });
      res.json({ success: true, data: { avatarUrl: url } });
    } catch (err) { handleErr(res, err); }
  },
];

const getInviteLink = async (req, res) => {
  try {
    const token = await groupService.getInviteLink(req.params.groupId, req.userId);
    res.json({ success: true, data: { inviteToken: token } });
  } catch (err) { handleErr(res, err); }
};

const resetInviteLink = async (req, res) => {
  try {
    const token = await groupService.resetInviteLink(req.params.groupId, req.userId);
    res.json({ success: true, data: { inviteToken: token } });
  } catch (err) { handleErr(res, err); }
};

const joinViaLink = async (req, res) => {
  try {
    const { groupId, inviteToken } = req.body;
    if (!groupId || !inviteToken) return res.status(400).json({ success: false, error: 'Thiếu thông tin mã mời' });
    const result = await groupService.joinViaLink(groupId, inviteToken, req.userId);
    res.json({ success: true, data: result });
  } catch (err) { handleErr(res, err); }
};

const previewGroupViaLink = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { token } = req.query;
    if (!groupId || !token) return res.status(400).json({ success: false, error: 'Thiếu thông tin mã mời' });
    const result = await groupService.previewGroupViaLink(groupId, token, req.userId);
    res.json({ success: true, data: result });
  } catch (err) { handleErr(res, err); }
};

module.exports = {
  createGroup,
  listUserGroups,
  getGroup,
  updateGroupInfo,
  deleteGroup,
  uploadGroupAvatar,
  getInviteLink,
  resetInviteLink,
  joinViaLink,
  previewGroupViaLink,
};
