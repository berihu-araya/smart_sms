const express = require('express');
const {
  listStudents,
  getStudentById,
  getOwnStudentProfile,
  createStudent,
  updateStudent,
  deleteStudent,
  activateStudent,
  suspendStudent,
  getStudentProfile,
  getStudentGuardian,
} = require('./student.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const authorizeRoles = require('../../middlewares/role.middleware');
const { attachStudentScope, requireStudentOwnParam } = require('../../middlewares/student.scope');
const { attachParentScope, requireParentOwnChild } = require('../../middlewares/parent.scope');

const router = express.Router();

router.use(authMiddleware);
router.use(attachStudentScope);
router.use(attachParentScope);

router.get('/', authorizeRoles('School Admin', 'Admin', 'Staff', 'Teacher', 'Parent'), listStudents);
router.post('/', authorizeRoles('School Admin', 'Admin', 'Staff'), createStudent);
router.get('/me', authorizeRoles('Student'), getOwnStudentProfile);
router.get('/me/profile', authorizeRoles('Student'), getOwnStudentProfile);
router.get('/:id/profile', authorizeRoles('School Admin', 'Admin', 'Staff', 'Teacher', 'Student', 'Parent'), requireStudentOwnParam('id'), requireParentOwnChild('id'), getStudentProfile);
router.get('/:id/guardian', authorizeRoles('School Admin', 'Admin', 'Staff', 'Teacher', 'Parent'), requireStudentOwnParam('id'), requireParentOwnChild('id'), getStudentGuardian);
router.get('/:id', authorizeRoles('School Admin', 'Admin', 'Staff', 'Teacher', 'Student', 'Parent'), requireStudentOwnParam('id'), requireParentOwnChild('id'), getStudentById);
router.put('/:id', authorizeRoles('School Admin', 'Admin', 'Staff'), updateStudent);
router.delete('/:id', authorizeRoles('School Admin', 'Admin'), deleteStudent);
router.patch('/:id/activate', authorizeRoles('School Admin', 'Admin'), activateStudent);
router.patch('/:id/suspend', authorizeRoles('School Admin', 'Admin'), suspendStudent);

module.exports = router;
