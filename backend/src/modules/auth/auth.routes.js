const express = require('express');
const {
  register,
  getRoles,
  login,
  forgotPassword,
  resetPassword,
  changePassword,
  getProfile,
  updateProfileImage,
} = require('./auth.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const authorizeRoles = require('../../middlewares/role.middleware');

const router = express.Router();

router.post('/register', authMiddleware, authorizeRoles('School Admin', 'Admin'), register);
router.post('/signup', authMiddleware, authorizeRoles('School Admin', 'Admin'), register);
router.get('/roles', authMiddleware, authorizeRoles('School Admin', 'Admin'), getRoles);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/change-password', authMiddleware, changePassword);
router.get('/profile', authMiddleware, getProfile);
router.patch('/profile/image', authMiddleware, updateProfileImage);

module.exports = router;
