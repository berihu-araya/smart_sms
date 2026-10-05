const { db } = require('../../../config/database');
const PeriodRepository = require('./period.repository');
const { PeriodService } = require('./period.service');
const {
  validateCreatePeriodInput,
  validateUpdatePeriodInput,
  validatePeriodId,
  validateBulkReorderInput,
} = require('./period.validation');

const repository = new PeriodRepository(db);
const service = new PeriodService(repository);

async function listPeriods(req, res, next) {
  try {
    const { academic_year_id, academicYearId, is_active, isActive, search } = req.query;

    const periods = await service.listPeriods({
      academicYearId: academic_year_id || academicYearId,
      isActive: is_active !== undefined ? is_active : isActive,
      search: search || '',
    });

    return res.status(200).json({
      success: true,
      message: 'Periods retrieved successfully',
      data: periods,
    });
  } catch (error) {
    next(error);
  }
}

async function getPeriodById(req, res, next) {
  try {
    const { id } = req.params;
    const { isValid, error } = validatePeriodId(id);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: error,
        data: null,
      });
    }

    const period = await service.getPeriodById(id);
    return res.status(200).json({
      success: true,
      message: 'Period retrieved successfully',
      data: period,
    });
  } catch (error) {
    next(error);
  }
}

async function createPeriod(req, res, next) {
  try {
    const { data, errors } = validateCreatePeriodInput(req.body);
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        data: { errors },
      });
    }

    const period = await service.createPeriod(data);
    return res.status(201).json({
      success: true,
      message: 'Period created successfully',
      data: period,
    });
  } catch (error) {
    next(error);
  }
}

async function updatePeriod(req, res, next) {
  try {
    const { id } = req.params;
    const { isValid, error } = validatePeriodId(id);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: error,
        data: null,
      });
    }

    const { data, errors } = validateUpdatePeriodInput(req.body);
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        data: { errors },
      });
    }

    const period = await service.updatePeriod(id, data);
    return res.status(200).json({
      success: true,
      message: 'Period updated successfully',
      data: period,
    });
  } catch (error) {
    next(error);
  }
}

async function deletePeriod(req, res, next) {
  try {
    const { id } = req.params;
    const { isValid, error } = validatePeriodId(id);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: error,
        data: null,
      });
    }

    const period = await service.deletePeriod(id);
    return res.status(200).json({
      success: true,
      message: 'Period deleted successfully',
      data: period,
    });
  } catch (error) {
    next(error);
  }
}

async function bulkReorderPeriods(req, res, next) {
  try {
    const { data, errors } = validateBulkReorderInput(req.body);
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        data: { errors },
      });
    }

    const results = await service.bulkReorder(data);
    return res.status(200).json({
      success: true,
      message: 'Periods reordered successfully',
      data: results,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listPeriods,
  getPeriodById,
  createPeriod,
  updatePeriod,
  deletePeriod,
  bulkReorderPeriods,
};
