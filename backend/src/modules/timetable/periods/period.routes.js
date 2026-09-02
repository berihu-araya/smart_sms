const express = require('express');
const {
  listPeriods,
  getPeriodById,
  createPeriod,
  updatePeriod,
  deletePeriod,
  bulkReorderPeriods,
} = require('./period.controller');
const authMiddleware = require('../../../middlewares/auth.middleware');
const authorizeRoles = require('../../../middlewares/role.middleware');

const router = express.Router();

router.use(authMiddleware);

// Read-only access for all authenticated users
router.get('/', listPeriods);
router.get('/:id', getPeriodById);

// Admin / Staff management
router.post('/bulk-reorder', authorizeRoles('School Admin', 'Admin', 'Staff'), bulkReorderPeriods);
router.post('/', authorizeRoles('School Admin', 'Admin', 'Staff'), createPeriod);
router.put('/:id', authorizeRoles('School Admin', 'Admin', 'Staff'), updatePeriod);
router.delete('/:id', authorizeRoles('School Admin', 'Admin'), deletePeriod);

module.exports = router;
