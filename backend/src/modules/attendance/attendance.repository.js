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
        s.photo,
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

  async bulkUpsertAttendance({ sectionId, date, academicYearId, recordedBy, records }) {
    const client = await this.database.connect();
    try {
      await client.query('BEGIN');

      const savedRecords = [];

      for (const rec of records) {
        const result = await client.query(
          `
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
          VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT (student_id, date)
          DO UPDATE SET
            status = EXCLUDED.status,
            remark = EXCLUDED.remark,
            section_id = EXCLUDED.section_id,
            academic_year_id = COALESCE(EXCLUDED.academic_year_id, attendance.academic_year_id),
            recorded_by = EXCLUDED.recorded_by,
            updated_at = CURRENT_TIMESTAMP
          RETURNING *
          `,
          [
            rec.studentId,
            sectionId,
            academicYearId || null,
            date,
            rec.status,
            rec.remark || null,
            recordedBy || null,
          ]
        );
        savedRecords.push(result.rows[0]);
      }

      await client.query('COMMIT');
      return savedRecords;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
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

  async getStudentAttendanceHistory(studentId, { limit = 30, offset = 0 } = {}) {
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
      ORDER BY a.date DESC
      LIMIT $2 OFFSET $3
      `,
      [studentId, limit, offset]
    );

    const statsResult = await this.database.query(
      `
      SELECT
        COUNT(*) as total_days,
        COUNT(*) FILTER (WHERE status = 'PRESENT') as present_days,
        COUNT(*) FILTER (WHERE status = 'ABSENT') as absent_days,
        COUNT(*) FILTER (WHERE status = 'LATE') as late_days,
        COUNT(*) FILTER (WHERE status = 'EXCUSED') as excused_days
      FROM attendance
      WHERE student_id = $1
        AND deleted_at IS NULL
      `,
      [studentId]
    );

    return {
      history: result.rows,
      stats: statsResult.rows[0] || {},
    };
  }
}

module.exports = AttendanceRepository;
