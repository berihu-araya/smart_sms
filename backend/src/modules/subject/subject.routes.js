const express = require('express');

const {
  listSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  deleteSubject,
} = require('./subject.controller');

const authMiddleware = require('../../middlewares/auth.middleware');


const router = express.Router();


// Protect all subject endpoints
router.use(authMiddleware);


// GET all subjects
router.get('/', listSubjects);


// CREATE subject
router.post('/', createSubject);


// GET single subject
router.get('/:id', getSubjectById);


// UPDATE subject
router.put('/:id', updateSubject);


// SOFT DELETE subject
router.delete('/:id', deleteSubject);


module.exports = router;