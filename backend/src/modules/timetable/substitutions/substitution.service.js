const { SUBSTITUTION_STATUSES } = require('../timetable.constants');

class SubstitutionNotFoundError extends Error {
  constructor(message = 'Substitution request not found') {
    super(message);
    this.name = 'SubstitutionNotFoundError';
    this.status = 404;
  }
}

class SubstitutionConflictError extends Error {
  constructor(message = 'Substitution clash detected') {
    super(message);
    this.name = 'SubstitutionConflictError';
    this.status = 409;
  }
}

class SubstitutionService {
  constructor(repository) {
    this.repository = repository;
  }

  async listSubstitutions({
    timetableId,
    teacherId,
    substituteTeacherId,
    date,
    fromDate,
    toDate,
    status,
    limit = 50,
    offset = 0,
  } = {}) {
    const page = Math.floor(offset / limit) + 1;
    const { items, total } = await this.repository.findAllSubstitutions({
      timetableId,
      teacherId,
      substituteTeacherId,
      date,
      fromDate,
      toDate,
      status,
      limit,
      offset,
    });

    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
      items,
    };
  }

  async getSubstitutionById(id) {
    const substitution = await this.repository.findSubstitutionById(id);
    if (!substitution) {
      throw new SubstitutionNotFoundError();
    }
    return substitution;
  }

  async createSubstitution(payload, userId = null) {
    // 1. Fetch entry details
    const entry = await this.repository.findEntryDetails(payload.timetable_entry_id);
    if (!entry) {
      const error = new Error('Timetable entry not found');
      error.status = 404;
      throw error;
    }

    if (entry.is_break) {
      throw new SubstitutionConflictError('Cannot create a substitution for a break period');
    }

    // 2. Original teacher cannot be substitute teacher
    if (entry.teacher_id === payload.substitute_teacher_id) {
      const error = new Error('Substitute teacher cannot be the same as the original teacher');
      error.status = 400;
      throw error;
    }

    // 3. Verify date matches the day of the week
    const parsedDate = new Date(payload.substitution_date);
    const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const dateDayOfWeek = dayNames[parsedDate.getUTCDay()];

    if (dateDayOfWeek !== entry.day_of_week) {
      const error = new Error(
        `Selected substitution date (${payload.substitution_date} is a ${dateDayOfWeek}) does not match entry schedule day (${entry.day_of_week})`
      );
      error.status = 400;
      throw error;
    }

    // 4. Check if substitute teacher is already busy on this slot
    const clash = await this.repository.checkTeacherBusyOnSlot({
      teacherId: payload.substitute_teacher_id,
      timetableId: entry.timetable_id,
      dayOfWeek: entry.day_of_week,
      periodId: entry.period_id,
      date: payload.substitution_date,
    });

    if (clash.isBusy) {
      throw new SubstitutionConflictError(
        `Substitute teacher is already occupied during ${entry.period_name} (${clash.type === 'REGULAR_LESSON' ? `Teaching ${clash.details.subject_name}` : 'Covering another class'})`
      );
    }

    const created = await this.repository.createSubstitution({
      ...payload,
      original_teacher_id: entry.teacher_id,
      status: SUBSTITUTION_STATUSES.PENDING,
      requested_by: userId,
    });

    return this.getSubstitutionById(created.id);
  }

  async approveSubstitution(id, userId = null, notes = null) {
    const existing = await this.repository.findSubstitutionById(id);
    if (!existing) {
      throw new SubstitutionNotFoundError();
    }

    if (existing.status !== SUBSTITUTION_STATUSES.PENDING) {
      const error = new Error(`Only PENDING substitution requests can be approved (current status: ${existing.status})`);
      error.status = 400;
      throw error;
    }

    // Check clash again before approving
    const clash = await this.repository.checkTeacherBusyOnSlot({
      teacherId: existing.substitute_teacher_id,
      timetableId: existing.timetable_id,
      dayOfWeek: existing.day_of_week,
      periodId: existing.period_id,
      date: existing.substitution_date,
      excludeSubstitutionId: existing.id,
    });

    if (clash.isBusy) {
      throw new SubstitutionConflictError('Substitute teacher has a scheduling conflict during this period');
    }

    const updated = await this.repository.updateSubstitutionStatus(id, {
      status: SUBSTITUTION_STATUSES.APPROVED,
      approvedBy: userId,
      notes: notes || existing.notes,
    });

    return this.getSubstitutionById(updated.id);
  }

  async rejectSubstitution(id, userId = null, notes = null) {
    const existing = await this.repository.findSubstitutionById(id);
    if (!existing) {
      throw new SubstitutionNotFoundError();
    }

    const updated = await this.repository.updateSubstitutionStatus(id, {
      status: SUBSTITUTION_STATUSES.REJECTED,
      approvedBy: userId,
      notes: notes || existing.notes,
    });

    return this.getSubstitutionById(updated.id);
  }

  async cancelSubstitution(id) {
    const existing = await this.repository.findSubstitutionById(id);
    if (!existing) {
      throw new SubstitutionNotFoundError();
    }

    const updated = await this.repository.updateSubstitutionStatus(id, {
      status: SUBSTITUTION_STATUSES.CANCELLED,
    });

    return this.getSubstitutionById(updated.id);
  }
}

module.exports = {
  SubstitutionService,
  SubstitutionNotFoundError,
  SubstitutionConflictError,
};
