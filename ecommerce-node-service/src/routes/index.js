const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const chatController = require('../controllers/chatController');
const uploadController = require('../controllers/uploadController');

router.use(authMiddleware);

router.post('/conversations', chatController.createConversation);
router.get('/conversations', chatController.getConversations);
router.get('/conversations/:id', chatController.getConversationDetail);
router.get('/conversations/:id/messages', chatController.getMessages);
router.post('/conversations/:id/messages', chatController.sendMessage);
router.put('/conversations/:id/read', chatController.markAsRead);
router.post('/upload', uploadController.upload.single('file'), uploadController.uploadFile);

module.exports = router;
