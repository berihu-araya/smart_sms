const express = require('express');
const {
  listRoles,
  getRoleById,
  createRole,
  deleteRole,
  getRolePermissions,
  updateRolePermissions,
} = require('./role.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const authorizeRoles = require('../../middlewares/role.middleware');

const router = express.Router();

router.use(authMiddleware);

// Roles management
router.get('/', authorizeRoles('School Admin', 'Admin', 'Staff'), listRoles);
router.post('/', authorizeRoles('School Admin', 'Admin'), createRole);
router.get('/:id', authorizeRoles('School Admin', 'Admin', 'Staff'), getRoleById);
router.delete('/:id', authorizeRoles('School Admin', 'Admin'), deleteRole);

// Dynamic Permissions Matrix
router.get('/:id/permissions', authorizeRoles('School Admin', 'Admin'), getRolePermissions);
router.put('/:id/permissions', authorizeRoles('School Admin', 'Admin'), updateRolePermissions);

module.exports = router;
