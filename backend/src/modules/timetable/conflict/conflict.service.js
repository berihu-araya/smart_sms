const { CONFLICT_TYPES, CONFLICT_SEVERITY } = require('../timetable.constants');

class ConflictService {
  constructor(repository) {
    this.repository = repository;
  }

  /**
   * Run full validation and conflict detection for a timetable.
   *
   * @param {string} timetableId
   * @returns {Promise<Object>} Diagnostic conflict report
   */
  async validateTimetable(timetableId) {
    const data = await this.repository.getTimetableValidationData(timetableId);
    if (!data || !data.timetable) {
      const error = new Error('Timetable not found');
      error.status = 404;
      throw error;
    }

    return this.detectConflictsFromData(data);
  }

  /**
   * Pure conflict detection engine.
   * Evaluates dataset and generates structured conflict diagnostics.
   *
   * @param {Object} validationData
   * @returns {Object} Structured conflict report
   */
  detectConflictsFromData({ timetable, entries = [], teacherSubjects = [], availabilities = [], gradeSubjects = [], sections = [] }) {
    const conflicts = [];

    // Lookup maps
    const teacherSlotMap = new Map(); // key: teacher_id:day:period -> [entries]
    const sectionSlotMap = new Map(); // key: section_id:day:period -> [entries]
    const roomSlotMap = new Map();    // key: room_id:day:period -> [entries]
    const teacherSubjectSet = new Set(
      teacherSubjects.map((ts) => `${ts.teacher_id}:${ts.subject_id}:${ts.section_id}`)
    );
    const teacherAnySectionSubjectSet = new Set(
      teacherSubjects.map((ts) => `${ts.teacher_id}:${ts.subject_id}`)
    );
    const availabilityMap = new Map(); // key: teacher_id:day:period -> { is_available, reason }
    availabilities.forEach((a) => {
      availabilityMap.set(`${a.teacher_id}:${a.day_of_week}:${a.period_id}`, {
        is_available: a.is_available,
        reason: a.reason,
      });
    });

    // Subject requirement counters: key: section_id:subject_id -> count
    const sectionSubjectCountMap = new Map();
    // Teacher workload counters: key: teacher_id -> { teacher_name, count, max_periods }
    const teacherWorkloadMap = new Map();

    // 1. Traverse all entries and build maps
    for (const entry of entries) {
      const teacherSlotKey = `${entry.teacher_id}:${entry.day_of_week}:${entry.period_id}`;
      const sectionSlotKey = `${entry.section_id}:${entry.day_of_week}:${entry.period_id}`;
      const roomSlotKey = entry.room_id ? `${entry.room_id}:${entry.day_of_week}:${entry.period_id}` : null;

      // Grouping
      if (!teacherSlotMap.has(teacherSlotKey)) teacherSlotMap.set(teacherSlotKey, []);
      teacherSlotMap.get(teacherSlotKey).push(entry);

      if (!sectionSlotMap.has(sectionSlotKey)) sectionSlotMap.set(sectionSlotKey, []);
      sectionSlotMap.get(sectionSlotKey).push(entry);

      if (roomSlotKey) {
        if (!roomSlotMap.has(roomSlotKey)) roomSlotMap.set(roomSlotKey, []);
        roomSlotMap.get(roomSlotKey).push(entry);
      }

      // Check: Break period scheduling (BLOCK)
      if (entry.is_break) {
        conflicts.push({
          type: CONFLICT_TYPES.BREAK,
          severity: CONFLICT_SEVERITY.BLOCK,
          entryId: entry.entry_id,
          message: `Lesson for Section "${entry.section_name}" (${entry.subject_name}) is scheduled during Break Period "${entry.period_name}" on ${entry.day_of_week}.`,
          details: {
            section: entry.section_name,
            subject: entry.subject_name,
            period: entry.period_name,
            dayOfWeek: entry.day_of_week,
          },
        });
      }

      // Check: Teacher Availability (WARNING)
      const avail = availabilityMap.get(teacherSlotKey);
      if (avail && !avail.is_available) {
        conflicts.push({
          type: CONFLICT_TYPES.AVAILABILITY,
          severity: CONFLICT_SEVERITY.WARNING,
          entryId: entry.entry_id,
          message: `${entry.teacher_name} is marked unavailable on ${entry.day_of_week} during ${entry.period_name}${avail.reason ? ` (${avail.reason})` : ''}.`,
          details: {
            teacher: entry.teacher_name,
            dayOfWeek: entry.day_of_week,
            period: entry.period_name,
            reason: avail.reason,
          },
        });
      }

      // Check: Subject Authorization (WARNING)
      // Check if teacher is assigned to this specific section or at least authorized for the subject
      const hasSpecificAssignment = teacherSubjectSet.has(`${entry.teacher_id}:${entry.subject_id}:${entry.section_id}`);
      const hasGeneralAssignment = teacherAnySectionSubjectSet.has(`${entry.teacher_id}:${entry.subject_id}`);

      if (!hasSpecificAssignment && !hasGeneralAssignment && teacherSubjects.length > 0) {
        conflicts.push({
          type: CONFLICT_TYPES.SUBJECT_ASSIGNMENT,
          severity: CONFLICT_SEVERITY.WARNING,
          entryId: entry.entry_id,
          message: `${entry.teacher_name} is not officially assigned to teach ${entry.subject_name} to Section "${entry.section_name}".`,
          details: {
            teacher: entry.teacher_name,
            subject: entry.subject_name,
            section: entry.section_name,
          },
        });
      }

      // Check: Room Capacity (WARNING)
      if (entry.room_id && entry.room_capacity && entry.section_capacity) {
        if (entry.section_capacity > entry.room_capacity) {
          conflicts.push({
            type: CONFLICT_TYPES.CAPACITY,
            severity: CONFLICT_SEVERITY.WARNING,
            entryId: entry.entry_id,
            message: `Section "${entry.section_name}" capacity (${entry.section_capacity} students) exceeds Room "${entry.room_name}" capacity (${entry.room_capacity} seats).`,
            details: {
              section: entry.section_name,
              sectionCapacity: entry.section_capacity,
              room: entry.room_name,
              roomCapacity: entry.room_capacity,
            },
          });
        }
      }

      // Check: Room Type Compatibility (WARNING)
      if (entry.room_id && entry.required_room_type && entry.required_room_type !== 'NORMAL') {
        if (entry.room_type !== entry.required_room_type) {
          conflicts.push({
            type: CONFLICT_TYPES.ROOM_TYPE,
            severity: CONFLICT_SEVERITY.WARNING,
            entryId: entry.entry_id,
            message: `Subject ${entry.subject_name} requires a ${entry.required_room_type} room, but is scheduled in Room "${entry.room_name}" (${entry.room_type}).`,
            details: {
              subject: entry.subject_name,
              requiredRoomType: entry.required_room_type,
              assignedRoom: entry.room_name,
              assignedRoomType: entry.room_type,
            },
          });
        }
      }

      // Increment Section-Subject counter
      const ssKey = `${entry.section_id}:${entry.subject_id}`;
      sectionSubjectCountMap.set(ssKey, (sectionSubjectCountMap.get(ssKey) || 0) + 1);

      // Increment Teacher Workload counter
      if (!teacherWorkloadMap.has(entry.teacher_id)) {
        teacherWorkloadMap.set(entry.teacher_id, {
          teacherId: entry.teacher_id,
          teacherName: entry.teacher_name,
          employeeNumber: entry.teacher_employee_number,
          maxWeeklyPeriods: entry.teacher_max_periods || 30,
          scheduledPeriods: 0,
        });
      }
      teacherWorkloadMap.get(entry.teacher_id).scheduledPeriods += 1;
    }

    // 2. Check Teacher Double-Booking (BLOCK)
    for (const [key, group] of teacherSlotMap.entries()) {
      if (group.length > 1) {
        const first = group[0];
        const sectionsList = group.map((g) => `"${g.section_name}" (${g.subject_name})`).join(' and ');
        conflicts.push({
          type: CONFLICT_TYPES.TEACHER,
          severity: CONFLICT_SEVERITY.BLOCK,
          message: `${first.teacher_name} is double-booked during ${first.period_name} on ${first.day_of_week} across sections ${sectionsList}.`,
          details: {
            teacher: first.teacher_name,
            dayOfWeek: first.day_of_week,
            period: first.period_name,
            conflictingEntries: group.map((g) => g.entry_id),
          },
        });
      }
    }

    // 3. Check Section Double-Booking (BLOCK)
    for (const [key, group] of sectionSlotMap.entries()) {
      if (group.length > 1) {
        const first = group[0];
        const subjectsList = group.map((g) => `${g.subject_name} (with ${g.teacher_name})`).join(' and ');
        conflicts.push({
          type: CONFLICT_TYPES.SECTION,
          severity: CONFLICT_SEVERITY.BLOCK,
          message: `Section "${first.section_name}" has multiple lessons scheduled during ${first.period_name} on ${first.day_of_week}: ${subjectsList}.`,
          details: {
            section: first.section_name,
            dayOfWeek: first.day_of_week,
            period: first.period_name,
            conflictingEntries: group.map((g) => g.entry_id),
          },
        });
      }
    }

    // 4. Check Room Double-Booking (BLOCK)
    for (const [key, group] of roomSlotMap.entries()) {
      if (group.length > 1) {
        const first = group[0];
        const occupants = group.map((g) => `Section "${g.section_name}" (${g.subject_name})`).join(' and ');
        conflicts.push({
          type: CONFLICT_TYPES.ROOM,
          severity: CONFLICT_SEVERITY.BLOCK,
          message: `Room "${first.room_name}" is double-booked during ${first.period_name} on ${first.day_of_week} by ${occupants}.`,
          details: {
            room: first.room_name,
            dayOfWeek: first.day_of_week,
            period: first.period_name,
            conflictingEntries: group.map((g) => g.entry_id),
          },
        });
      }
    }

    // 5. Check Teacher Workload Over-Allocations (WARNING)
    const teacherWorkloads = [];
    for (const workload of teacherWorkloadMap.values()) {
      const isOverAllocated = workload.scheduledPeriods > workload.maxWeeklyPeriods;
      if (isOverAllocated) {
        conflicts.push({
          type: CONFLICT_TYPES.WORKLOAD,
          severity: CONFLICT_SEVERITY.WARNING,
          message: `${workload.teacherName} has exceeded maximum weekly workload: ${workload.scheduledPeriods} / ${workload.maxWeeklyPeriods} periods.`,
          details: {
            teacher: workload.teacherName,
            scheduled: workload.scheduledPeriods,
            maximum: workload.maxWeeklyPeriods,
          },
        });
      }
      teacherWorkloads.push({
        ...workload,
        isOverAllocated,
      });
    }

    // 6. Check Weekly Subject Coverage Requirements
    // Find all distinct sections in this timetable
    const sectionIdsInTimetable = new Set(entries.map((e) => e.section_id));
    const relevantSections = sections.filter((s) => sectionIdsInTimetable.has(s.section_id));

    const subjectCoverage = [];
    for (const sec of relevantSections) {
      const requiredSubjectsForGrade = gradeSubjects.filter((gs) => gs.grade_id === sec.grade_id);

      for (const req of requiredSubjectsForGrade) {
        const ssKey = `${sec.section_id}:${req.subject_id}`;
        const scheduled = sectionSubjectCountMap.get(ssKey) || 0;
        const required = Number(req.required_weekly_periods) || 0;
        const difference = scheduled - required;

        let coverageStatus = 'MET';
        if (required > 0 && scheduled === 0) {
          coverageStatus = 'UNSCHEDULED';
        } else if (scheduled < required) {
          coverageStatus = 'UNDER_ALLOCATED';
        } else if (scheduled > required && required > 0) {
          coverageStatus = 'OVER_ALLOCATED';
        }

        if (coverageStatus === 'UNSCHEDULED' || coverageStatus === 'UNDER_ALLOCATED') {
          conflicts.push({
            type: CONFLICT_TYPES.REQUIREMENTS,
            severity: CONFLICT_SEVERITY.WARNING,
            message: `Section "${sec.section_name}" is missing ${Math.abs(difference)} period(s) for ${req.subject_name} (Required: ${required}, Scheduled: ${scheduled}).`,
            details: {
              section: sec.section_name,
              subject: req.subject_name,
              required,
              scheduled,
              missing: Math.abs(difference),
            },
          });
        }

        subjectCoverage.push({
          sectionId: sec.section_id,
          sectionName: sec.section_name,
          gradeName: sec.grade_name,
          subjectId: req.subject_id,
          subjectName: req.subject_name,
          subjectCode: req.subject_code,
          isCompulsory: req.is_compulsory,
          requiredPeriods: required,
          scheduledPeriods: scheduled,
          difference,
          status: coverageStatus,
        });
      }
    }

    // Summary counts
    const blockCount = conflicts.filter((c) => c.severity === CONFLICT_SEVERITY.BLOCK).length;
    const warningCount = conflicts.filter((c) => c.severity === CONFLICT_SEVERITY.WARNING).length;
    const isPublishable = blockCount === 0;

    return {
      timetableId: timetable.id,
      timetableName: timetable.name,
      academicYearName: timetable.academic_year_name,
      term: timetable.term,
      status: timetable.status,
      version: timetable.version,
      hasConflict: blockCount > 0,
      hasWarnings: warningCount > 0,
      isPublishable,
      summary: {
        totalEntries: entries.length,
        totalErrors: blockCount,
        totalWarnings: warningCount,
        totalTeachersScheduled: teacherWorkloadMap.size,
        totalSectionsScheduled: sectionIdsInTimetable.size,
      },
      conflicts,
      subjectCoverage,
      teacherWorkloads: teacherWorkloads.sort((a, b) => b.scheduledPeriods - a.scheduledPeriods),
    };
  }
}

module.exports = ConflictService;
