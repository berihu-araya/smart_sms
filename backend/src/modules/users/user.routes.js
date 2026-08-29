const express = require('express');
const {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  toggleUserStatus,
  resetPassword,
  deleteUser,
} = require('./user.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const authorizeRoles = require('../../middlewares/role.middleware');

const router = express.Router();

router.use(authMiddleware);
router.use(authorizeRoles('School Admin', 'Admin'));

router.get('/', listUsers);
router.get('/:id', getUserById);
router.post('/', createUser);
router.put('/:id', updateUser);
router.patch('/:id/status', toggleUserStatus);
router.post('/:id/reset-password', resetPassword);
router.delete('/:id', deleteUser);

module.exports = router;
