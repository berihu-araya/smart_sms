class TimetableRepository {
  constructor(database) {
    this.database = database;
  }

  async findAllTimetables({ academicYearId, term, status, limit = 50, offset = 0 } = {}) {
    const conditions = ['t.deleted_at IS NULL'];
    const values = [];
    let index = 1;

    if (academicYearId) {
      conditions.push(`t.academic_year_id = $${index}`);
      values.push(academicYearId);
      index += 1;
    }

    if (term) {
      conditions.push(`LOWER(t.term) = LOWER($${index})`);
      values.push(term.trim());
      index += 1;
    }

    if (status) {
      conditions.push(`t.status = $${index}`);
      values.push(status.trim().toUpperCase());
      index += 1;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const countResult = await this.database.query(
      `SELECT COUNT(*)::int AS total FROM timetables t ${whereClause}`,
      values
    );
    const total = countResult.rows[0]?.total || 0;

    const limitIndex = index;
    const offsetIndex = index + 1;
    values.push(limit, offset);

    const result = await this.database.query(
      `
      SELECT
        t.id,
        t.academic_year_id,
        ay.name AS academic_year_name,
        t.term,
        t.name,
        t.status,
        t.version,
        t.is_active,
        t.published_at,
        t.published_by,
        CONCAT(pub_u.first_name, ' ', pub_u.last_name) AS published_by_name,
        t.archived_at,
        t.created_by,
        CONCAT(cr_u.first_name, ' ', cr_u.last_name) AS created_by_name,
        t.created_at,
        t.updated_at,
        (
          SELECT COUNT(*)::int
          FROM timetable_entries te
          WHERE te.timetable_id = t.id AND te.deleted_at IS NULL
        ) AS total_entries_count
      FROM timetables t
      INNER JOIN academic_years ay ON ay.id = t.academic_year_id
      LEFT JOIN users pub_u ON pub_u.id = t.published_by
      LEFT JOIN users cr_u ON cr_u.id = t.created_by
      ${whereClause}
      ORDER BY t.created_at DESC
      LIMIT $${limitIndex} OFFSET $${offsetIndex}
      `,
      values
    );

    return {
      items: result.rows,
      total,
    };
  }

  async findTimetableById(id) {
    const result = await this.database.query(
      `
      SELECT
        t.id,
        t.academic_year_id,
        ay.name AS academic_year_name,
        t.term,
        t.name,
        t.status,
        t.version,
        t.is_active,
        t.published_at,
        t.published_by,
        CONCAT(pub_u.first_name, ' ', pub_u.last_name) AS published_by_name,
        t.archived_at,
        t.created_by,
        CONCAT(cr_u.first_name, ' ', cr_u.last_name) AS created_by_name,
        t.created_at,
        t.updated_at,
        (
          SELECT COUNT(*)::int
          FROM timetable_entries te
          WHERE te.timetable_id = t.id AND te.deleted_at IS NULL
        ) AS total_entries_count
      FROM timetables t
      INNER JOIN academic_years ay ON ay.id = t.academic_year_id
      LEFT JOIN users pub_u ON pub_u.id = t.published_by
      LEFT JOIN users cr_u ON cr_u.id = t.created_by
      WHERE t.id = $1 AND t.deleted_at IS NULL
      LIMIT 1
      `,
      [id]
    );

    return result.rows[0] || null;
  }

  async findActiveTimetable(academicYearId, term = null) {
    const conditions = [
      't.academic_year_id = $1',
      't.is_active = true',
      "t.status = 'PUBLISHED'",
      't.deleted_at IS NULL',
    ];
    const values = [academicYearId];

    if (term) {
      conditions.push('LOWER(t.term) = LOWER($2)');
      values.push(term.trim());
    }

    const result = await this.database.query(
      `
      SELECT t.*
      FROM timetables t
      WHERE ${conditions.join(' AND ')}
      ORDER BY t.version DESC
      LIMIT 1
      `,
      values
    );

    return result.rows[0] || null;
  }

  async createTimetable(payload, client = null) {
    const db = client || this.database;
    const result = await db.query(
      `
      INSERT INTO timetables (
        academic_year_id,
        term,
        name,
        status,
        version,
        is_active,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
      `,
      [
        payload.academic_year_id,
        payload.term,
        payload.name,
        payload.status || 'DRAFT',
        payload.version || 1,
        payload.is_active || false,
        payload.created_by || null,
      ]
    );

    return result.rows[0];
  }

  async updateTimetable(id, payload, client = null) {
    const db = client || this.database;
    const fields = [];
    const values = [];
    let index = 1;

    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = $${index}`);
        values.push(value);
        index += 1;
      }
    });

    if (fields.length === 0) {
      return this.findTimetableById(id);
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const result = await db.query(
      `
      UPDATE timetables
      SET ${fields.join(', ')}
      WHERE id = $${index} AND deleted_at IS NULL
      RETURNING *
      `,
      values
    );

    return result.rows[0] || null;
  }

  async softDeleteTimetable(id, client = null) {
    const db = client || this.database;
    const result = await db.query(
      `
      UPDATE timetables
      SET deleted_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP,
          is_active = false
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING *
      `,
      [id]
    );

    return result.rows[0] || null;
  }

  // --- Timetable Entries ---

  async findAllEntries({
    timetableId,
    sectionId,
    teacherId,
    roomId,
    dayOfWeek,
    periodId,
  } = {}) {
    const conditions = ['te.deleted_at IS NULL'];
    const values = [];
    let index = 1;

    if (timetableId) {
      conditions.push(`te.timetable_id = $${index}`);
      values.push(timetableId);
      index += 1;
    }

    if (sectionId) {
      conditions.push(`te.section_id = $${index}`);
      values.push(sectionId);
      index += 1;
    }

    if (teacherId) {
      conditions.push(`te.teacher_id = $${index}`);
      values.push(teacherId);
      index += 1;
    }

    if (roomId) {
      conditions.push(`te.room_id = $${index}`);
      values.push(roomId);
      index += 1;
    }

    if (dayOfWeek) {
      conditions.push(`te.day_of_week = $${index}`);
      values.push(dayOfWeek.trim().toUpperCase());
      index += 1;
    }

    if (periodId) {
      conditions.push(`te.period_id = $${index}`);
      values.push(periodId);
      index += 1;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const result = await this.database.query(
      `
      SELECT
        te.id,
        te.timetable_id,
        te.section_id,
        sec.name AS section_name,
        g.id AS grade_id,
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
        te.day_of_week,
        te.created_at,
        te.updated_at
      FROM timetable_entries te
      INNER JOIN sections sec ON sec.id = te.section_id
      LEFT JOIN grades g ON g.id = sec.grade_id
      INNER JOIN subjects s ON s.id = te.subject_id
      INNER JOIN teachers t ON t.id = te.teacher_id
      LEFT JOIN rooms r ON r.id = te.room_id
      INNER JOIN periods p ON p.id = te.period_id
      ${whereClause}
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
        p.period_order ASC,
        sec.name ASC
      `,
      values
    );

    return result.rows;
  }

  async findEntryById(id) {
    const result = await this.database.query(
      `
      SELECT
        te.id,
        te.timetable_id,
        te.section_id,
        sec.name AS section_name,
        g.id AS grade_id,
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
        te.day_of_week,
        te.created_at,
        te.updated_at
      FROM timetable_entries te
      INNER JOIN sections sec ON sec.id = te.section_id
      LEFT JOIN grades g ON g.id = sec.grade_id
      INNER JOIN subjects s ON s.id = te.subject_id
      INNER JOIN teachers t ON t.id = te.teacher_id
      LEFT JOIN rooms r ON r.id = te.room_id
      INNER JOIN periods p ON p.id = te.period_id
      WHERE te.id = $1 AND te.deleted_at IS NULL
      LIMIT 1
      `,
      [id]
    );

    return result.rows[0] || null;
  }

  async createEntry(payload, client = null) {
    const db = client || this.database;
    const result = await db.query(
      `
      INSERT INTO timetable_entries (
        timetable_id,
        section_id,
        subject_id,
        teacher_id,
        room_id,
        period_id,
        day_of_week
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
      `,
      [
        payload.timetable_id,
        payload.section_id,
        payload.subject_id,
        payload.teacher_id,
        payload.room_id || null,
        payload.period_id,
        payload.day_of_week,
      ]
    );

    return result.rows[0];
  }

  async updateEntry(id, payload, client = null) {
    const db = client || this.database;
    const fields = [];
    const values = [];
    let index = 1;

    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = $${index}`);
        values.push(value);
        index += 1;
      }
    });

    if (fields.length === 0) {
      return this.findEntryById(id);
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const result = await db.query(
      `
      UPDATE timetable_entries
      SET ${fields.join(', ')}
      WHERE id = $${index} AND deleted_at IS NULL
      RETURNING *
      `,
      values
    );

    return result.rows[0] || null;
  }

  async deleteEntry(id, client = null) {
    const db = client || this.database;
    const result = await db.query(
      `
      UPDATE timetable_entries
      SET deleted_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING *
      `,
      [id]
    );

    return result.rows[0] || null;
  }

  // --- Conflict Detection Queries ---

  async findTeacherSlotConflict(timetableId, teacherId, dayOfWeek, periodId, excludeEntryId = null) {
    const conditions = [
      'te.timetable_id = $1',
      'te.teacher_id = $2',
      'te.day_of_week = $3',
      'te.period_id = $4',
      'te.deleted_at IS NULL',
    ];
    const values = [timetableId, teacherId, dayOfWeek, periodId];

    if (excludeEntryId) {
      conditions.push('te.id != $5');
      values.push(excludeEntryId);
    }

    const result = await this.database.query(
      `
      SELECT
        te.id,
        sec.name AS section_name,
        s.subject_name,
        CONCAT(t.first_name, ' ', t.last_name) AS teacher_name,
        p.name AS period_name
      FROM timetable_entries te
      INNER JOIN sections sec ON sec.id = te.section_id
      INNER JOIN subjects s ON s.id = te.subject_id
      INNER JOIN teachers t ON t.id = te.teacher_id
      INNER JOIN periods p ON p.id = te.period_id
      WHERE ${conditions.join(' AND ')}
      LIMIT 1
      `,
      values
    );

    return result.rows[0] || null;
  }

  async findSectionSlotConflict(timetableId, sectionId, dayOfWeek, periodId, excludeEntryId = null) {
    const conditions = [
      'te.timetable_id = $1',
      'te.section_id = $2',
      'te.day_of_week = $3',
      'te.period_id = $4',
      'te.deleted_at IS NULL',
    ];
    const values = [timetableId, sectionId, dayOfWeek, periodId];

    if (excludeEntryId) {
      conditions.push('te.id != $5');
      values.push(excludeEntryId);
    }

    const result = await this.database.query(
      `
      SELECT
        te.id,
        sec.name AS section_name,
        s.subject_name,
        CONCAT(t.first_name, ' ', t.last_name) AS teacher_name,
        p.name AS period_name
      FROM timetable_entries te
      INNER JOIN sections sec ON sec.id = te.section_id
      INNER JOIN subjects s ON s.id = te.subject_id
      INNER JOIN teachers t ON t.id = te.teacher_id
      INNER JOIN periods p ON p.id = te.period_id
      WHERE ${conditions.join(' AND ')}
      LIMIT 1
      `,
      values
    );

    return result.rows[0] || null;
  }

  async findRoomSlotConflict(timetableId, roomId, dayOfWeek, periodId, excludeEntryId = null) {
    if (!roomId) return null;

    const conditions = [
      'te.timetable_id = $1',
      'te.room_id = $2',
      'te.day_of_week = $3',
      'te.period_id = $4',
      'te.deleted_at IS NULL',
    ];
    const values = [timetableId, roomId, dayOfWeek, periodId];

    if (excludeEntryId) {
      conditions.push('te.id != $5');
      values.push(excludeEntryId);
    }

    const result = await this.database.query(
      `
      SELECT
        te.id,
        r.name AS room_name,
        sec.name AS section_name,
        s.subject_name,
        p.name AS period_name
      FROM timetable_entries te
      INNER JOIN rooms r ON r.id = te.room_id
      INNER JOIN sections sec ON sec.id = te.section_id
      INNER JOIN subjects s ON s.id = te.subject_id
      INNER JOIN periods p ON p.id = te.period_id
      WHERE ${conditions.join(' AND ')}
      LIMIT 1
      `,
      values
    );

    return result.rows[0] || null;
  }
}

module.exports = TimetableRepository;
