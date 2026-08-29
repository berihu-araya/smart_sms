const express = require('express');
const { listRoles, getRoleById } = require('./role.controller');
const authMiddleware = require('../../middlewares/auth.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', listRoles);
router.get('/:id', getRoleById);

module.exports = router;
