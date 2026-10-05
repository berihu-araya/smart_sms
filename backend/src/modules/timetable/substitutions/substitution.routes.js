const express = require('express');
const {
  listSubstitutions,
  getSubstitutionById,
  createSubstitution,
  approveSubstitution,
  rejectSubstitution,
  cancelSubstitution,
} = require('./substitution.controller');
const authMiddleware = require('../../../middlewares/auth.middleware');
const authorizeRoles = require('../../../middlewares/role.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', listSubstitutions);
router.get('/:id', getSubstitutionById);

router.post('/', authorizeRoles('School Admin', 'Admin', 'Teacher', 'Staff'), createSubstitution);
router.post('/:id/approve', authorizeRoles('School Admin', 'Admin', 'Staff'), approveSubstitution);
router.post('/:id/reject', authorizeRoles('School Admin', 'Admin', 'Staff'), rejectSubstitution);
router.post('/:id/cancel', authorizeRoles('School Admin', 'Admin', 'Teacher', 'Staff'), cancelSubstitution);

module.exports = router;
