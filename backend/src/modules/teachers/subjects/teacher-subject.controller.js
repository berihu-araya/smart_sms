const TeacherSubjectRepository = require('./teacher-subject.repository');
const {
  TeacherSubjectService,
} = require('./teacher-subject.service');

const {
  validateCreateTeacherSubjectInput,
  validateUpdateTeacherSubjectInput,
  validateTeacherSubjectId,
} = require('./teacher-subject.validation');

const { db } = require('../../../config/database');

const teacherSubjectService =
  new TeacherSubjectService(
    new TeacherSubjectRepository(db)
  );

async function listTeacherSubjects(req, res, next) {
  try {
    const data =
      await teacherSubjectService.listTeacherSubjects({
        teacher_id: req.query.teacher_id,
        grade_id: req.query.grade_id,
        section_id: req.query.section_id,
        academic_year_id: req.query.academic_year_id,
        search: req.query.search || '',
        limit: Number(req.query.limit || 20),
        offset: Number(req.query.offset || 0),
      });

    return res.status(200).json({
      success: true,
      message: 'Teacher subjects loaded successfully.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function getTeacherSubjectById(req, res, next) {
  const { id, errors } =
    validateTeacherSubjectId(req.params.id);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: errors,
    });
  }

  try {
    const data =
      await teacherSubjectService.getTeacherSubjectById(id);

    return res.status(200).json({
      success: true,
      message: 'Teacher subject loaded successfully.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function createTeacherSubject(req, res, next) {
  const input =
    validateCreateTeacherSubjectInput(req.body);

  if (Object.keys(input.errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: input.errors,
    });
  }

  try {
    const data =
      await teacherSubjectService.createTeacherSubject(
        input
      );

    return res.status(201).json({
      success: true,
      message:
        'Teacher subject assigned successfully.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function updateTeacherSubject(req, res, next) {
  const { id, errors } =
    validateTeacherSubjectId(req.params.id);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: errors,
    });
  }

  const input =
    validateUpdateTeacherSubjectInput(req.body);

  if (Object.keys(input.errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: input.errors,
    });
  }

  try {
    const data =
      await teacherSubjectService.updateTeacherSubject(
        id,
        input
      );

    return res.status(200).json({
      success: true,
      message:
        'Teacher subject updated successfully.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function deleteTeacherSubject(req, res, next) {
  const { id, errors } =
    validateTeacherSubjectId(req.params.id);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: errors,
    });
  }

  try {
    const data =
      await teacherSubjectService.deleteTeacherSubject(
        id
      );

    return res.status(200).json({
      success: true,
      message:
        'Teacher subject deleted successfully.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listTeacherSubjects,
  getTeacherSubjectById,
  createTeacherSubject,
  updateTeacherSubject,
  deleteTeacherSubject,
};