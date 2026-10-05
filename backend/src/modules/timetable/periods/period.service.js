const { timeToMinutes } = require('./period.validation');
const { db } = require('../../../config/database');

class PeriodNotFoundError extends Error {
  constructor(message = 'Period not found') {
    super(message);
    this.name = 'PeriodNotFoundError';
    this.status = 404;
  }
}

class PeriodConflictError extends Error {
  constructor(message = 'Period configuration conflict') {
    super(message);
    this.name = 'PeriodConflictError';
    this.status = 409;
  }
}

class PeriodValidationError extends Error {
  constructor(message = 'Validation failed', errors = {}) {
    super(message);
    this.name = 'PeriodValidationError';
    this.status = 400;
    this.errors = errors;
  }
}

class PeriodService {
  constructor(repository) {
    this.repository = repository;
  }

  async listPeriods({ academicYearId, isActive, search = '' } = {}) {
    let resolvedAcademicYearId = academicYearId;
    if (!resolvedAcademicYearId) {
      const activeYear = await this.repository.findActiveAcademicYear();
      if (activeYear) {
        resolvedAcademicYearId = activeYear.id;
      }
    }

    const periods = await this.repository.findAll({
      academicYearId: resolvedAcademicYearId,
      isActive,
      search,
    });

    return periods;
  }

  async getPeriodById(id) {
    const period = await this.repository.findById(id);
    if (!period) {
      throw new PeriodNotFoundError();
    }
    return period;
  }

  async createPeriod(payload) {
    // 1. Check duplicate period_order within academic year
    const existingOrder = await this.repository.findByOrder(
      payload.academic_year_id,
      payload.period_order
    );
    if (existingOrder) {
      throw new PeriodConflictError(
        `Period order ${payload.period_order} is already used by "${existingOrder.name}"`
      );
    }

    // 2. Check time overlaps with existing active periods in the same academic year
    const existingPeriods = await this.repository.findAll({
      academicYearId: payload.academic_year_id,
      isActive: true,
    });

    const newStart = timeToMinutes(payload.start_time);
    const newEnd = timeToMinutes(payload.end_time);

    for (const ep of existingPeriods) {
      const epStart = timeToMinutes(ep.start_time);
      const epEnd = timeToMinutes(ep.end_time);

      // Check if periods overlap (start < epEnd && end > epStart)
      if (newStart < epEnd && newEnd > epStart) {
        throw new PeriodConflictError(
          `Time ${payload.start_time}-${payload.end_time} overlaps with existing Period "${ep.name}" (${ep.start_time}-${ep.end_time})`
        );
      }
    }

    const created = await this.repository.create(payload);
    return created;
  }

  async updatePeriod(id, payload) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new PeriodNotFoundError();
    }

    const targetYearId = payload.academic_year_id || existing.academic_year_id;

    // 1. Check order uniqueness if changed
    if (payload.period_order && payload.period_order !== existing.period_order) {
      const duplicateOrder = await this.repository.findByOrder(
        targetYearId,
        payload.period_order,
        id
      );
      if (duplicateOrder) {
        throw new PeriodConflictError(
          `Period order ${payload.period_order} is already used by "${duplicateOrder.name}"`
        );
      }
    }

    // 2. Check time overlap if start_time or end_time changed
    if (payload.start_time || payload.end_time) {
      const newStart = timeToMinutes(payload.start_time || existing.start_time);
      const newEnd = timeToMinutes(payload.end_time || existing.end_time);

      const allPeriods = await this.repository.findAll({
        academicYearId: targetYearId,
        isActive: true,
      });

      for (const ep of allPeriods) {
        if (ep.id === id) continue;
        const epStart = timeToMinutes(ep.start_time);
        const epEnd = timeToMinutes(ep.end_time);

        if (newStart < epEnd && newEnd > epStart) {
          throw new PeriodConflictError(
            `Time overlaps with existing Period "${ep.name}" (${ep.start_time}-${ep.end_time})`
          );
        }
      }
    }

    const updated = await this.repository.update(id, payload);
    return updated;
  }

  async deletePeriod(id) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new PeriodNotFoundError();
    }

    const isUsed = await this.repository.isPeriodUsedInTimetables(id);
    if (isUsed) {
      throw new PeriodConflictError(
        'Cannot delete period because it is assigned to existing timetable entries'
      );
    }

    const deleted = await this.repository.softDelete(id);
    return deleted;
  }

  async bulkReorder(items = []) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      const results = [];
      for (const item of items) {
        const updated = await this.repository.update(item.id, { period_order: item.period_order }, client);
        if (updated) {
          results.push(updated);
        }
      }
      await client.query('COMMIT');
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = {
  PeriodService,
  PeriodNotFoundError,
  PeriodConflictError,
  PeriodValidationError,
};
