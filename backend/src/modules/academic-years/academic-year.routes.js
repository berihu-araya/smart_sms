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
const authorizeRoles = require('../../middlewares/role.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', authorizeRoles('School Admin', 'Admin', 'Staff', 'Teacher', 'Student', 'Parent'), listAcademicYears);
router.get('/active', authorizeRoles('School Admin', 'Admin', 'Staff', 'Teacher', 'Student', 'Parent'), getActiveAcademicYear);
router.post('/', authorizeRoles('School Admin', 'Admin'), createAcademicYear);
router.get('/:id', authorizeRoles('School Admin', 'Admin', 'Staff', 'Teacher', 'Student', 'Parent'), getAcademicYearById);
router.put('/:id', authorizeRoles('School Admin', 'Admin'), updateAcademicYear);
router.patch('/:id/activate', authorizeRoles('School Admin', 'Admin'), setActiveAcademicYear);
router.delete('/:id', authorizeRoles('School Admin', 'Admin'), deleteAcademicYear);

module.exports = router;

