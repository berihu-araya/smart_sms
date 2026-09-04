const { db } = require('../../config/database');
const TimetableRepository = require('./timetable.repository');
const PeriodRepository = require('./periods/period.repository');
const AvailabilityRepository = require('./availability/availability.repository');
const ConflictRepository = require('./conflict/conflict.repository');
const ConflictService = require('./conflict/conflict.service');
const { TimetableService } = require('./timetable.service');
const {
  validateCreateTimetableInput,
  validateUpdateTimetableInput,
  validateCreateEntryInput,
  validateUpdateEntryInput,
  validateTimetableId,
  validateEntryId,
} = require('./timetable.validation');

const repository = new TimetableRepository(db);
const periodRepository = new PeriodRepository(db);
const availabilityRepository = new AvailabilityRepository(db);
const conflictRepository = new ConflictRepository(db);
const conflictService = new ConflictService(conflictRepository);
const service = new TimetableService(
  repository,
  periodRepository,
  availabilityRepository,
  conflictService
);

// --- Timetable Headers ---

async function listTimetables(req, res, next) {
  try {
    const { academic_year_id, academicYearId, term, status, limit = 50, offset = 0 } = req.query;

    const parsedLimit = Math.max(1, Math.min(100, Number(limit) || 50));
    const parsedOffset = Math.max(0, Number(offset) || 0);

    const result = await service.listTimetables({
      academicYearId: academic_year_id || academicYearId,
      term,
      status,
      limit: parsedLimit,
      offset: parsedOffset,
      schoolId: req.user?.school_id,
    });

    return res.status(200).json({
      success: true,
      message: 'Timetables retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function getTimetableById(req, res, next) {
  try {
    const { id } = req.params;
    const { isValid, error } = validateTimetableId(id);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: error,
        data: null,
      });
    }

    const timetable = await service.getTimetableById(id);
    return res.status(200).json({
      success: true,
      message: 'Timetable retrieved successfully',
      data: timetable,
    });
  } catch (error) {
    next(error);
  }
}

async function createTimetable(req, res, next) {
  try {
    const { data, errors } = validateCreateTimetableInput(req.body);
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        data: { errors },
      });
    }

    const timetable = await service.createTimetable({
      ...data,
      created_by: req.user?.sub || null,
    });

    return res.status(201).json({
      success: true,
      message: 'Timetable created successfully',
      data: timetable,
    });
  } catch (error) {
    next(error);
  }
}

async function updateTimetable(req, res, next) {
  try {
    const { id } = req.params;
    const { isValid, error } = validateTimetableId(id);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: error,
        data: null,
      });
    }

    const { data, errors } = validateUpdateTimetableInput(req.body);
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        data: { errors },
      });
    }

    const timetable = await service.updateTimetable(id, data);
    return res.status(200).json({
      success: true,
      message: 'Timetable updated successfully',
      data: timetable,
    });
  } catch (error) {
    next(error);
  }
}

async function deleteTimetable(req, res, next) {
  try {
    const { id } = req.params;
    const { isValid, error } = validateTimetableId(id);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: error,
        data: null,
      });
    }

    const timetable = await service.deleteTimetable(id);
    return res.status(200).json({
      success: true,
      message: 'Timetable deleted successfully',
      data: timetable,
    });
  } catch (error) {
    next(error);
  }
}

async function cloneTimetable(req, res, next) {
  try {
    const { id } = req.params;
    const { isValid, error } = validateTimetableId(id);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: error,
        data: null,
      });
    }

    const { name } = req.body;
    const cloned = await service.cloneTimetable(id, {
      name,
      userId: req.user?.sub || null,
    });

    return res.status(201).json({
      success: true,
      message: 'Timetable cloned successfully',
      data: cloned,
    });
  } catch (error) {
    next(error);
  }
}

// --- Timetable Entries ---

async function listEntries(req, res, next) {
  try {
    const { id: timetableId } = req.params;
    const { section_id, sectionId, teacher_id, teacherId, room_id, roomId, day_of_week, dayOfWeek, period_id, periodId } = req.query;

    const entries = await service.listEntries({
      timetableId,
      sectionId: section_id || sectionId,
      teacherId: teacher_id || teacherId,
      roomId: room_id || roomId,
      dayOfWeek: day_of_week || dayOfWeek,
      periodId: period_id || periodId,
    });

    return res.status(200).json({
      success: true,
      message: 'Timetable entries retrieved successfully',
      data: entries,
    });
  } catch (error) {
    next(error);
  }
}

