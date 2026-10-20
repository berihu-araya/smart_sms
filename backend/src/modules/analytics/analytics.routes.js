const express = require('express');
const { getInstitutionalAnalytics } = require('./analytics.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const authorizeRoles = require('../../middlewares/role.middleware');

const router = express.Router();

router.use(authMiddleware);

// Only School Admin and System Admin can access executive institutional analytics
router.use(authorizeRoles('School Admin', 'Admin'));

router.get('/institutional', getInstitutionalAnalytics);
router.get('/', getInstitutionalAnalytics);

module.exports = router;
