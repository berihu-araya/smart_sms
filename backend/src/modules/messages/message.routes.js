/**
 * Express router for Messaging Module.
 */

const express = require('express');
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
} = require('./message.controller');

const authMiddleware = require('../../middlewares/auth.middleware');
const { attachParentScope } = require('../../middlewares/parent.scope');
const { attachTeacherScope } = require('../../middlewares/teacher.scope');

const router = express.Router();

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

// 1. Directory and Counters (Must be placed before parameterized /:id routes)
router.get('/unread-count', getUnreadCount);
router.get('/contacts', getContacts);

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
