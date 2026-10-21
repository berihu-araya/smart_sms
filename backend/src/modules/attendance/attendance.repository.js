class AttendanceRepository {
  constructor(database) {
    this.database = database;
  }

  async findSectionRosterWithAttendance(sectionId, date) {
    const result = await this.database.query(
      `
      SELECT
        s.id AS student_id,
        s.admission_number,
        s.first_name,
        s.last_name,
        s.gender,
        COALESCE(a.status, 'PRESENT') AS current_status,
        a.id AS attendance_id,
        a.remark,
        a.recorded_by,
        a.updated_at AS marked_at
      FROM students s
      LEFT JOIN attendance a
        ON a.student_id = s.id
        AND a.date = $2
        AND a.deleted_at IS NULL
      WHERE s.section_id = $1
        AND s.deleted_at IS NULL
        AND s.status = 'ACTIVE'
      ORDER BY s.first_name ASC, s.last_name ASC
      `,
      [sectionId, date]
    );

    return result.rows;
  }

  /**
   * Senior Multi-Row Parameterized UPSERT
   * Executes in a single database round-trip (O(1) latency) instead of looping N times.
   */
  async bulkUpsertAttendance({ sectionId, date, academicYearId, recordedBy, records }) {
    if (!records || records.length === 0) return [];

    const valueTuples = [];
    const params = [];
    let paramIndex = 1;

    for (const rec of records) {
      valueTuples.push(
        `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
      );
      params.push(
        rec.studentId,
        sectionId,
        academicYearId || null,
        date,
        rec.status,
        rec.remark || null,
        recordedBy || null
      );
      paramIndex += 7;
    }

    const query = `
      INSERT INTO attendance (
        student_id,
        section_id,
        academic_year_id,
        date,
        status,
        remark,
        recorded_by,
        created_at,
        updated_at
      )
      VALUES ${valueTuples.join(', ')}
      ON CONFLICT (student_id, date)
      DO UPDATE SET
        status = EXCLUDED.status,
        remark = EXCLUDED.remark,
        section_id = EXCLUDED.section_id,
        academic_year_id = COALESCE(EXCLUDED.academic_year_id, attendance.academic_year_id),
        recorded_by = EXCLUDED.recorded_by,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const result = await this.database.query(query, params);
    return result.rows;
  }

  async getAttendanceSummary({ date, sectionId = null }) {
    const params = [date];
    let sectionClause = '';

    if (sectionId) {
      params.push(sectionId);
      sectionClause = `AND section_id = $2`;
    }

    const result = await this.database.query(
      `
      SELECT
        COUNT(*) as total_marked,
        COUNT(*) FILTER (WHERE status = 'PRESENT') as present_count,
        COUNT(*) FILTER (WHERE status = 'ABSENT') as absent_count,
        COUNT(*) FILTER (WHERE status = 'LATE') as late_count,
        COUNT(*) FILTER (WHERE status = 'EXCUSED') as excused_count
      FROM attendance
      WHERE date = $1
        AND deleted_at IS NULL
        ${sectionClause}
      `,
      params
    );

    return result.rows[0] || {
      total_marked: 0,
      present_count: 0,
      absent_count: 0,
      late_count: 0,
      excused_count: 0,
    };
  }

  /**
   * Monthly Attendance Grid / Heatmap Query
   * Fetches the entire month's attendance matrix for a section.
   */
  async findSectionMonthlyMatrix(sectionId, year, month) {
    const paddedMonth = String(month).padStart(2, '0');
    const startDate = `${year}-${paddedMonth}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${paddedMonth}-${String(lastDay).padStart(2, '0')}`;

    const studentsResult = await this.database.query(
      `
      SELECT
        s.id AS student_id,
        s.admission_number,
        s.first_name,
        s.last_name,
        s.gender,
        sec.name AS section_name,
        g.name AS grade_name
      FROM students s
      JOIN sections sec ON sec.id = s.section_id
      LEFT JOIN grades g ON g.id = sec.grade_id
      WHERE s.section_id = $1
        AND s.deleted_at IS NULL
        AND s.status = 'ACTIVE'
      ORDER BY s.first_name ASC, s.last_name ASC
      `,
      [sectionId]
    );

    const attendanceResult = await this.database.query(
      `
      SELECT
        a.student_id,
        TO_CHAR(a.date, 'YYYY-MM-DD') as date_str,
        EXTRACT(DAY FROM a.date)::int as day_number,
        a.status,
        a.remark
      FROM attendance a
      WHERE a.section_id = $1
        AND a.date >= $2
        AND a.date <= $3
        AND a.deleted_at IS NULL
      ORDER BY a.date ASC
      `,
      [sectionId, startDate, endDate]
    );

    return {
      year,
      month,
      daysInMonth: lastDay,
      startDate,
      endDate,
      students: studentsResult.rows,
      attendanceRecords: attendanceResult.rows,
    };
  }

  async getStudentAttendanceHistory(studentId, { academicYearId = null, limit = 30, offset = 0 } = {}) {
    let yearFilter = '';
    const params = [studentId];
    let idx = 2;

    if (academicYearId && academicYearId !== 'all') {
      yearFilter = ` AND (a.academic_year_id = $${idx} OR (
        a.academic_year_id IS NULL AND a.date >= (SELECT start_date FROM academic_years WHERE id = $${idx})
        AND a.date <= (SELECT end_date FROM academic_years WHERE id = $${idx})
      ))`;
      params.push(academicYearId);
      idx++;
    } else if (academicYearId !== 'all') {
      yearFilter = ` AND (
        a.academic_year_id IN (SELECT id FROM academic_years WHERE is_active = true)
        OR (
          a.academic_year_id IS NULL AND EXISTS (
            SELECT 1 FROM academic_years ay
            WHERE ay.is_active = true AND a.date >= ay.start_date AND a.date <= ay.end_date
          )
        )
      )`;
    }

    const result = await this.database.query(
      `
      SELECT
        a.id,
        a.date,
        a.status,
        a.remark,
        a.created_at,
        u.first_name AS marked_by_first_name,
        u.last_name AS marked_by_last_name
      FROM attendance a
      LEFT JOIN users u ON u.id = a.recorded_by
      WHERE a.student_id = $1
        AND a.deleted_at IS NULL
        ${yearFilter}
      ORDER BY a.date DESC
      LIMIT $${idx} OFFSET $${idx + 1}
      `,
      [...params, limit, offset]
    );

    const statsResult = await this.database.query(
      `
      SELECT
        COUNT(*) as total_days,
        COUNT(*) FILTER (WHERE a.status = 'PRESENT') as present_days,
        COUNT(*) FILTER (WHERE a.status = 'ABSENT') as absent_days,
        COUNT(*) FILTER (WHERE a.status = 'LATE') as late_days,
        COUNT(*) FILTER (WHERE a.status = 'EXCUSED') as excused_days
      FROM attendance a
      WHERE a.student_id = $1
        AND a.deleted_at IS NULL
        ${yearFilter}
      `,
      params
    );

    return {
      history: result.rows,
      stats: statsResult.rows[0] || {},
    };
  }

  /**
   * Enterprise Attendance Reports Query Engine
   * Pulls scoped students, period attendance matrix records, and sections compliance in single batch.
   */
  async getAttendanceReportsRawData({
    schoolId = null,
    academicYearId = null,
    gradeId = null,
    sectionId = null,
    startDate,
    endDate,
    accessibleSectionIds = null,
    targetStudentId = null,
  }) {
    // 1. Fetch Students in Scope
    const studentParams = [];
    let sIdx = 1;
    const studentWhere = [
      's.deleted_at IS NULL',
      "s.status = 'ACTIVE'",
      'sec.deleted_at IS NULL',
      'g.deleted_at IS NULL',
    ];

    if (schoolId) {
      studentWhere.push(`(s.school_id = $${sIdx} OR sec.school_id = $${sIdx})`);
      studentParams.push(schoolId);
      sIdx++;
    }

    if (targetStudentId) {
      studentWhere.push(`s.id = $${sIdx}`);
      studentParams.push(targetStudentId);
      sIdx++;
    }

    if (sectionId) {
      studentWhere.push(`s.section_id = $${sIdx}`);
      studentParams.push(sectionId);
      sIdx++;
    } else if (gradeId) {
      studentWhere.push(`sec.grade_id = $${sIdx}`);
      studentParams.push(gradeId);
      sIdx++;
    }

    if (accessibleSectionIds && accessibleSectionIds.length > 0) {
      studentWhere.push(`s.section_id = ANY($${sIdx})`);
      studentParams.push(accessibleSectionIds);
      sIdx++;
    }

    const studentsQuery = `
      SELECT
        s.id AS student_id,
        s.admission_number,
        s.first_name,
        s.last_name,
        s.gender,
        s.section_id,
        sec.name AS section_name,
        g.id AS grade_id,
        g.name AS grade_name,
        p.full_name AS parent_name,
        p.phone AS parent_phone
      FROM students s
      JOIN sections sec ON sec.id = s.section_id
      JOIN grades g ON g.id = sec.grade_id
      LEFT JOIN parents p ON p.id = s.parent_id AND p.deleted_at IS NULL
      WHERE ${studentWhere.join(' AND ')}
      ORDER BY g.name ASC, sec.name ASC, s.first_name ASC, s.last_name ASC
    `;
    const studentsRes = await this.database.query(studentsQuery, studentParams);

    // 2. Fetch Attendance Records for the Date Range
    const attParams = [startDate, endDate];
    let aIdx = 3;
    const attWhere = [
      'a.deleted_at IS NULL',
      's.deleted_at IS NULL',
      'a.date >= $1',
      'a.date <= $2',
    ];

    if (schoolId) {
      attWhere.push(`(s.school_id = $${aIdx} OR sec.school_id = $${aIdx})`);
      attParams.push(schoolId);
      aIdx++;
    }

    if (academicYearId) {
      attWhere.push(`(a.academic_year_id = $${aIdx} OR a.academic_year_id IS NULL)`);
      attParams.push(academicYearId);
      aIdx++;
    }

    if (targetStudentId) {
      attWhere.push(`a.student_id = $${aIdx}`);
      attParams.push(targetStudentId);
      aIdx++;
    }

    if (sectionId) {
      attWhere.push(`a.section_id = $${aIdx}`);
      attParams.push(sectionId);
      aIdx++;
    } else if (gradeId) {
      attWhere.push(`sec.grade_id = $${aIdx}`);
      attParams.push(gradeId);
      aIdx++;
    }

    if (accessibleSectionIds && accessibleSectionIds.length > 0) {
      attWhere.push(`a.section_id = ANY($${aIdx})`);
      attParams.push(accessibleSectionIds);
      aIdx++;
    }

    const attendanceQuery = `
      SELECT
        a.id,
        a.student_id,
        a.section_id,
        TO_CHAR(a.date, 'YYYY-MM-DD') AS date_str,
        a.date,
        EXTRACT(ISODOW FROM a.date)::int AS dow,
        a.status,
        a.remark,
        u.first_name AS marked_by_first_name,
        u.last_name AS marked_by_last_name
      FROM attendance a
      JOIN students s ON s.id = a.student_id
      JOIN sections sec ON sec.id = a.section_id
      LEFT JOIN users u ON u.id = a.recorded_by
      WHERE ${attWhere.join(' AND ')}
      ORDER BY a.date ASC
    `;
    const attendanceRes = await this.database.query(attendanceQuery, attParams);

    // 3. Fetch Sections with Today's Roll-Call Submission Status
    const secParams = [];
    let secIdx = 1;
    const secWhere = [
      'sec.deleted_at IS NULL',
      'g.deleted_at IS NULL',
    ];

    if (schoolId) {
      secWhere.push(`(sec.school_id = $${secIdx} OR g.school_id = $${secIdx})`);
      secParams.push(schoolId);
      secIdx++;
    }

    if (gradeId) {
      secWhere.push(`sec.grade_id = $${secIdx}`);
      secParams.push(gradeId);
      secIdx++;
    }

    if (sectionId) {
      secWhere.push(`sec.id = $${secIdx}`);
      secParams.push(sectionId);
      secIdx++;
    }

    if (accessibleSectionIds && accessibleSectionIds.length > 0) {
      secWhere.push(`sec.id = ANY($${secIdx})`);
      secParams.push(accessibleSectionIds);
      secIdx++;
    }

    const sectionsQuery = `
      SELECT
        sec.id AS section_id,
        sec.name AS section_name,
        g.id AS grade_id,
        g.name AS grade_name,
        COUNT(DISTINCT s.id) AS total_students,
        COUNT(DISTINCT CASE WHEN a.date = CURRENT_DATE THEN a.student_id END) AS today_marked_count,
        MAX(CASE WHEN a.date = CURRENT_DATE THEN a.updated_at END) AS today_last_marked_at,
        CONCAT(u.first_name, ' ', u.last_name) AS class_teacher_name
      FROM sections sec
      JOIN grades g ON g.id = sec.grade_id
      LEFT JOIN students s ON s.section_id = sec.id AND s.deleted_at IS NULL AND s.status = 'ACTIVE'
      LEFT JOIN attendance a ON a.section_id = sec.id AND a.date = CURRENT_DATE AND a.deleted_at IS NULL
      LEFT JOIN class_teachers ct ON ct.section_id = sec.id AND ct.status = 'ACTIVE' AND ct.deleted_at IS NULL
      LEFT JOIN teachers t ON t.id = ct.teacher_id
      LEFT JOIN users u ON u.id = t.user_id
      WHERE ${secWhere.join(' AND ')}
      GROUP BY sec.id, sec.name, g.id, g.name, u.first_name, u.last_name
      ORDER BY g.name ASC, sec.name ASC
    `;
    const sectionsRes = await this.database.query(sectionsQuery, secParams);

    return {
      startDate,
      endDate,
      students: studentsRes.rows,
      attendanceRecords: attendanceRes.rows,
      sections: sectionsRes.rows,
    };
  }
}

module.exports = AttendanceRepository;
