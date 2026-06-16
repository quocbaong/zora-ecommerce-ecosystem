const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const chatController = require('../controllers/chatController');
const uploadController = require('../controllers/uploadController');
const friendController = require('../controllers/friendController');
const groupController = require('../controllers/groupController');
const groupMemberController = require('../controllers/groupMemberController');
const groupMessageController = require('../controllers/groupMessageController');
const pollController = require('../controllers/pollController');
const reminderController = require('../controllers/reminderController');
const reportController = require('../controllers/reportController');
const faqController = require('../controllers/faqController');

router.use(authMiddleware);

// FAQ (Quick reply) routes
router.get('/faqs/:sellerId', faqController.getSellerFaqs);
router.put('/faqs', faqController.saveSellerFaqs);
router.post('/conversations/:id/faq-reply', faqController.triggerFaqReply);

router.post('/conversations', chatController.createConversation);
router.get('/conversations', chatController.getConversations);
router.get('/conversations/:id', chatController.getConversationDetail);
router.get('/conversations/:id/messages', chatController.getMessages);
router.post('/conversations/:id/messages', chatController.sendMessage);
router.put('/conversations/:id/read', chatController.markAsRead);
router.put('/conversations/:id/messages/:msgId/recall', chatController.recallMessage);
router.delete('/conversations/:id', chatController.deleteConversation);
router.delete('/conversations/:id/messages/:msgId', chatController.deleteMessage);
router.post('/conversations/:id/messages/:msgId/reactions', chatController.addReaction);
router.post('/upload', uploadController.upload.single('file'), uploadController.uploadFile);

// Friend / contact routes
router.get('/users/search', friendController.searchUser);
router.post('/friends/request', friendController.sendFriendRequest);
router.post('/friends/accept', friendController.acceptFriendRequest);
router.get('/friends', friendController.getFriends);

// ─── Group routes ────────────────────────────────────────────────────────────
router.get('/groups/:groupId/preview', groupController.previewGroupViaLink);
router.post('/groups/join-via-link', groupController.joinViaLink);
router.post('/groups', groupController.createGroup);
router.get('/groups', groupController.listUserGroups);
router.get('/groups/:groupId', groupController.getGroup);
router.put('/groups/:groupId', groupController.updateGroupInfo);
router.delete('/groups/:groupId', groupController.deleteGroup);
router.post('/groups/:groupId/avatar', groupController.uploadGroupAvatar);
router.get('/groups/:groupId/invite-link', groupController.getInviteLink);
router.post('/groups/:groupId/reset-invite', groupController.resetInviteLink);

// Members
router.get('/groups/:groupId/members', groupMemberController.getMembers);
router.post('/groups/:groupId/members', groupMemberController.addMembers);
router.delete('/groups/:groupId/members/:userId', groupMemberController.removeMember);
router.put('/groups/:groupId/members/:userId/role', groupMemberController.changeRole);
router.put('/groups/:groupId/members/:userId/nickname', groupMemberController.updateNickname);
router.post('/groups/:groupId/leave', groupMemberController.leaveGroup);
router.get('/groups/:groupId/pending-members', groupMemberController.getPendingMembers);
router.post('/groups/:groupId/members/:userId/approve', groupMemberController.approveMember);
router.post('/groups/:groupId/members/:userId/reject', groupMemberController.rejectMember);

// Messages, pins, reactions, mute
router.get('/groups/:groupId/messages', groupMessageController.getGroupMessages);
router.post('/groups/:groupId/messages', groupMessageController.sendGroupMessage);
router.put('/groups/:groupId/messages/:msgId/recall', groupMessageController.recallGroupMessage);
router.delete('/groups/:groupId/messages/:msgId', groupMessageController.deleteGroupMessage);
router.post('/groups/:groupId/messages/:msgId/reactions', groupMessageController.addGroupReaction);
router.get('/groups/:groupId/pins', groupMessageController.getPinnedMessages);
router.post('/groups/:groupId/messages/:msgId/pin', groupMessageController.pinMessage);
router.delete('/groups/:groupId/messages/:msgId/pin', groupMessageController.unpinMessage);
router.put('/groups/:groupId/read', groupMessageController.markAsRead);
router.post('/groups/:groupId/mute', groupMessageController.muteGroup);
router.delete('/groups/:groupId/mute', groupMessageController.unmuteGroup);

// Polls
router.post('/groups/:groupId/polls', pollController.createPoll);
router.get('/groups/:groupId/polls', pollController.listPolls);
router.get('/groups/:groupId/polls/:pollId', pollController.getPoll);
router.post('/groups/:groupId/polls/:pollId/vote', pollController.vote);
router.delete('/groups/:groupId/polls/:pollId/vote', pollController.unvote);
router.post('/groups/:groupId/polls/:pollId/close', pollController.closePoll);

// Reminders
router.post('/groups/:groupId/reminders', reminderController.createReminder);
router.get('/groups/:groupId/reminders', reminderController.listReminders);
router.put('/groups/:groupId/reminders/:reminderId/done', reminderController.markDone);
router.delete('/groups/:groupId/reminders/:reminderId', reminderController.deleteReminder);

// ─── Report routes ───────────────────────────────────────────────────────────
// User: Report a conversation
router.post('/conversations/:conversationId/report', reportController.submitReport);

// User: Get their own reports
router.get('/my-reports', reportController.getUserReports);

// Admin: Get all reports by status (PENDING, RESOLVED, REJECTED)
router.get('/admin/reports', reportController.getReports);

// Admin: Get reports for a specific conversation
router.get('/conversations/:conversationId/reports', reportController.getConversationReports);

// Admin: Get report details
router.get('/admin/reports/:reportId', reportController.getReportDetail);

// Admin: Update report status
router.patch('/admin/reports/:reportId', reportController.updateReportStatus);

module.exports = router;
