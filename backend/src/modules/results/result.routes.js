const express = require('express');
const {
  getSectionResults,
  getStudentReportCard,
} = require('./result.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const authorizeRoles = require('../../middlewares/role.middleware');
const { attachStudentScope, requireStudentOwnParam } = require('../../middlewares/student.scope');
const { attachParentScope, requireParentOwnChild } = require('../../middlewares/parent.scope');

const router = express.Router();

router.use(authMiddleware);
router.use(attachStudentScope);
router.use(attachParentScope);

router.get('/section', authorizeRoles('School Admin', 'Admin', 'Teacher', 'Staff'), getSectionResults);
router.get('/report-card/me', authorizeRoles('Student', 'Parent'), getStudentReportCard);
router.get('/report-card/:studentId', authorizeRoles('School Admin', 'Admin', 'Teacher', 'Staff', 'Student', 'Parent'), requireStudentOwnParam('studentId'), requireParentOwnChild('studentId'), getStudentReportCard);

module.exports = router;
