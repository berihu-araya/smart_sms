const express = require('express');
const {
  listGrades,
  getGradeById,
  checkGradeReferences,
  createGrade,
  updateGrade,
  deleteGrade,
  restoreGrade,
} = require('./grade.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const authorizeRoles = require('../../middlewares/role.middleware');
const { attachStudentScope, requireStudentScopeMatch } = require('../../middlewares/student.scope');

const router = express.Router();

router.use(authMiddleware);
router.use(attachStudentScope);

router.get('/', authorizeRoles('School Admin', 'Admin', 'Staff', 'Teacher', 'Student', 'Parent'), listGrades);
router.post('/', authorizeRoles('School Admin', 'Admin', 'Staff'), createGrade);
router.get('/:id/references', authorizeRoles('School Admin', 'Admin', 'Staff', 'Teacher'), checkGradeReferences);
router.post('/:id/restore', authorizeRoles('School Admin', 'Admin', 'Staff'), restoreGrade);
router.get('/:id', authorizeRoles('School Admin', 'Admin', 'Staff', 'Teacher', 'Student', 'Parent'), requireStudentScopeMatch('grade_id'), getGradeById);
router.put('/:id', authorizeRoles('School Admin', 'Admin', 'Staff'), updateGrade);
router.delete('/:id', authorizeRoles('School Admin', 'Admin'), deleteGrade);

module.exports = router;
