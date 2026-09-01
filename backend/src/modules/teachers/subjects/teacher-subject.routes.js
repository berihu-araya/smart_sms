const express = require('express');

const {
  listTeacherSubjects,
  getTeacherSubjectById,
  createTeacherSubject,
  updateTeacherSubject,
  deleteTeacherSubject,
  getTeachersBySubject,
} = require('./teacher-subject.controller');

const authMiddleware =
  require('../../../middlewares/auth.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', listTeacherSubjects);

router.post('/', createTeacherSubject);

router.get('/by-subject/:subjectId', getTeachersBySubject);

router.get('/:id', getTeacherSubjectById);

router.put('/:id', updateTeacherSubject);

router.delete('/:id', deleteTeacherSubject);

module.exports = router;