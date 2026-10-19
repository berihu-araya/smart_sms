/**
 * Express router for Messaging Module.
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const {
  listConversations,
  createOrGetConversation,
  getConversation,
  listMessages,
  sendMessage,
  markAsRead,
  updateParticipantSettings,
  deleteMessage,
  getUnreadCount,
  getContacts,
  uploadAttachment,
  downloadAttachment,
} = require('./message.controller');

const authMiddleware = require('../../middlewares/auth.middleware');
const { attachParentScope } = require('../../middlewares/parent.scope');
const { attachTeacherScope } = require('../../middlewares/teacher.scope');

const router = express.Router();

// Multer storage configuration for message attachments
const uploadDir = path.join(__dirname, '../../../uploads/messages');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const sanitizedOriginal = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${uniqueSuffix}-${sanitizedOriginal}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
});

// Apply authentication and scope resolvers
router.use(authMiddleware);
router.use(attachParentScope);
router.use(attachTeacherScope);

/**
 * Guard: Requires valid school context in JWT.
 */
router.use((req, res, next) => {
  if (!req.user?.school_id) {
    return res.status(401).json({
      success: false,
      message: 'Session expired or school context missing. Please log out and log in again.',
      data: null,
    });
  }
  return next();
});

// 1. Directory, Counters, and File Attachments (Must be placed before parameterized /:id routes)
router.get('/unread-count', getUnreadCount);
router.get('/contacts', getContacts);
router.post('/upload', upload.single('file'), uploadAttachment);
router.get('/attachments/:attachmentId/download', downloadAttachment);

// 2. Inbox Conversations Listing & Creation
router.get('/', listConversations);
router.post('/', createOrGetConversation);

// 3. Single Message Operations
router.delete('/messages/:messageId', deleteMessage);

// 4. Conversation Specific Operations
router.get('/:id', getConversation);
router.get('/:id/messages', listMessages);
router.post('/:id/messages', sendMessage);
router.patch('/:id/read', markAsRead);
router.patch('/:id/settings', updateParticipantSettings);

module.exports = router;
