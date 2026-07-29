const express = require('express');

const {
  listGradeSubjects,
  getGradeSubjectById,
  createGradeSubject,
  updateGradeSubject,
  deleteGradeSubject,
} = require('./grade-subject.controller');


const authMiddleware = require('../../../middlewares/auth.middleware');


const router = express.Router();


// Protect all grade-subject routes
router.use(authMiddleware);



// GET all grade subjects
router.get(
  '/',
  listGradeSubjects
);


// CREATE grade subject assignment
router.post(
  '/',
  createGradeSubject
);


// GET one grade subject
router.get(
  '/:id',
  getGradeSubjectById
);


// UPDATE grade subject
router.put(
  '/:id',
  updateGradeSubject
);


// DELETE grade subject
router.delete(
  '/:id',
  deleteGradeSubject
);



module.exports = router;