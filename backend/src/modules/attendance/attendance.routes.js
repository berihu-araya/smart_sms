const express = require('express');
const {
  getRosterSheet,
  recordBulkAttendance,
  getDailySummary,
  getMonthlyMatrix,
  getStudentAttendance,
  getMyChildrenAttendance,
  getOwnAttendance,
} = require('./attendance.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const authorizeRoles = require('../../middlewares/role.middleware');
const { attachStudentScope, requireStudentOwnParam } = require('../../middlewares/student.scope');
const { attachParentScope, requireParentOwnChild } = require('../../middlewares/parent.scope');

const router = express.Router();

router.use(authMiddleware);
router.use(attachStudentScope);
router.use(attachParentScope);

router.get('/sheet', authorizeRoles('School Admin', 'Admin', 'Teacher', 'Staff'), getRosterSheet);
router.post('/bulk', authorizeRoles('School Admin', 'Admin', 'Teacher', 'Staff'), recordBulkAttendance);
router.get('/summary', authorizeRoles('School Admin', 'Admin', 'Teacher', 'Staff'), getDailySummary);
router.get('/matrix', authorizeRoles('School Admin', 'Admin', 'Teacher', 'Staff'), getMonthlyMatrix);
router.get('/parent/my-children', authorizeRoles('Parent'), getMyChildrenAttendance);
router.get('/student/me', getOwnAttendance);
router.get('/student/:studentId', authorizeRoles('School Admin', 'Admin', 'Teacher', 'Staff', 'Student', 'Parent'), requireStudentOwnParam('studentId'), requireParentOwnChild('studentId'), getStudentAttendance);

module.exports = router;
