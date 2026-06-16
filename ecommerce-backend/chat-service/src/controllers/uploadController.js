const multer = require('multer');
const uploadService = require('../services/uploadService');

const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo',
  'audio/m4a', 'audio/mpeg', 'audio/wav', 'audio/webm',
];

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB for videos
  fileFilter: (req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'), false);
    }
  },
});

const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file provided' });
    }

    const conversationId = req.query.conversationId || 'general';
    const url = await uploadService.uploadFile(req.file, conversationId);

    res.json({ success: true, url });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { upload, uploadFile };
