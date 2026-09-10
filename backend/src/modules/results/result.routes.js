const express = require('express');
const {
  getSectionResults,
  getStudentReportCard,
} = require('./result.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const authorizeRoles = require('../../middlewares/role.middleware');
const { attachStudentScope, requireStudentOwnParam } = require('../../middlewares/student.scope');

const router = express.Router();

router.use(authMiddleware);
router.use(attachStudentScope);

router.get('/section', authorizeRoles('School Admin', 'Admin', 'Teacher', 'Staff'), getSectionResults);
router.get('/report-card/me', authorizeRoles('Student'), getStudentReportCard);
router.get('/report-card/:studentId', requireStudentOwnParam('studentId'), getStudentReportCard);

module.exports = router;
