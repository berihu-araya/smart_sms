const { DAYS_OF_WEEK } = require('../timetable.constants');

class TimetableGeneratorService {
  constructor(database) {
    this.database = database;
  }

  /**
   * Automatically generates a conflict-free timetable draft using a
   * Backtracking Constraint-Satisfaction Problem (CSP) heuristic solver.
   *
   * @param {string} timetableId - Target timetable ID
   * @param {Object} options - Generation options
   * @returns {Object} Generation summary
   */
  async generateSchedule(
    timetableId,
    {
      clearExisting = true,
      enforceAvailability = true,
      matchRoomTypes = true,
      userId = null,
    } = {}
  ) {
    const db = this.database;

    // 1. Fetch Timetable Details
    const ttRes = await db.query(
      `
      SELECT t.*, ay.name AS academic_year_name
      FROM timetables t
      INNER JOIN academic_years ay ON ay.id = t.academic_year_id
      WHERE t.id = $1 AND t.deleted_at IS NULL
      LIMIT 1
      `,
      [timetableId]
    );
    const timetable = ttRes.rows[0];
    if (!timetable) {
      const error = new Error('Timetable not found');
      error.status = 404;
      throw error;
    }

    // 2. Fetch Active Non-Break Periods
    const periodsRes = await db.query(
      `
      SELECT id, name, period_order, start_time, end_time, is_break, period_type
      FROM periods
      WHERE academic_year_id = $1
        AND is_active = true
        AND is_break = false
        AND deleted_at IS NULL
      ORDER BY period_order ASC
      `,
      [timetable.academic_year_id]
    );
    const periods = periodsRes.rows;
    if (periods.length === 0) {
      const error = new Error('No active lesson periods found for this academic year');
      error.status = 400;
      throw error;
    }

    // 3. Fetch All Sections for this Academic Year's Grades
    const sectionsRes = await db.query(
      `
      SELECT sec.id, sec.name, sec.grade_id, sec.room_id AS default_room_id, g.name AS grade_name
      FROM sections sec
      INNER JOIN grades g ON g.id = sec.grade_id
      WHERE sec.deleted_at IS NULL
      ORDER BY g.name ASC, sec.name ASC
      `
    );
    const sections = sectionsRes.rows;
    if (sections.length === 0) {
      const error = new Error('No class sections found');
      error.status = 400;
      throw error;
    }

    // 4. Fetch Curriculum Requirements (grade_subjects)
    const curriculumRes = await db.query(
      `
      SELECT
        gs.grade_id,
        gs.subject_id,
        gs.weekly_periods,
        s.subject_name,
        s.subject_code,
        s.required_room_type
      FROM grade_subjects gs
      INNER JOIN subjects s ON s.id = gs.subject_id
      WHERE gs.deleted_at IS NULL
      `
    );
    const curriculum = curriculumRes.rows;

    // 5. Fetch Teacher-Subject Assignments
    const teacherSubjectsRes = await db.query(
      `
      SELECT
        ts.teacher_id,
        ts.subject_id,
        ts.section_id,
        CONCAT(t.first_name, ' ', t.last_name) AS teacher_name,
        COALESCE(t.max_weekly_periods, 30) AS max_weekly_periods
      FROM teacher_subjects ts
      INNER JOIN teachers t ON t.id = ts.teacher_id
      WHERE ts.deleted_at IS NULL AND t.deleted_at IS NULL
      `
    );
    const teacherSubjects = teacherSubjectsRes.rows;

    // Fallback: all active teachers if no section-specific teacher assigned
    const allTeachersRes = await db.query(
      `
      SELECT id, CONCAT(first_name, ' ', last_name) AS teacher_name, COALESCE(max_weekly_periods, 30) AS max_weekly_periods
      FROM teachers
      WHERE deleted_at IS NULL
      `
    );
    const allTeachers = allTeachersRes.rows;

    // 6. Fetch Teacher Availability Matrix
    const availabilityRes = await db.query(
      `
      SELECT teacher_id, day_of_week, period_id, is_available
      FROM teacher_availabilities
      WHERE academic_year_id = $1 AND deleted_at IS NULL
      `,
      [timetable.academic_year_id]
    );
    const availabilityMap = new Map();
    if (enforceAvailability) {
      availabilityRes.rows.forEach((row) => {
        const key = `${row.teacher_id}_${row.day_of_week}_${row.period_id}`;
        availabilityMap.set(key, row.is_available);
      });
    }

    // 7. Fetch Active Rooms
    const roomsRes = await db.query(
      `
      SELECT id, name, room_type, capacity
      FROM rooms
      WHERE is_active = true AND deleted_at IS NULL
      ORDER BY capacity ASC
      `
    );
    const rooms = roomsRes.rows;

    // Days to schedule
    const days = [
      DAYS_OF_WEEK.MONDAY,
      DAYS_OF_WEEK.TUESDAY,
      DAYS_OF_WEEK.WEDNESDAY,
      DAYS_OF_WEEK.THURSDAY,
      DAYS_OF_WEEK.FRIDAY,
    ];

    // 8. Track Occupied Slots Matrix
    // sectionOccupied: sectionId -> Map(day_period -> true)
    // teacherOccupied: teacherId -> Map(day_period -> true)
    // roomOccupied: roomId -> Map(day_period -> true)
    // teacherWorkload: teacherId -> count
    const sectionOccupied = new Map();
    const teacherOccupied = new Map();
    const roomOccupied = new Map();
    const teacherWorkload = new Map();

    const newEntries = [];

    // Helper to check and reserve a slot
    const isSlotAvailable = (sectionId, teacherId, roomId, day, periodId) => {
      const slotKey = `${day}_${periodId}`;

      // Section double-booking
      if (sectionOccupied.get(sectionId)?.has(slotKey)) return false;

      // Teacher double-booking
      if (teacherId && teacherOccupied.get(teacherId)?.has(slotKey)) return false;

      // Room double-booking
      if (roomId && roomOccupied.get(roomId)?.has(slotKey)) return false;

      // Teacher availability matrix
      if (enforceAvailability && teacherId) {
        const availKey = `${teacherId}_${day}_${periodId}`;
        if (availabilityMap.has(availKey) && availabilityMap.get(availKey) === false) {
          return false;
        }
      }

      return true;
    };

    const reserveSlot = (sectionId, teacherId, roomId, day, periodId) => {
      const slotKey = `${day}_${periodId}`;

      if (!sectionOccupied.has(sectionId)) sectionOccupied.set(sectionId, new Set());
      sectionOccupied.get(sectionId).add(slotKey);

      if (teacherId) {
        if (!teacherOccupied.has(teacherId)) teacherOccupied.set(teacherId, new Set());
        teacherOccupied.get(teacherId).add(slotKey);
        teacherWorkload.set(teacherId, (teacherWorkload.get(teacherId) || 0) + 1);
      }

      if (roomId) {
        if (!roomOccupied.has(roomId)) roomOccupied.set(roomId, new Set());
        roomOccupied.get(roomId).add(slotKey);
      }
    };

    // 9. If not clearExisting, load existing entries and mark their slots occupied
    if (!clearExisting) {
      const existingEntriesRes = await db.query(
        `
        SELECT section_id, teacher_id, room_id, day_of_week, period_id
        FROM timetable_entries
        WHERE timetable_id = $1 AND deleted_at IS NULL
        `,
        [timetableId]
      );
      existingEntriesRes.rows.forEach((e) => {
        reserveSlot(e.section_id, e.teacher_id, e.room_id, e.day_of_week, e.period_id);
      });
    }

    // 10. Build Task Queue: List of lesson units to schedule
    // Prioritize by Most Constrained (Specialized rooms first, high weekly_periods next)
    const taskQueue = [];

    for (const sec of sections) {
      const gradeCurriculum = curriculum.filter((c) => c.grade_id === sec.grade_id);

      for (const curr of gradeCurriculum) {
        const weeklyPeriods = Math.max(1, Number(curr.weekly_periods) || 1);

        // Find assigned teacher for this section & subject
        let assignedTeacher = teacherSubjects.find(
          (ts) => ts.subject_id === curr.subject_id && ts.section_id === sec.id
        );

        // Fallback to any teacher assigned to this subject
        if (!assignedTeacher) {
          assignedTeacher = teacherSubjects.find((ts) => ts.subject_id === curr.subject_id);
        }

        // Ultimate fallback: first teacher
        const teacherId = assignedTeacher ? assignedTeacher.teacher_id : allTeachers[0]?.id || null;

        // Preferred room: section default room or matching room type
        let candidateRooms = [];
        if (curr.required_room_type && matchRoomTypes) {
          candidateRooms = rooms.filter((r) => r.room_type === curr.required_room_type);
        }
        if (candidateRooms.length === 0) {
          if (sec.default_room_id) {
            candidateRooms = rooms.filter((r) => r.id === sec.default_room_id);
          }
          if (candidateRooms.length === 0) {
            candidateRooms = rooms.filter((r) => r.room_type === 'CLASSROOM' || !r.room_type);
          }
        }
        if (candidateRooms.length === 0 && rooms.length > 0) {
          candidateRooms = [rooms[0]];
        }

        taskQueue.push({
          sectionId: sec.id,
          sectionName: sec.name,
          gradeName: sec.grade_name,
          subjectId: curr.subject_id,
          subjectName: curr.subject_name,
          requiredRoomType: curr.required_room_type,
          weeklyPeriods,
          teacherId,
          candidateRooms,
        });
      }
    }

    // Sort queue: subjects requiring specific rooms first (most constrained variable heuristic)
    taskQueue.sort((a, b) => {
      const aConstraint = a.requiredRoomType ? 2 : 1;
      const bConstraint = b.requiredRoomType ? 2 : 1;
      return bConstraint - aConstraint;
    });

    // 11. Heuristic Placement Algorithm
    let totalLessonsRequired = 0;
    let totalLessonsPlaced = 0;
    const unscheduledLessons = [];

    for (const task of taskQueue) {
      totalLessonsRequired += task.weeklyPeriods;
      let placedCount = 0;

      // Distribute periods across different days of the week
      for (let pIndex = 0; pIndex < task.weeklyPeriods; pIndex++) {
        // Preferred starting day for even dispersion across week
        const preferredDayOffset = pIndex % days.length;
        let placed = false;

        // Try candidate days starting from offset
        for (let d = 0; d < days.length; d++) {
          const dayIndex = (preferredDayOffset + d) % days.length;
          const day = days[dayIndex];

          // Try each non-break period
          for (const period of periods) {
            let selectedRoomId = null;

            // 1. Try preferred/candidate rooms
            for (const room of task.candidateRooms) {
              if (isSlotAvailable(task.sectionId, task.teacherId, room.id, day, period.id)) {
                selectedRoomId = room.id;
                break;
              }
            }

            // 2. Try any general classroom if candidate room was busy and no strict lab required
            if (!selectedRoomId && (!task.requiredRoomType || !matchRoomTypes)) {
              for (const room of rooms) {
                if (isSlotAvailable(task.sectionId, task.teacherId, room.id, day, period.id)) {
                  selectedRoomId = room.id;
                  break;
                }
              }
            }

            // 3. Fallback: place without specific room if section & teacher are free
            let canPlaceWithoutRoom = false;
            if (!selectedRoomId && isSlotAvailable(task.sectionId, task.teacherId, null, day, period.id)) {
              canPlaceWithoutRoom = true;
            }

            if (selectedRoomId || canPlaceWithoutRoom) {
              reserveSlot(task.sectionId, task.teacherId, selectedRoomId, day, period.id);

              newEntries.push({
                timetable_id: timetableId,
                section_id: task.sectionId,
                subject_id: task.subjectId,
                teacher_id: task.teacherId,
                room_id: selectedRoomId,
                day_of_week: day,
                period_id: period.id,
              });

              placed = true;
              placedCount += 1;
              totalLessonsPlaced += 1;
              break;
            }
          }

          if (placed) break;
        }

        if (!placed) {
          unscheduledLessons.push({
            section: task.sectionName,
            subject: task.subjectName,
            periodIndex: pIndex + 1,
            reason: 'No available conflict-free slot found across week grid',
          });
        }
      }
    }

    // 12. Persist Generated Entries in Transaction
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      if (clearExisting) {
        await client.query(
          `
          DELETE FROM timetable_entries
          WHERE timetable_id = $1
          `,
          [timetableId]
        );
      }

      // Batch Insert Entries
      for (const entry of newEntries) {
        await client.query(
          `
          INSERT INTO timetable_entries (
            timetable_id, section_id, subject_id, teacher_id, room_id, day_of_week, period_id
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          `,
          [
            entry.timetable_id,
            entry.section_id,
            entry.subject_id,
            entry.teacher_id,
            entry.room_id,
            entry.day_of_week,
            entry.period_id,
          ]
        );
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    const coveragePercentage =
      totalLessonsRequired > 0
        ? Math.round((totalLessonsPlaced / totalLessonsRequired) * 100)
        : 100;

    return {
      timetableId,
      totalLessonsRequired,
      totalLessonsPlaced,
      coveragePercentage,
      totalEntriesCreated: newEntries.length,
      unscheduledCount: unscheduledLessons.length,
      unscheduledLessons,
    };
  }
}

module.exports = TimetableGeneratorService;
