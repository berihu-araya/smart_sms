const express = require('express');
const {
  listRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
} = require('./room.controller');
const authMiddleware = require('../../../middlewares/auth.middleware');
const authorizeRoles = require('../../../middlewares/role.middleware');

const router = express.Router();

router.use(authMiddleware);

// Read-only access for all authenticated users (teachers, staff, students to see room info)
router.get('/', listRooms);
router.get('/:id', getRoomById);

// Admin / School Admin / Staff management
router.post('/', authorizeRoles('School Admin', 'Admin', 'Staff'), createRoom);
router.put('/:id', authorizeRoles('School Admin', 'Admin', 'Staff'), updateRoom);
router.delete('/:id', authorizeRoles('School Admin', 'Admin'), deleteRoom);

module.exports = router;
