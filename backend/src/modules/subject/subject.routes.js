const express = require('express');
const {
  listSubjects,
  getSubjectById,
  checkSubjectReferences,
  createSubject,
  updateSubject,
  deleteSubject,
  restoreSubject,
} = require('./subject.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const authorizeRoles = require('../../middlewares/role.middleware');
const { attachStudentScope, requireStudentRelatedRecord } = require('../../middlewares/student.scope');

const router = express.Router();

router.use(authMiddleware);
router.use(attachStudentScope);

router.get('/', authorizeRoles('School Admin', 'Admin', 'Staff', 'Teacher', 'Student', 'Parent'), listSubjects);
router.post('/', authorizeRoles('School Admin', 'Admin', 'Staff'), createSubject);
router.get('/:id/references', authorizeRoles('School Admin', 'Admin', 'Staff', 'Teacher'), checkSubjectReferences);
router.post('/:id/restore', authorizeRoles('School Admin', 'Admin', 'Staff'), restoreSubject);
router.get('/:id', authorizeRoles('School Admin', 'Admin', 'Staff', 'Teacher', 'Student', 'Parent'), requireStudentRelatedRecord('subject'), getSubjectById);
router.put('/:id', authorizeRoles('School Admin', 'Admin', 'Staff'), updateSubject);
router.delete('/:id', authorizeRoles('School Admin', 'Admin'), deleteSubject);

module.exports = router;