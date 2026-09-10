const express = require('express');
const {
  listGradeSubjects,
  getGradeSubjectById,
  createGradeSubject,
  bulkAssignSubjects,
  cloneGradeSubjects,
  getCurriculumStats,
  getSubjectMappedGrades,
  updateGradeSubject,
  deleteGradeSubject,
} = require('./grade-subject.controller');

const authMiddleware = require('../../../middlewares/auth.middleware');
const authorizeRoles = require('../../../middlewares/role.middleware');
const { attachStudentScope, requireStudentRelatedRecord } = require('../../../middlewares/student.scope');

const router = express.Router();

// Protect all grade-subject routes
router.use(authMiddleware);
router.use(attachStudentScope);

// GET stats & metrics
router.get('/stats', authorizeRoles('School Admin', 'Admin', 'Staff', 'Teacher'), getCurriculumStats);

// GET grades mapped to a specific subject
router.get('/by-subject/:subjectId', authorizeRoles('School Admin', 'Admin', 'Staff', 'Teacher'), getSubjectMappedGrades);

// GET all grade subjects
router.get('/', listGradeSubjects);

// BULK assign subjects to grade
router.post('/bulk', authorizeRoles('School Admin', 'Admin', 'Staff'), bulkAssignSubjects);

// CLONE grade subjects
router.post('/clone', authorizeRoles('School Admin', 'Admin', 'Staff'), cloneGradeSubjects);

// CREATE single grade subject assignment
router.post('/', authorizeRoles('School Admin', 'Admin', 'Staff'), createGradeSubject);

// GET one grade subject
router.get('/:id', requireStudentRelatedRecord('gradeSubject'), getGradeSubjectById);

// UPDATE grade subject
router.put('/:id', authorizeRoles('School Admin', 'Admin', 'Staff'), updateGradeSubject);

// DELETE grade subject
router.delete('/:id', authorizeRoles('School Admin', 'Admin'), deleteGradeSubject);

module.exports = router;