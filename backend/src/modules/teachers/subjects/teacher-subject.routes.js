const express = require('express');

const {
  listTeacherSubjects,
  getMyOverview,
  getTeacherSubjectById,
  createTeacherSubject,
  updateTeacherSubject,
  deleteTeacherSubject,
} = require('./teacher-subject.controller');

const authMiddleware = require('../../../middlewares/auth.middleware');
const { attachTeacherScope } = require('../../../middlewares/teacher.scope');

const router = express.Router();

router.use(authMiddleware);
router.use(attachTeacherScope);

router.get('/my-overview', getMyOverview);

router.get('/', listTeacherSubjects);

router.post('/', createTeacherSubject);

router.get('/:id', getTeacherSubjectById);

router.put('/:id', updateTeacherSubject);

router.delete('/:id', deleteTeacherSubject);

module.exports = router;