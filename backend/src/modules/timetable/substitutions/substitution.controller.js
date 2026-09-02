const { db } = require('../../../config/database');
const SubstitutionRepository = require('./substitution.repository');
const { SubstitutionService } = require('./substitution.service');
const {
  validateCreateSubstitutionInput,
  validateUpdateSubstitutionStatusInput,
  validateSubstitutionId,
} = require('./substitution.validation');

const repository = new SubstitutionRepository(db);
const service = new SubstitutionService(repository);

async function listSubstitutions(req, res, next) {
  try {
    const {
      timetable_id,
      timetableId,
      teacher_id,
      teacherId,
      substitute_teacher_id,
      substituteTeacherId,
      date,
      from_date,
      fromDate,
      to_date,
      toDate,
      status,
      limit = 50,
      offset = 0,
    } = req.query;

    const parsedLimit = Math.max(1, Math.min(100, Number(limit) || 50));
    const parsedOffset = Math.max(0, Number(offset) || 0);

    const result = await service.listSubstitutions({
      timetableId: timetable_id || timetableId,
      teacherId: teacher_id || teacherId,
      substituteTeacherId: substitute_teacher_id || substituteTeacherId,
      date,
      fromDate: from_date || fromDate,
      toDate: to_date || toDate,
      status,
      limit: parsedLimit,
      offset: parsedOffset,
    });

    return res.status(200).json({
      success: true,
      message: 'Substitutions retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function getSubstitutionById(req, res, next) {
  try {
    const { id } = req.params;
    const { isValid, error } = validateSubstitutionId(id);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: error,
        data: null,
      });
    }

    const substitution = await service.getSubstitutionById(id);
    return res.status(200).json({
      success: true,
      message: 'Substitution details retrieved successfully',
      data: substitution,
    });
  } catch (error) {
    next(error);
  }
}

async function createSubstitution(req, res, next) {
  try {
    const { data, errors } = validateCreateSubstitutionInput(req.body);
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        data: { errors },
      });
    }

    const substitution = await service.createSubstitution(data, req.user?.sub || req.user?.id);
    return res.status(201).json({
      success: true,
      message: 'Substitution requested successfully',
      data: substitution,
    });
  } catch (error) {
    if (error.name === 'SubstitutionConflictError') {
      return res.status(409).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
    next(error);
  }
}

async function approveSubstitution(req, res, next) {
  try {
    const { id } = req.params;
    const { isValid, error } = validateSubstitutionId(id);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: error,
        data: null,
      });
    }

    const { notes } = req.body || {};
    const approved = await service.approveSubstitution(id, req.user?.sub || req.user?.id, notes);

    return res.status(200).json({
      success: true,
      message: 'Substitution request approved',
      data: approved,
    });
  } catch (error) {
    if (error.name === 'SubstitutionConflictError') {
      return res.status(409).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
    next(error);
  }
}

async function rejectSubstitution(req, res, next) {
  try {
    const { id } = req.params;
    const { isValid, error } = validateSubstitutionId(id);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: error,
        data: null,
      });
    }

    const { notes } = req.body || {};
    const rejected = await service.rejectSubstitution(id, req.user?.sub || req.user?.id, notes);

    return res.status(200).json({
      success: true,
      message: 'Substitution request rejected',
      data: rejected,
    });
  } catch (error) {
    next(error);
  }
}

async function cancelSubstitution(req, res, next) {
  try {
    const { id } = req.params;
    const { isValid, error } = validateSubstitutionId(id);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: error,
        data: null,
      });
    }

    const cancelled = await service.cancelSubstitution(id);
    return res.status(200).json({
      success: true,
      message: 'Substitution request cancelled',
      data: cancelled,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listSubstitutions,
  getSubstitutionById,
  createSubstitution,
  approveSubstitution,
  rejectSubstitution,
  cancelSubstitution,
};
