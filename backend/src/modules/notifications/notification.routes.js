const express = require('express');
const authMiddleware = require('../../middlewares/auth.middleware');
const authorizeRoles = require('../../middlewares/role.middleware');
const {
  listNotifications,
  getUnreadCount,
  getStats,
  markAsRead,
  markAllAsRead,
  archiveNotification,
  createNotification,
} = require('./notification.controller');

const router = express.Router();

// All notification routes require an authenticated user session
router.use(authMiddleware);

// User notification endpoints
router.get('/', listNotifications);
router.get('/unread-count', getUnreadCount);
router.get('/stats', getStats);
router.post('/read-all', markAllAsRead);
router.patch('/:id/read', markAsRead);
router.delete('/:id', archiveNotification);

// Create / dispatch notification (Admins, School Admin, Staff, Teachers)
router.post(
  '/',
  authorizeRoles('School Admin', 'Admin', 'Staff', 'Teacher'),
  createNotification
);

module.exports = router;