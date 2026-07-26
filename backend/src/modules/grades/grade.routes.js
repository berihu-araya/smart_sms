const express = require('express');
const {
  listGrades,
  getGradeById,
  createGrade,
  updateGrade,
  deleteGrade,
} = require('./grade.controller');
const authMiddleware = require('../../middlewares/auth.middleware');

const router = express.Router();

router.use(authMiddleware);
router.get('/', listGrades);
router.post('/', createGrade);
router.get('/:id', getGradeById);
router.put('/:id', updateGrade);
router.delete('/:id', deleteGrade);

module.exports = router;

