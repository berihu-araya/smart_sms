class ConflictRepository {
  constructor(database) {
    this.database = database;
  }

  async getTimetableValidationData(timetableId) {
    // 1. Get Timetable header
    const timetableRes = await this.database.query(
      `
      SELECT
        t.id,
        t.academic_year_id,
        ay.name AS academic_year_name,
        t.term,
        t.name,
        t.status,
        t.version,
        t.is_active
      FROM timetables t
      INNER JOIN academic_years ay ON ay.id = t.academic_year_id
      WHERE t.id = $1 AND t.deleted_at IS NULL
      LIMIT 1
      `,
      [timetableId]
    );
    const timetable = timetableRes.rows[0] || null;
    if (!timetable) return null;

    const academicYearId = timetable.academic_year_id;

    // 2. Get all timetable entries with rich details
    const entriesRes = await this.database.query(
      `
      SELECT
        te.id AS entry_id,
        te.timetable_id,
        te.section_id,
        sec.name AS section_name,
        sec.capacity AS section_capacity,
        sec.grade_id,
        g.name AS grade_name,
        te.subject_id,
        s.subject_name,
        s.subject_code,
        s.short_name AS subject_short_name,
        s.is_lab AS subject_is_lab,
        s.required_room_type,
        te.teacher_id,
        CONCAT(t.first_name, ' ', t.last_name) AS teacher_name,
        t.employee_number AS teacher_employee_number,
        t.max_weekly_periods AS teacher_max_periods,
        te.room_id,
        r.name AS room_name,
        r.room_type,
        r.capacity AS room_capacity,
        te.period_id,
        p.name AS period_name,
        TO_CHAR(p.start_time, 'HH24:MI') AS start_time,
        TO_CHAR(p.end_time, 'HH24:MI') AS end_time,
        p.period_order,
        p.is_break,
        te.day_of_week
      FROM timetable_entries te
      INNER JOIN sections sec ON sec.id = te.section_id AND sec.deleted_at IS NULL
      LEFT JOIN grades g ON g.id = sec.grade_id AND g.deleted_at IS NULL
      INNER JOIN subjects s ON s.id = te.subject_id AND s.deleted_at IS NULL
      INNER JOIN teachers t ON t.id = te.teacher_id AND t.deleted_at IS NULL
      LEFT JOIN rooms r ON r.id = te.room_id AND r.deleted_at IS NULL
      INNER JOIN periods p ON p.id = te.period_id AND p.deleted_at IS NULL
      WHERE te.timetable_id = $1 AND te.deleted_at IS NULL
      ORDER BY
        CASE te.day_of_week
          WHEN 'MONDAY' THEN 1
          WHEN 'TUESDAY' THEN 2
          WHEN 'WEDNESDAY' THEN 3
          WHEN 'THURSDAY' THEN 4
          WHEN 'FRIDAY' THEN 5
          WHEN 'SATURDAY' THEN 6
          WHEN 'SUNDAY' THEN 7
        END,
        p.period_order ASC
      `,
      [timetableId]
    );

    // 3. Get all teacher subject assignments for this academic year
    const teacherSubjectsRes = await this.database.query(
      `
      SELECT
        ts.teacher_id,
        ts.subject_id,
        ts.grade_id,
        ts.section_id
      FROM teacher_subjects ts
      WHERE ts.academic_year_id = $1
        AND ts.status = 'ACTIVE'
        AND ts.deleted_at IS NULL
      `,
      [academicYearId]
    );

    // 4. Get all teacher availability restrictions for this academic year
    const availabilitiesRes = await this.database.query(
      `
      SELECT
        ta.teacher_id,
        ta.day_of_week,
        ta.period_id,
        ta.is_available,
        ta.reason
      FROM teacher_availabilities ta
      WHERE ta.academic_year_id = $1
        AND ta.deleted_at IS NULL
      `,
      [academicYearId]
    );

    // 5. Get all required grade subjects for sections involved in this timetable
    const gradeSubjectsRes = await this.database.query(
      `
      SELECT
        gs.grade_id,
        g.name AS grade_name,
        gs.subject_id,
        s.subject_name,
        s.subject_code,
        gs.is_compulsory,
        COALESCE(gs.weekly_periods, 0) AS required_weekly_periods
      FROM grade_subjects gs
      INNER JOIN grades g ON g.id = gs.grade_id
      INNER JOIN subjects s ON s.id = gs.subject_id
      WHERE gs.academic_year_id = $1
        AND gs.status = 'ACTIVE'
        AND gs.deleted_at IS NULL
      `,
      [academicYearId]
    );

    // 6. Get all distinct sections present in the timetable or in the grades
    const sectionsRes = await this.database.query(
      `
      SELECT
        sec.id AS section_id,
        sec.name AS section_name,
        sec.capacity AS section_capacity,
        sec.grade_id,
        g.name AS grade_name
      FROM sections sec
      LEFT JOIN grades g ON g.id = sec.grade_id
      WHERE sec.deleted_at IS NULL
      ORDER BY g.name ASC, sec.name ASC
      `
    );

    return {
      timetable,
      entries: entriesRes.rows,
      teacherSubjects: teacherSubjectsRes.rows,
      availabilities: availabilitiesRes.rows,
      gradeSubjects: gradeSubjectsRes.rows,
      sections: sectionsRes.rows,
    };
  }
}

module.exports = ConflictRepository;
