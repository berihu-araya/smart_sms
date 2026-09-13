const express = require('express');
const {
  listAssignments,
  getStats,
  getAssignmentById,
  createAssignment,
  updateAssignment,
  toggleStatus,
  deleteAssignment,
  listSubmissions,
  getMySubmission,
  submitAssignment,
  gradeSubmission,
} = require('./assignment.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const authorizeRoles = require('../../middlewares/role.middleware');
const { attachParentScope } = require('../../middlewares/parent.scope');

const router = express.Router();

router.use(authMiddleware);
router.use(attachParentScope);

// General & KPI Analytics
router.get('/', listAssignments);
router.get('/stats', getStats);

// Student Actions
router.get('/:id/my-submission', authorizeRoles('Student'), getMySubmission);
router.post('/:id/submit', authorizeRoles('Student'), submitAssignment);

// Submissions & Grading
router.get('/:id/submissions', authorizeRoles('School Admin', 'Admin', 'Teacher', 'Staff'), listSubmissions);
router.post('/submissions/:submissionId/grade', authorizeRoles('School Admin', 'Admin', 'Teacher', 'Staff'), gradeSubmission);

// Assignment CRUD & Status Management
router.get('/:id', getAssignmentById);
router.post('/', authorizeRoles('School Admin', 'Admin', 'Teacher', 'Staff'), createAssignment);
router.put('/:id', authorizeRoles('School Admin', 'Admin', 'Teacher', 'Staff'), updateAssignment);
router.patch('/:id/status', authorizeRoles('School Admin', 'Admin', 'Teacher', 'Staff'), toggleStatus);
router.delete('/:id', authorizeRoles('School Admin', 'Admin', 'Teacher'), deleteAssignment);

module.exports = router;
