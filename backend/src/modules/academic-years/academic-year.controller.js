const AcademicYearRepository = require('./academic-year.repository');
const { AcademicYearService } = require('./academic-year.service');
const {
  validateCreateAcademicYearInput,
  validateUpdateAcademicYearInput,
  validateAcademicYearId,
} = require('./academic-year.validation');
const { db } = require('../../config/database');

const academicYearService = new AcademicYearService(new AcademicYearRepository(db));

async function listAcademicYears(req, res, next) {
  try {
    const data = await academicYearService.listAcademicYears({
      search: req.query.search || '',
      limit: Number(req.query.limit || 20),
      offset: Number(req.query.offset || 0),
    });

    return res.status(200).json({
      success: true,
      message: 'Academic years loaded successfully.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function getAcademicYearById(req, res, next) {
  const { id, errors } = validateAcademicYearId(req.params.id);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ success: false, message: 'Validation failed', data: errors });
  }

  try {
    const data = await academicYearService.getAcademicYearById(id);

    return res.status(200).json({
      success: true,
      message: 'Academic year loaded successfully.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function getActiveAcademicYear(req, res, next) {
  try {
    const data = await academicYearService.getActiveAcademicYear();

    return res.status(200).json({
      success: true,
      message: 'Active academic year loaded successfully.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function createAcademicYear(req, res, next) {
  const input = validateCreateAcademicYearInput(req.body);

  if (Object.keys(input.errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: input.errors,
    });
  }

  try {
    const data = await academicYearService.createAcademicYear(input);

    return res.status(201).json({
      success: true,
      message: 'Academic year created successfully.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function updateAcademicYear(req, res, next) {
  const { id, errors: idErrors } = validateAcademicYearId(req.params.id);

  if (Object.keys(idErrors).length > 0) {
    return res.status(400).json({ success: false, message: 'Validation failed', data: idErrors });
  }

  const input = validateUpdateAcademicYearInput(req.body);

  if (Object.keys(input.errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: input.errors,
    });
  }

  try {
    const data = await academicYearService.updateAcademicYear(id, input);

    return res.status(200).json({
      success: true,
      message: 'Academic year updated successfully.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function setActiveAcademicYear(req, res, next) {
  const { id, errors } = validateAcademicYearId(req.params.id);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ success: false, message: 'Validation failed', data: errors });
  }

  try {
    const data = await academicYearService.setActiveAcademicYear(id);

    return res.status(200).json({
      success: true,
      message: 'Academic year set as active successfully.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function deleteAcademicYear(req, res, next) {
  const { id, errors } = validateAcademicYearId(req.params.id);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ success: false, message: 'Validation failed', data: errors });
  }

  try {
    const data = await academicYearService.deleteAcademicYear(id);

    return res.status(200).json({
      success: true,
      message: 'Academic year deleted successfully.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listAcademicYears,
  getAcademicYearById,
  getActiveAcademicYear,
  createAcademicYear,
  updateAcademicYear,
  setActiveAcademicYear,
  deleteAcademicYear,
};

