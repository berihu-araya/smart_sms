const express = require('express');
const authMiddleware = require('../../middlewares/auth.middleware');
const authorizeRoles = require('../../middlewares/role.middleware');
const { listNotifications, createNotification } = require('./notification.controller');

const router = express.Router();
router.use(authMiddleware);
router.get('/', listNotifications);
router.post('/', authorizeRoles('School Admin', 'Admin', 'Staff'), createNotification);

module.exports = router;