const express = require('express');
const { getSettings, updateSettings } = require('./setting.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const authorizeRoles = require('../../middlewares/role.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', getSettings);
router.put('/', authorizeRoles('School Admin', 'Admin'), updateSettings);

module.exports = router;
