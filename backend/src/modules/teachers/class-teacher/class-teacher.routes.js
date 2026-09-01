/**
 * Class Teacher Routes
 * Routes for managing class teacher assignments
 */

const express = require('express');
const {
  listClassTeachers,
  getClassTeacherById,
  getClassTeacherForCurrentYear,
  createClassTeacher,
  updateClassTeacher,
  deleteClassTeacher,
} = require('./class-teacher.controller');
const authMiddleware = require('../../../middlewares/auth.middleware');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

/**
 * GET /class-teachers
 * List all class teacher assignments
 * Query params: teacher_id, section_id, academic_year_id, status, search, limit, offset
 */
router.get('/', listClassTeachers);

/**
 * POST /class-teachers
 * Create new class teacher assignment
 */
router.post('/', createClassTeacher);

/**
 * GET /class-teachers/current-year/:section_id
 * Get active class teacher for a section in current academic year
 */
router.get('/current-year/:section_id', getClassTeacherForCurrentYear);

/**
 * GET /class-teachers/:id
 * Get class teacher assignment by ID
 */
router.get('/:id', getClassTeacherById);

/**
 * PUT /class-teachers/:id
 * Update class teacher assignment
 */
router.put('/:id', updateClassTeacher);

/**
 * DELETE /class-teachers/:id
 * Delete class teacher assignment
 */
router.delete('/:id', deleteClassTeacher);

module.exports = router;
