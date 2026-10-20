const express = require('express');
const { db } = require('../../config/database');
const BackupService = require('./backup.service');
const BackupController = require('./backup.controller');
const AuditService = require('../../services/audit.service');
const authMiddleware = require('../../middlewares/auth.middleware');
const authorizeRoles = require('../../middlewares/role.middleware');

const router = express.Router();
const auditService = new AuditService(db);
const backupService = new BackupService(db, auditService);
const backupController = new BackupController(backupService);

router.use(authMiddleware);
router.use(authorizeRoles('School Admin', 'Admin', 'Super Admin'));

router.get('/', (req, res, next) => backupController.listBackups(req, res, next));
router.post('/trigger', (req, res, next) => backupController.triggerBackup(req, res, next));
router.get('/:id/download', (req, res, next) => backupController.downloadBackup(req, res, next));

module.exports = router;
