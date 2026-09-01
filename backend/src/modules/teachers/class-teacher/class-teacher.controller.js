/**
 * Class Teacher Controller
 * Handles HTTP requests for class teacher assignments
 */

const ClassTeacherRepository = require('./class-teacher.repository');
const { ClassTeacherService } = require('./class-teacher.service');
const {
  validateCreateClassTeacherInput,
  validateUpdateClassTeacherInput,
  validateClassTeacherId,
} = require('./class-teacher.validation');
const { db } = require('../../../config/database');

const classTeacherService = new ClassTeacherService(
  new ClassTeacherRepository(db),
  db
);

/**
 * List all class teacher assignments
 * Query params:
 * - teacher_id: Filter by teacher
 * - section_id: Filter by section
 * - academic_year_id: Filter by academic year
 * - status: Filter by status (default: ACTIVE)
 * - search: Search by teacher name or section name
 * - limit: Results per page (default: 20)
 * - offset: Pagination offset (default: 0)
 */
async function listClassTeachers(req, res, next) {
  try {
    const data = await classTeacherService.listClassTeachers({
      teacher_id: req.query.teacher_id,
      section_id: req.query.section_id,
      academic_year_id: req.query.academic_year_id,
      status: req.query.status || 'ACTIVE',
      search: req.query.search || '',
      limit: Number(req.query.limit || 20),
      offset: Number(req.query.offset || 0),
    });

    return res.status(200).json({
      success: true,
      message: 'Class teachers loaded successfully.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Get class teacher assignment by ID
 */
async function getClassTeacherById(req, res, next) {
  const { id, errors } = validateClassTeacherId(req.params.id);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: errors,
    });
  }

  try {
    const data = await classTeacherService.getClassTeacherById(id);

    return res.status(200).json({
      success: true,
      message: 'Class teacher loaded successfully.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Get active class teacher for a section in current academic year
 */
async function getClassTeacherForCurrentYear(req, res, next) {
  const { section_id } = req.params;

  if (!section_id || typeof section_id !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: { section_id: 'Section ID is required' },
    });
  }

  try {
    const data = await classTeacherService.getClassTeacherForCurrentYear(
      section_id
    );

    return res.status(200).json({
      success: true,
      message: 'Class teacher for current year loaded successfully.',
      data: data || null,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Create new class teacher assignment
 * Request body:
 * {
 *   teacher_id: string (required)
 *   section_id: string (required)
 *   academic_year_id: string (required)
 *   start_date: date (required)
 *   end_date: date (optional)
 *   status: string (optional, default: ACTIVE)
 *   notes: string (optional)
 *   addToTeacherSubjects: boolean (optional, default: false)
 * }
 */
async function createClassTeacher(req, res, next) {
  const input = validateCreateClassTeacherInput(req.body);

  if (Object.keys(input.errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: input.errors,
    });
  }

  try {
    const data = await classTeacherService.createClassTeacher(input);

    return res.status(201).json({
      success: true,
      message: 'Class teacher assigned successfully.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Update class teacher assignment
 */
async function updateClassTeacher(req, res, next) {
  const { id, errors } = validateClassTeacherId(req.params.id);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: errors,
    });
  }

  const { errors: validationErrors, ...payload } =
    validateUpdateClassTeacherInput(req.body);

  if (Object.keys(validationErrors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: validationErrors,
    });
  }

  try {
    const data = await classTeacherService.updateClassTeacher(id, payload);

    return res.status(200).json({
      success: true,
      message: 'Class teacher updated successfully.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Delete (soft delete) class teacher assignment
 */
async function deleteClassTeacher(req, res, next) {
  const { id, errors } = validateClassTeacherId(req.params.id);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: errors,
    });
  }

  try {
    const data = await classTeacherService.deleteClassTeacher(id);

    return res.status(200).json({
      success: true,
      message: 'Class teacher deleted successfully.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listClassTeachers,
  getClassTeacherById,
  getClassTeacherForCurrentYear,
  createClassTeacher,
  updateClassTeacher,
  deleteClassTeacher,
};
