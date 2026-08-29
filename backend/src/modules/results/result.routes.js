const express = require('express');
const {
  getSectionResults,
  getStudentReportCard,
} = require('./result.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const authorizeRoles = require('../../middlewares/role.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/section', authorizeRoles('School Admin', 'Admin', 'Teacher', 'Staff'), getSectionResults);
router.get('/report-card/:studentId', getStudentReportCard);

module.exports = router;
