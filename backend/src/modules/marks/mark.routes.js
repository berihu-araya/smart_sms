const express = require('express');
const {
  getMarksSheet,
  saveBatchMarks,
  getStudentMarks,
} = require('./mark.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const authorizeRoles = require('../../middlewares/role.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/sheet', authorizeRoles('School Admin', 'Admin', 'Teacher', 'Staff'), getMarksSheet);
router.post('/batch', authorizeRoles('School Admin', 'Admin', 'Teacher', 'Staff'), saveBatchMarks);
router.get('/student/:studentId', getStudentMarks);

module.exports = router;
