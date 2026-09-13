const express = require('express');
const {
  listExams,
  getExamById,
  createExam,
  updateExam,
  togglePublishExam,
  deleteExam,
} = require('./exam.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const authorizeRoles = require('../../middlewares/role.middleware');
const { attachStudentScope, requireStudentRelatedRecord } = require('../../middlewares/student.scope');
const { attachParentScope } = require('../../middlewares/parent.scope');

const router = express.Router();

router.use(authMiddleware);
router.use(attachStudentScope);
router.use(attachParentScope);

router.get('/', listExams);
router.get('/:id', requireStudentRelatedRecord('exam'), getExamById);
router.post('/', authorizeRoles('School Admin', 'Admin', 'Teacher', 'Staff'), createExam);
router.put('/:id', authorizeRoles('School Admin', 'Admin', 'Teacher', 'Staff'), updateExam);
router.patch('/:id/publish', authorizeRoles('School Admin', 'Admin', 'Teacher', 'Staff'), togglePublishExam);
router.delete('/:id', authorizeRoles('School Admin', 'Admin'), deleteExam);

module.exports = router;
