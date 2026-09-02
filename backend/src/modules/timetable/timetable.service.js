const { db } = require('../../config/database');
const { TIMETABLE_STATUSES } = require('./timetable.constants');

class TimetableNotFoundError extends Error {
  constructor(message = 'Timetable not found') {
    super(message);
    this.name = 'TimetableNotFoundError';
    this.status = 404;
  }
}

class EntryNotFoundError extends Error {
  constructor(message = 'Timetable entry not found') {
    super(message);
    this.name = 'EntryNotFoundError';
    this.status = 404;
  }
}

class TimetableConflictError extends Error {
  constructor(message = 'Scheduling conflict detected', conflicts = []) {
    super(message);
    this.name = 'TimetableConflictError';
    this.status = 409;
    this.conflicts = conflicts;
  }
}

class TimetableService {
  constructor(repository, periodRepository, availabilityRepository, conflictService) {
    this.repository = repository;
    this.periodRepository = periodRepository;
    this.availabilityRepository = availabilityRepository;
    this.conflictService = conflictService;
  }

  async validateTimetable(id) {
    if (!this.conflictService) {
      throw new Error('ConflictService not initialized');
    }
    return this.conflictService.validateTimetable(id);
  }

  // --- Timetables ---

  async listTimetables({ academicYearId, term, status, limit = 50, offset = 0 } = {}) {
    const page = Math.floor(offset / limit) + 1;
    const { items, total } = await this.repository.findAllTimetables({
      academicYearId,
      term,
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

  async getTimetableById(id) {
    const timetable = await this.repository.findTimetableById(id);
    if (!timetable) {
      throw new TimetableNotFoundError();
    }
    return timetable;
  }

  async getActiveTimetable(academicYearId = null) {
    const timetable = await this.repository.findActiveTimetableGlobal(academicYearId);
    if (!timetable) return null;

    let periods = [];
    if (this.periodRepository) {
      periods = await this.periodRepository.findAllPeriods({
        academicYearId: timetable.academic_year_id,
        isActive: true,
      });
    }

    return {
      timetable,
      periods,
    };
  }

  async getMySchedule(user, { academicYearId = null } = {}) {
    const activeHeader = await this.getActiveTimetable(academicYearId);
    if (!activeHeader || !activeHeader.timetable) {
      return {
        role: user?.role || 'Guest',
        timetable: null,
        periods: [],
        entries: [],
      };
    }

    const { timetable, periods } = activeHeader;
    const role = (user?.role || '').toLowerCase();
    const userId = user?.sub || user?.id;

    if (role === 'teacher') {
      const teacher = await this.repository.findUserTeachingContext(userId);
      if (!teacher) {
        return {
          role: 'Teacher',
          teacher: null,
          timetable,
          periods,
          entries: [],
          message: 'Teacher profile not linked to user account',
        };
      }

      const entries = await this.repository.findEntriesByTimetableId(timetable.id, {
        teacherId: teacher.id,
      });

      return {
        role: 'Teacher',
        teacher,
        timetable,
        periods,
        entries,
      };
    }

    if (role === 'student') {
      const student = await this.repository.findUserStudentContext(userId);
      if (!student || !student.section_id) {
        return {
          role: 'Student',
          student: student || null,
          timetable,
          periods,
          entries: [],
          message: 'Student is not assigned to a section',
        };
      }

      const entries = await this.repository.findEntriesByTimetableId(timetable.id, {
        sectionId: student.section_id,
      });

      return {
        role: 'Student',
        student,
        timetable,
        periods,
        entries,
      };
    }

    if (role === 'parent') {
      const parentData = await this.repository.findUserParentContext(userId);
      if (!parentData || !parentData.parent) {
        return {
          role: 'Parent',
          parent: null,
          children: [],
          timetable,
          periods,
          message: 'Parent profile not linked to user account',
        };
      }

      const childrenWithSchedules = await Promise.all(
        parentData.children.map(async (child) => {
          let childEntries = [];
          if (child.section_id) {
            childEntries = await this.repository.findEntriesByTimetableId(timetable.id, {
              sectionId: child.section_id,
            });
          }
          return {
            ...child,
            entries: childEntries,
          };
        })
      );

      return {
        role: 'Parent',
        parent: parentData.parent,
        children: childrenWithSchedules,
        timetable,
        periods,
      };
    }

    return {
      role: user?.role || 'Staff',
      timetable,
      periods,
      entries: [],
    };
  }

  async createTimetable(payload) {
    const created = await this.repository.createTimetable(payload);
    return created;
  }

  async updateTimetable(id, payload) {
    const existing = await this.repository.findTimetableById(id);
    if (!existing) {
      throw new TimetableNotFoundError();
    }

    const updated = await this.repository.updateTimetable(id, payload);
    return updated;
  }

  async deleteTimetable(id) {
    const existing = await this.repository.findTimetableById(id);
    if (!existing) {
      throw new TimetableNotFoundError();
    }

    if (existing.status === TIMETABLE_STATUSES.PUBLISHED && existing.is_active) {
      throw new TimetableConflictError('Cannot delete an active published timetable. Archive it first.');
    }

    const deleted = await this.repository.softDeleteTimetable(id);
    return deleted;
  }

  async publishTimetable(id, userId = null) {
    const existing = await this.repository.findTimetableById(id);
    if (!existing) {
      throw new TimetableNotFoundError();
    }

    if (this.conflictService) {
      const report = await this.conflictService.validateTimetable(id);
      if (report.hasConflict) {
        throw new TimetableConflictError(
          'Cannot publish timetable with blocking conflicts',
          report.conflicts
        );
      }
    }

    const published = await this.repository.publishTimetable(id, userId);
    return published;
  }

  async archiveTimetable(id) {
    const existing = await this.repository.findTimetableById(id);
    if (!existing) {
      throw new TimetableNotFoundError();
    }

    const archived = await this.repository.archiveTimetable(id);
    return archived;
  }

  async cloneTimetable(id, { name, userId }) {
    const existing = await this.repository.findTimetableById(id);
    if (!existing) {
      throw new TimetableNotFoundError();
    }

    const client = await db.connect();
    try {
      await client.query('BEGIN');

      const clonedHeader = await this.repository.createTimetable(
        {
          academic_year_id: existing.academic_year_id,
          term: existing.term,
          name: name || `${existing.name} (Copy v${existing.version + 1})`,
          status: TIMETABLE_STATUSES.DRAFT,
          version: existing.version + 1,
          is_active: false,
          created_by: userId || null,
        },
        client
      );

      const entries = await this.repository.findAllEntries({ timetableId: id });
      for (const entry of entries) {
        await this.repository.createEntry(
          {
            timetable_id: clonedHeader.id,
            section_id: entry.section_id,
            subject_id: entry.subject_id,
            teacher_id: entry.teacher_id,
            room_id: entry.room_id,
            period_id: entry.period_id,
            day_of_week: entry.day_of_week,
          },
          client
        );
      }

      await client.query('COMMIT');
      return this.getTimetableById(clonedHeader.id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // --- Timetable Entries ---

  async listEntries({ timetableId, sectionId, teacherId, roomId, dayOfWeek, periodId } = {}) {
    const entries = await this.repository.findAllEntries({
      timetableId,
      sectionId,
      teacherId,
      roomId,
      dayOfWeek,
      periodId,
    });
    return entries;
  }

  async getEntryById(id) {
    const entry = await this.repository.findEntryById(id);
    if (!entry) {
      throw new EntryNotFoundError();
    }
    return entry;
  }

  async validateEntryConflicts(timetableId, { teacherId, sectionId, roomId, periodId, dayOfWeek }, excludeEntryId = null) {
    const conflicts = [];

    // 1. Guard against scheduling lessons during breaks
    if (this.periodRepository) {
      const period = await this.periodRepository.findById(periodId);
      if (period && period.is_break) {
        conflicts.push({
          type: 'BREAK',
          severity: 'BLOCK',
          message: `Cannot schedule lesson during break period "${period.name}" (${period.start_time}-${period.end_time})`,
        });
      }
    }

    // 2. Teacher slot conflict
    const teacherConflict = await this.repository.findTeacherSlotConflict(
      timetableId,
      teacherId,
      dayOfWeek,
      periodId,
      excludeEntryId
    );
    if (teacherConflict) {
      conflicts.push({
        type: 'TEACHER',
        severity: 'BLOCK',
        message: `${teacherConflict.teacher_name} is already teaching ${teacherConflict.subject_name} to section "${teacherConflict.section_name}" during ${teacherConflict.period_name} on ${dayOfWeek}`,
      });
    }

    // 3. Section slot conflict
    const sectionConflict = await this.repository.findSectionSlotConflict(
      timetableId,
      sectionId,
      dayOfWeek,
      periodId,
      excludeEntryId
    );
    if (sectionConflict) {
      conflicts.push({
        type: 'SECTION',
        severity: 'BLOCK',
        message: `Section "${sectionConflict.section_name}" already has ${sectionConflict.subject_name} scheduled during ${sectionConflict.period_name} on ${dayOfWeek}`,
      });
    }

    // 4. Room slot conflict
    if (roomId) {
      const roomConflict = await this.repository.findRoomSlotConflict(
        timetableId,
        roomId,
        dayOfWeek,
        periodId,
        excludeEntryId
      );
      if (roomConflict) {
        conflicts.push({
          type: 'ROOM',
          severity: 'BLOCK',
          message: `Room "${roomConflict.room_name}" is already occupied by section "${roomConflict.section_name}" (${roomConflict.subject_name}) during ${roomConflict.period_name} on ${dayOfWeek}`,
        });
      }
    }

    // 5. Teacher availability check
    if (this.availabilityRepository) {
      const timetable = await this.repository.findTimetableById(timetableId);
      if (timetable) {
        const avail = await this.availabilityRepository.isTeacherAvailable(
          teacherId,
          timetable.academic_year_id,
          dayOfWeek,
          periodId
        );
        if (!avail.isAvailable) {
          conflicts.push({
            type: 'AVAILABILITY',
            severity: 'WARNING',
            message: `Teacher is marked unavailable on ${dayOfWeek}${avail.reason ? ` (${avail.reason})` : ''}`,
          });
        }
      }
    }

    return {
      hasConflict: conflicts.some((c) => c.severity === 'BLOCK'),
      hasWarnings: conflicts.some((c) => c.severity === 'WARNING'),
      conflicts,
    };
  }

  async createEntry(payload) {
    const conflictResult = await this.validateEntryConflicts(payload.timetable_id, {
      teacherId: payload.teacher_id,
      sectionId: payload.section_id,
      roomId: payload.room_id,
      periodId: payload.period_id,
      dayOfWeek: payload.day_of_week,
    });

    if (conflictResult.hasConflict) {
      throw new TimetableConflictError('Cannot create entry due to scheduling conflicts', conflictResult.conflicts);
    }

    const created = await this.repository.createEntry(payload);
    return this.getEntryById(created.id);
  }

  async updateEntry(id, payload) {
    const existing = await this.repository.findEntryById(id);
    if (!existing) {
      throw new EntryNotFoundError();
    }

    const timetableId = existing.timetable_id;
    const teacherId = payload.teacher_id || existing.teacher_id;
    const sectionId = payload.section_id || existing.section_id;
    const roomId = payload.room_id !== undefined ? payload.room_id : existing.room_id;
    const periodId = payload.period_id || existing.period_id;
    const dayOfWeek = payload.day_of_week || existing.day_of_week;

    const conflictResult = await this.validateEntryConflicts(
      timetableId,
      { teacherId, sectionId, roomId, periodId, dayOfWeek },
      id
    );

    if (conflictResult.hasConflict) {
      throw new TimetableConflictError('Cannot update entry due to scheduling conflicts', conflictResult.conflicts);
    }

    await this.repository.updateEntry(id, payload);
    return this.getEntryById(id);
  }

  async deleteEntry(id) {
    const existing = await this.repository.findEntryById(id);
    if (!existing) {
      throw new EntryNotFoundError();
    }

    const deleted = await this.repository.deleteEntry(id);
    return deleted;
  }
}

module.exports = {
  TimetableService,
  TimetableNotFoundError,
  EntryNotFoundError,
  TimetableConflictError,
};
