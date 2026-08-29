const express = require('express');
const {
  getRosterSheet,
  recordBulkAttendance,
  getDailySummary,
  getStudentAttendance,
} = require('./attendance.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const authorizeRoles = require('../../middlewares/role.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/sheet', authorizeRoles('School Admin', 'Admin', 'Teacher', 'Staff'), getRosterSheet);
router.post('/bulk', authorizeRoles('School Admin', 'Admin', 'Teacher', 'Staff'), recordBulkAttendance);
router.get('/summary', authorizeRoles('School Admin', 'Admin', 'Teacher', 'Staff'), getDailySummary);
router.get('/student/:studentId', getStudentAttendance);

module.exports = router;
