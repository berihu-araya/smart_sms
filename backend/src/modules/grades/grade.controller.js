const GradeRepository = require('./grade.repository');
const { GradeService } = require('./grade.service');
const {
  validateCreateGradeInput,
  validateUpdateGradeInput,
  validateGradeId,
} = require('./grade.validation');
const { db } = require('../../config/database');

const gradeService = new GradeService(new GradeRepository(db));

async function listGrades(req, res, next) {
  try {
    const data = await gradeService.listGrades({
      search: req.query.search || '',
      limit: Number(req.query.limit || 20),
      offset: Number(req.query.offset || 0),
    });

    return res.status(200).json({
      success: true,
      message: 'Grades loaded successfully.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function getGradeById(req, res, next) {
  const { id, errors } = validateGradeId(req.params.id);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ success: false, message: 'Validation failed', data: errors });
  }

  try {
    const data = await gradeService.getGradeById(id);

    return res.status(200).json({
      success: true,
      message: 'Grade loaded successfully.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function createGrade(req, res, next) {
  const input = validateCreateGradeInput(req.body);

  if (Object.keys(input.errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: input.errors,
    });
  }

  try {
    const data = await gradeService.createGrade(input);

    return res.status(201).json({
      success: true,
      message: 'Grade created successfully.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function updateGrade(req, res, next) {
  const { id, errors } = validateGradeId(req.params.id);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ success: false, message: 'Validation failed', data: errors });
  }

  const input = validateUpdateGradeInput(req.body);

  if (Object.keys(input.errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: input.errors,
    });
  }

  try {
    const data = await gradeService.updateGrade(id, input);

    return res.status(200).json({
      success: true,
      message: 'Grade updated successfully.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function deleteGrade(req, res, next) {
  const { id, errors } = validateGradeId(req.params.id);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ success: false, message: 'Validation failed', data: errors });
  }

  try {
    const data = await gradeService.deleteGrade(id);

    return res.status(200).json({
      success: true,
      message: 'Grade deleted successfully.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listGrades,
  getGradeById,
  createGrade,
  updateGrade,
  deleteGrade,
};

