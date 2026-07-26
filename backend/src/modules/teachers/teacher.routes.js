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

const router = express.Router();

router.use(authMiddleware);
router.get('/', listTeachers);
router.post('/', createTeacher);
router.get('/:id/profile', getTeacherProfile);
router.get('/:id', getTeacherById);
router.put('/:id', updateTeacher);
router.delete('/:id', deleteTeacher);
router.patch('/:id/activate', activateTeacher);
router.patch('/:id/terminate', terminateTeacher);

module.exports = router;

