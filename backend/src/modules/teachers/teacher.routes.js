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

const router = express.Router();

router.use(authMiddleware);

router.get('/', authorizeRoles('School Admin', 'Admin', 'Staff', 'Teacher'), listTeachers);
router.post('/', authorizeRoles('School Admin', 'Admin', 'Staff'), createTeacher);
router.get('/:id/profile', authorizeRoles('School Admin', 'Admin', 'Staff', 'Teacher'), getTeacherProfile);
router.get('/:id', authorizeRoles('School Admin', 'Admin', 'Staff', 'Teacher'), getTeacherById);
router.put('/:id', authorizeRoles('School Admin', 'Admin', 'Staff'), updateTeacher);
router.delete('/:id', authorizeRoles('School Admin', 'Admin'), deleteTeacher);
router.patch('/:id/activate', authorizeRoles('School Admin', 'Admin'), activateTeacher);
router.patch('/:id/terminate', authorizeRoles('School Admin', 'Admin'), terminateTeacher);

module.exports = router;

