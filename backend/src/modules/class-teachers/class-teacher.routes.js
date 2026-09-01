const express = require('express');
const {
  assignClassTeacher,
  listClassTeachers,
  getClassTeacherBySection,
  deactivateClassTeacher,
} = require('./class-teacher.controller');

const router = express.Router();

router.get('/', listClassTeachers);
router.post('/', assignClassTeacher);
router.get('/sections/:sectionId', getClassTeacherBySection);
router.patch('/:id/deactivate', deactivateClassTeacher);

module.exports = router;
