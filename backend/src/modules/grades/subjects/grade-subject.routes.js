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

const router = express.Router();

// Protect all grade-subject routes
router.use(authMiddleware);

// GET stats & metrics
router.get('/stats', getCurriculumStats);

// GET grades mapped to a specific subject
router.get('/by-subject/:subjectId', getSubjectMappedGrades);

// GET all grade subjects
router.get('/', listGradeSubjects);

// BULK assign subjects to grade
router.post('/bulk', bulkAssignSubjects);

// CLONE grade subjects
router.post('/clone', cloneGradeSubjects);

// CREATE single grade subject assignment
router.post('/', createGradeSubject);

// GET one grade subject
router.get('/:id', getGradeSubjectById);

// UPDATE grade subject
router.put('/:id', updateGradeSubject);

// DELETE grade subject
router.delete('/:id', deleteGradeSubject);

module.exports = router;