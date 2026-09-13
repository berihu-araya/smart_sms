const express = require('express');
const {
  getMarksSheet,
  saveBatchMarks,
  getStudentMarks,
} = require('./mark.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const authorizeRoles = require('../../middlewares/role.middleware');
const { attachStudentScope } = require('../../middlewares/student.scope');
const { attachParentScope, requireParentOwnChild } = require('../../middlewares/parent.scope');

const router = express.Router();

router.use(authMiddleware);
router.use(attachStudentScope);
router.use(attachParentScope);

router.get('/sheet', authorizeRoles('School Admin', 'Admin', 'Teacher', 'Staff'), getMarksSheet);
router.post('/batch', authorizeRoles('School Admin', 'Admin', 'Teacher', 'Staff'), saveBatchMarks);
router.get('/student/me', authorizeRoles('Student', 'Parent'), getStudentMarks);
router.get('/student/:studentId', authorizeRoles('School Admin', 'Admin', 'Teacher', 'Staff', 'Student', 'Parent'), requireParentOwnChild('studentId'), getStudentMarks);

module.exports = router;
