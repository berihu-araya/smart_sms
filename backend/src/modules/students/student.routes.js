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

const router = express.Router();

router.use(authMiddleware);
router.get('/', listStudents);
router.post('/', createStudent);
router.get('/:id/profile', getStudentProfile);
router.get('/:id/guardian', getStudentGuardian);
router.get('/:id', getStudentById);
router.put('/:id', updateStudent);
router.delete('/:id', deleteStudent);
router.patch('/:id/activate', activateStudent);
router.patch('/:id/suspend', suspendStudent);

module.exports = router;
