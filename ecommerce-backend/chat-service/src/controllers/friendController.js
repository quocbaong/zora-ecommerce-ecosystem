const friendService = require('../services/friendService');

const searchUser = async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ success: false, error: 'email is required' });

    const user = await friendService.searchUserByEmail(email);
    res.json({ success: true, data: user });
  } catch (err) {
    console.error('[searchUser] error:', err.message, '| statusCode:', err.statusCode, '| code:', err.code);
    if (err.statusCode === 404 || err.response?.status === 404) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy người dùng với email này' });
    }
    res.status(500).json({ success: false, error: err.message });
  }
};

const sendFriendRequest = async (req, res) => {
  try {
    const { toUserId } = req.body;
    if (!toUserId) return res.status(400).json({ success: false, error: 'toUserId is required' });
    if (toUserId === req.userId) {
      return res.status(400).json({ success: false, error: 'Cannot send friend request to yourself' });
    }

    const result = await friendService.sendFriendRequest(req.userId, toUserId, req.userRole);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const acceptFriendRequest = async (req, res) => {
  try {
    const { conversationId } = req.body;
    if (!conversationId) return res.status(400).json({ success: false, error: 'conversationId is required' });

    const result = await friendService.acceptFriendRequest(req.userId, conversationId, req.userRole);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const getFriends = async (req, res) => {
  try {
    const friends = await friendService.getFriends(req.userId);
    res.json({ success: true, data: friends });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { searchUser, sendFriendRequest, acceptFriendRequest, getFriends };
