class AvailabilityRepository {
  constructor(database) {
    this.database = database;
  }

  async findByTeacher(teacherId, academicYearId) {
    const result = await this.database.query(
      `
      SELECT
        ta.id,
        ta.teacher_id,
        ta.academic_year_id,
        ta.day_of_week,
        ta.period_id,
        p.name AS period_name,
        TO_CHAR(p.start_time, 'HH24:MI') AS start_time,
        TO_CHAR(p.end_time, 'HH24:MI') AS end_time,
        p.period_order,
        p.is_break,
        ta.is_available,
        ta.reason,
        ta.created_at,
        ta.updated_at
      FROM teacher_availabilities ta
      INNER JOIN periods p ON p.id = ta.period_id AND p.deleted_at IS NULL
      WHERE ta.teacher_id = $1
        AND ta.academic_year_id = $2
        AND ta.deleted_at IS NULL
      ORDER BY
        CASE ta.day_of_week
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
      [teacherId, academicYearId]
    );

    return result.rows;
  }

  async isTeacherAvailable(teacherId, academicYearId, dayOfWeek, periodId) {
    const result = await this.database.query(
      `
      SELECT is_available, reason
      FROM teacher_availabilities
      WHERE teacher_id = $1
        AND academic_year_id = $2
        AND day_of_week = $3
        AND period_id = $4
        AND deleted_at IS NULL
      LIMIT 1
      `,
      [teacherId, academicYearId, dayOfWeek, periodId]
    );

    if (result.rows.length === 0) {
      // By default available if no explicit restriction recorded
      return { isAvailable: true, reason: null };
    }

    return {
      isAvailable: Boolean(result.rows[0].is_available),
      reason: result.rows[0].reason || null,
    };
  }

  async batchUpsert(teacherId, academicYearId, slots = [], client = null) {
    const db = client || this.database;

    const upsertResults = [];
    for (const slot of slots) {
      const result = await db.query(
        `
        INSERT INTO teacher_availabilities (
          teacher_id,
          academic_year_id,
          day_of_week,
          period_id,
          is_available,
          reason,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (teacher_id, academic_year_id, day_of_week, period_id)
        DO UPDATE SET
          is_available = EXCLUDED.is_available,
          reason = EXCLUDED.reason,
          deleted_at = NULL,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
        `,
        [
          teacherId,
          academicYearId,
          slot.day_of_week,
          slot.period_id,
          slot.is_available,
          slot.reason || null,
        ]
      );
      upsertResults.push(result.rows[0]);
    }

    return upsertResults;
  }
}

module.exports = AvailabilityRepository;
