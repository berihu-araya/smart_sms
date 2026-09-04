const express = require('express');
const {
  listStudents,
  getStudentById,
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

const router = express.Router();

router.use(authMiddleware);

router.get('/', authorizeRoles('School Admin', 'Admin', 'Staff', 'Teacher', 'Parent'), listStudents);
router.post('/', authorizeRoles('School Admin', 'Admin', 'Staff'), createStudent);
router.get('/:id/profile', authorizeRoles('School Admin', 'Admin', 'Staff', 'Teacher', 'Student', 'Parent'), getStudentProfile);
router.get('/:id/guardian', authorizeRoles('School Admin', 'Admin', 'Staff', 'Teacher', 'Parent'), getStudentGuardian);
router.get('/:id', authorizeRoles('School Admin', 'Admin', 'Staff', 'Teacher', 'Student', 'Parent'), getStudentById);
router.put('/:id', authorizeRoles('School Admin', 'Admin', 'Staff'), updateStudent);
router.delete('/:id', authorizeRoles('School Admin', 'Admin'), deleteStudent);
router.patch('/:id/activate', authorizeRoles('School Admin', 'Admin'), activateStudent);
router.patch('/:id/suspend', authorizeRoles('School Admin', 'Admin'), suspendStudent);

module.exports = router;