async function createEntry(req, res, next) {
  try {
    const { id: timetableId } = req.params;
    const { data, errors } = validateCreateEntryInput({
      ...req.body,
      timetable_id: timetableId,
    });

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        data: { errors },
      });
    }

    const entry = await service.createEntry(data);
    return res.status(201).json({
      success: true,
      message: 'Timetable entry created successfully',
      data: entry,
    });
  } catch (error) {
    if (error.name === 'TimetableConflictError') {
      return res.status(409).json({
        success: false,
        message: error.message,
        data: {
          hasConflict: true,
          conflicts: error.conflicts,
        },
      });
    }
    next(error);
  }
}

async function checkEntryConflict(req, res, next) {
  try {
    const { id: timetableId } = req.params;
    const { teacher_id, teacherId, section_id, sectionId, room_id, roomId, period_id, periodId, day_of_week, dayOfWeek, exclude_entry_id, excludeEntryId } = req.body;

    const result = await service.validateEntryConflicts(
      timetableId,
      {
        teacherId: teacher_id || teacherId,
        sectionId: section_id || sectionId,
        roomId: room_id || roomId,
        periodId: period_id || periodId,
        dayOfWeek: day_of_week || dayOfWeek,
      },
      exclude_entry_id || excludeEntryId || null
    );

    return res.status(200).json({
      success: true,
      message: result.hasConflict ? 'Conflict detected' : 'No conflicts detected',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function updateEntry(req, res, next) {
  try {
    const { entryId } = req.params;
    const { isValid, error } = validateEntryId(entryId);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: error,
        data: null,
      });
    }

    const { data, errors } = validateUpdateEntryInput(req.body);
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        data: { errors },
      });
    }

    const entry = await service.updateEntry(entryId, data);
    return res.status(200).json({
      success: true,
      message: 'Timetable entry updated successfully',
      data: entry,
    });
  } catch (error) {
    if (error.name === 'TimetableConflictError') {
      return res.status(409).json({
        success: false,
        message: error.message,
        data: {
          hasConflict: true,
          conflicts: error.conflicts,
        },
      });
    }
    next(error);
  }
}

async function deleteEntry(req, res, next) {
  try {
    const { entryId } = req.params;
    const { isValid, error } = validateEntryId(entryId);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: error,
        data: null,
      });
    }

    const entry = await service.deleteEntry(entryId);
    return res.status(200).json({
      success: true,
      message: 'Timetable entry deleted successfully',
      data: entry,
    });
  } catch (error) {
    next(error);
  }
}

async function validateTimetable(req, res, next) {
  try {
    const { id } = req.params;
    const { isValid, error } = validateTimetableId(id);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: error,
        data: null,
      });
    }

    const report = await service.validateTimetable(id);
    return res.status(200).json({
      success: true,
      message: report.hasConflict
        ? 'Timetable has scheduling conflicts that must be resolved'
        : 'Timetable validation passed successfully',
      data: report,
    });
  } catch (error) {
    next(error);
  }
}

async function getActiveTimetable(req, res, next) {
  try {
    const { academic_year_id, academicYearId } = req.query;
    const active = await service.getActiveTimetable(academic_year_id || academicYearId);
    return res.status(200).json({
      success: true,
      message: active ? 'Active timetable retrieved' : 'No active published timetable found',
      data: active,
    });
  } catch (error) {
    next(error);
  }
}

async function getMySchedule(req, res, next) {
  try {
    const { academic_year_id, academicYearId } = req.query;
    const schedule = await service.getMySchedule(req.user, {
      academicYearId: academic_year_id || academicYearId,
    });
    return res.status(200).json({
      success: true,
      message: 'Personal schedule retrieved successfully',
      data: schedule,
    });
  } catch (error) {
    next(error);
  }
}

async function publishTimetable(req, res, next) {
  try {
    const { id } = req.params;
    const { isValid, error } = validateTimetableId(id);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: error,
        data: null,
      });
    }

    const published = await service.publishTimetable(id, req.user?.sub || req.user?.id);
    return res.status(200).json({
      success: true,
      message: 'Timetable published successfully and set as active',
      data: published,
    });
  } catch (error) {
    if (error.name === 'TimetableConflictError') {
      return res.status(409).json({
        success: false,
        message: error.message,
        data: {
          hasConflict: true,
          conflicts: error.conflicts,
        },
      });
    }
    next(error);
  }
}

async function archiveTimetable(req, res, next) {
  try {
    const { id } = req.params;
    const { isValid, error } = validateTimetableId(id);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: error,
        data: null,
      });
    }

    const archived = await service.archiveTimetable(id);
    return res.status(200).json({
      success: true,
      message: 'Timetable archived successfully',
      data: archived,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listTimetables,
  getTimetableById,
  getActiveTimetable,
  getMySchedule,
  createTimetable,
  updateTimetable,
  deleteTimetable,
  cloneTimetable,
  publishTimetable,
  archiveTimetable,
  validateTimetable,
  listEntries,
  createEntry,
  updateEntry,
  deleteEntry,
  checkEntryConflict,
};
