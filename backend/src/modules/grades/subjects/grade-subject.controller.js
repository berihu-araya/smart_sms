const GradeSubjectRepository = require('./grade-subject.repository');
const { GradeSubjectService } = require('./grade-subject.service');
const {
  validateCreateGradeSubjectInput,
  validateUpdateGradeSubjectInput,
  validateBulkGradeSubjectInput,
  validateCloneGradeSubjectInput,
  validateGradeSubjectId,
} = require('./grade-subject.validation');
const { db } = require('../../../config/database');

const gradeSubjectService = new GradeSubjectService(
  new GradeSubjectRepository(db)
);

async function listGradeSubjects(req, res, next) {
  try {
    const data = await gradeSubjectService.listGradeSubjects({
      grade_id: req.query.grade_id,
      academic_year_id: req.query.academic_year_id,
      status: req.query.status,
      is_compulsory: req.query.is_compulsory,
      search: req.query.search || '',
      limit: Number(req.query.limit || 50),
      offset: Number(req.query.offset || 0),
    });

    return res.status(200).json({
      success: true,
      message: 'Grade subjects loaded successfully.',
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function getGradeSubjectById(req, res, next) {
  const { id, errors } = validateGradeSubjectId(req.params.id);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: errors,
    });
  }

  try {
    const data = await gradeSubjectService.getGradeSubjectById(id);
    return res.status(200).json({
      success: true,
      message: 'Grade subject loaded successfully.',
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function createGradeSubject(req, res, next) {
  const input = validateCreateGradeSubjectInput(req.body);

  if (Object.keys(input.errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: input.errors,
    });
  }

  try {
    const data = await gradeSubjectService.createGradeSubject(input);
    return res.status(201).json({
      success: true,
      message: 'Grade subject assigned successfully.',
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function bulkAssignSubjects(req, res, next) {
  const input = validateBulkGradeSubjectInput(req.body);

  if (Object.keys(input.errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: input.errors,
    });
  }

  try {
    const data = await gradeSubjectService.bulkAssignSubjects(input);
    return res.status(201).json({
      success: true,
      message: `Successfully allocated ${data.assignedCount} subject(s) to grade.`,
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function cloneGradeSubjects(req, res, next) {
  const input = validateCloneGradeSubjectInput(req.body);

  if (Object.keys(input.errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: input.errors,
    });
  }

  try {
    const data = await gradeSubjectService.cloneGradeSubjects(input);
    return res.status(201).json({
      success: true,
      message: `Successfully cloned ${data.clonedCount} subject(s) to target grade.`,
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function getCurriculumStats(req, res, next) {
  try {
    const data = await gradeSubjectService.getCurriculumStats({
      grade_id: req.query.grade_id,
      academic_year_id: req.query.academic_year_id,
    });

    return res.status(200).json({
      success: true,
      message: 'Curriculum statistics loaded successfully.',
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function getSubjectMappedGrades(req, res, next) {
  const subjectId = req.params.subjectId;
  if (!subjectId) {
    return res.status(400).json({
      success: false,
      message: 'Subject ID is required',
    });
  }

  try {
    const data = await gradeSubjectService.getSubjectMappedGrades(
      subjectId,
      req.query.academic_year_id
    );

    return res.status(200).json({
      success: true,
      message: 'Subject mapped grades loaded successfully.',
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function updateGradeSubject(req, res, next) {
  const { id, errors: idErrors } = validateGradeSubjectId(req.params.id);
  if (Object.keys(idErrors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: idErrors,
    });
  }

  const { payload, errors: payloadErrors } = validateUpdateGradeSubjectInput(req.body);
  if (Object.keys(payloadErrors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: payloadErrors,
    });
  }

  try {
    const data = await gradeSubjectService.updateGradeSubject(id, payload);
    return res.status(200).json({
      success: true,
      message: 'Grade subject updated successfully.',
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function deleteGradeSubject(req, res, next) {
  const { id, errors } = validateGradeSubjectId(req.params.id);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: errors,
    });
  }

  try {
    const data = await gradeSubjectService.deleteGradeSubject(id);
    return res.status(200).json({
      success: true,
      message: 'Grade subject deleted successfully.',
      data,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listGradeSubjects,
  getGradeSubjectById,
  createGradeSubject,
  bulkAssignSubjects,
  cloneGradeSubjects,
  getCurriculumStats,
  getSubjectMappedGrades,
  updateGradeSubject,
  deleteGradeSubject,
};