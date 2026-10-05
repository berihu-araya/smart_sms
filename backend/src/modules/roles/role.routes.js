const express = require('express');
const { listRoles, getRoleById } = require('./role.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const authorizeRoles = require('../../middlewares/role.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', authorizeRoles('School Admin', 'Admin', 'Staff'), listRoles);
router.get('/:id', authorizeRoles('School Admin', 'Admin', 'Staff'), getRoleById);

module.exports = router;
