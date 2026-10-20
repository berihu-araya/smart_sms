const express = require('express');
const { db } = require('../../config/database');
const AuditService = require('../../services/audit.service');
const AuditController = require('./audit.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const authorizeRoles = require('../../middlewares/role.middleware');

const router = express.Router();
const auditService = new AuditService(db);
const auditController = new AuditController(auditService);

router.use(authMiddleware);
router.use(authorizeRoles('School Admin', 'Admin', 'Super Admin'));

router.get('/', (req, res, next) => auditController.listAuditLogs(req, res, next));
router.get('/export', (req, res, next) => auditController.exportAuditLogs(req, res, next));
router.get('/:id', (req, res, next) => auditController.getAuditLog(req, res, next));

module.exports = router;
