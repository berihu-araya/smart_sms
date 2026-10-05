const express = require('express');
const {
  listTeachers,
  getTeacherById,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  activateTeacher,
  terminateTeacher,
  getTeacherProfile,
} = require('./teacher.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const authorizeRoles = require('../../middlewares/role.middleware');
const { attachStudentScope, requireStudentRelatedRecord } = require('../../middlewares/student.scope');

const router = express.Router();

router.use(authMiddleware);
router.use(attachStudentScope);

router.get('/', authorizeRoles('School Admin', 'Admin', 'Staff', 'Teacher', 'Student'), listTeachers);
router.post('/', authorizeRoles('School Admin', 'Admin', 'Staff'), createTeacher);
router.get('/:id/profile', authorizeRoles('School Admin', 'Admin', 'Staff', 'Teacher', 'Student'), requireStudentRelatedRecord('teacher'), getTeacherProfile);
router.get('/:id', authorizeRoles('School Admin', 'Admin', 'Staff', 'Teacher', 'Student'), requireStudentRelatedRecord('teacher'), getTeacherById);
router.put('/:id', authorizeRoles('School Admin', 'Admin', 'Staff'), updateTeacher);
router.delete('/:id', authorizeRoles('School Admin', 'Admin'), deleteTeacher);
router.patch('/:id/activate', authorizeRoles('School Admin', 'Admin'), activateTeacher);
router.patch('/:id/terminate', authorizeRoles('School Admin', 'Admin'), terminateTeacher);

module.exports = router;

