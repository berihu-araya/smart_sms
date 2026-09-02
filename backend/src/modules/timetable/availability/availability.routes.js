const express = require('express');
const {
  getTeacherAvailability,
  updateTeacherAvailability,
} = require('./availability.controller');
const authMiddleware = require('../../../middlewares/auth.middleware');
const authorizeRoles = require('../../../middlewares/role.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/:teacherId', getTeacherAvailability);
router.post(
  '/',
  authorizeRoles('School Admin', 'Admin', 'Staff', 'Teacher'),
  updateTeacherAvailability
);

module.exports = router;
