const express = require('express');
const {
  listAcademicYears,
  getAcademicYearById,
  getActiveAcademicYear,
  createAcademicYear,
  updateAcademicYear,
  setActiveAcademicYear,
  deleteAcademicYear,
} = require('./academic-year.controller');
const authMiddleware = require('../../middlewares/auth.middleware');

const router = express.Router();

router.use(authMiddleware);
router.get('/', listAcademicYears);
router.get('/active', getActiveAcademicYear);
router.post('/', createAcademicYear);
router.get('/:id', getAcademicYearById);
router.put('/:id', updateAcademicYear);
router.patch('/:id/activate', setActiveAcademicYear);
router.delete('/:id', deleteAcademicYear);

module.exports = router;

