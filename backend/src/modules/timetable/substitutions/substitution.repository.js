class SubstitutionRepository {
  constructor(database) {
    this.database = database;
  }

  async findAllSubstitutions({
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
    const conditions = ['ts.deleted_at IS NULL'];
    const values = [];
    let index = 1;

    if (timetableId) {
      conditions.push(`te.timetable_id = $${index}`);
      values.push(timetableId);
      index += 1;
    }

    if (teacherId) {
      conditions.push(`ts.original_teacher_id = $${index}`);
      values.push(teacherId);
      index += 1;
    }

    if (substituteTeacherId) {
      conditions.push(`ts.substitute_teacher_id = $${index}`);
      values.push(substituteTeacherId);
      index += 1;
    }

    if (date) {
      conditions.push(`ts.substitution_date = $${index}`);
      values.push(date);
      index += 1;
    }

    if (fromDate) {
      conditions.push(`ts.substitution_date >= $${index}`);
      values.push(fromDate);
      index += 1;
    }

    if (toDate) {
      conditions.push(`ts.substitution_date <= $${index}`);
      values.push(toDate);
      index += 1;
    }

    if (status) {
      conditions.push(`ts.status = $${index}`);
      values.push(status.trim().toUpperCase());
      index += 1;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const countResult = await this.database.query(
      `
      SELECT COUNT(*)::int AS total
      FROM timetable_substitutions ts
      INNER JOIN timetable_entries te ON te.id = ts.timetable_entry_id
      ${whereClause}
      `,
      values
    );
    const total = countResult.rows[0]?.total || 0;

    const limitIndex = index;
    const offsetIndex = index + 1;
    values.push(limit, offset);

    const result = await this.database.query(
      `
      SELECT
        ts.id,
        ts.timetable_entry_id,
        te.timetable_id,
        te.day_of_week,
        te.period_id,
        p.name AS period_name,
        TO_CHAR(p.start_time, 'HH24:MI') AS start_time,
        TO_CHAR(p.end_time, 'HH24:MI') AS end_time,
        te.section_id,
        sec.name AS section_name,
        te.subject_id,
        s.subject_name,
        s.subject_code,
        te.room_id,
        r.name AS room_name,
        ts.original_teacher_id,
        CONCAT(orig_t.first_name, ' ', orig_t.last_name) AS original_teacher_name,
        orig_t.employee_number AS original_teacher_employee_number,
        ts.substitute_teacher_id,
        CONCAT(sub_t.first_name, ' ', sub_t.last_name) AS substitute_teacher_name,
        sub_t.employee_number AS substitute_teacher_employee_number,
        TO_CHAR(ts.substitution_date, 'YYYY-MM-DD') AS substitution_date,
        ts.status,
        ts.reason,
        ts.notes,
        ts.requested_by,
        CONCAT(req_u.first_name, ' ', req_u.last_name) AS requested_by_name,
        ts.approved_by,
        CONCAT(app_u.first_name, ' ', app_u.last_name) AS approved_by_name,
        ts.created_at,
        ts.updated_at
      FROM timetable_substitutions ts
      INNER JOIN timetable_entries te ON te.id = ts.timetable_entry_id
      INNER JOIN periods p ON p.id = te.period_id
      INNER JOIN sections sec ON sec.id = te.section_id
      INNER JOIN subjects s ON s.id = te.subject_id
      LEFT JOIN rooms r ON r.id = te.room_id
      INNER JOIN teachers orig_t ON orig_t.id = ts.original_teacher_id
      INNER JOIN teachers sub_t ON sub_t.id = ts.substitute_teacher_id
      LEFT JOIN users req_u ON req_u.id = ts.requested_by
      LEFT JOIN users app_u ON app_u.id = ts.approved_by
      ${whereClause}
      ORDER BY ts.substitution_date DESC, p.period_order ASC, ts.created_at DESC
      LIMIT $${limitIndex} OFFSET $${offsetIndex}
      `,
      values
    );

    return {
      items: result.rows,
      total,
    };
  }

  async findSubstitutionById(id) {
    const result = await this.database.query(
      `
      SELECT
        ts.id,
        ts.timetable_entry_id,
        te.timetable_id,
        te.day_of_week,
        te.period_id,
        p.name AS period_name,
        TO_CHAR(p.start_time, 'HH24:MI') AS start_time,
        TO_CHAR(p.end_time, 'HH24:MI') AS end_time,
        te.section_id,
        sec.name AS section_name,
        te.subject_id,
        s.subject_name,
        s.subject_code,
        te.room_id,
        r.name AS room_name,
        ts.original_teacher_id,
        CONCAT(orig_t.first_name, ' ', orig_t.last_name) AS original_teacher_name,
        orig_t.employee_number AS original_teacher_employee_number,
        ts.substitute_teacher_id,
        CONCAT(sub_t.first_name, ' ', sub_t.last_name) AS substitute_teacher_name,
        sub_t.employee_number AS substitute_teacher_employee_number,
        TO_CHAR(ts.substitution_date, 'YYYY-MM-DD') AS substitution_date,
        ts.status,
        ts.reason,
        ts.notes,
        ts.requested_by,
        CONCAT(req_u.first_name, ' ', req_u.last_name) AS requested_by_name,
        ts.approved_by,
        CONCAT(app_u.first_name, ' ', app_u.last_name) AS approved_by_name,
        ts.created_at,
        ts.updated_at
      FROM timetable_substitutions ts
      INNER JOIN timetable_entries te ON te.id = ts.timetable_entry_id
      INNER JOIN periods p ON p.id = te.period_id
      INNER JOIN sections sec ON sec.id = te.section_id
      INNER JOIN subjects s ON s.id = te.subject_id
      LEFT JOIN rooms r ON r.id = te.room_id
      INNER JOIN teachers orig_t ON orig_t.id = ts.original_teacher_id
      INNER JOIN teachers sub_t ON sub_t.id = ts.substitute_teacher_id
      LEFT JOIN users req_u ON req_u.id = ts.requested_by
      LEFT JOIN users app_u ON app_u.id = ts.approved_by
      WHERE ts.id = $1 AND ts.deleted_at IS NULL
      LIMIT 1
      `,
      [id]
    );

    return result.rows[0] || null;
  }

  async findEntryDetails(entryId) {
    const result = await this.database.query(
      `
      SELECT
        te.id,
        te.timetable_id,
        te.section_id,
        te.subject_id,
        te.teacher_id,
        te.room_id,
        te.period_id,
        te.day_of_week,
        p.is_break,
        p.name AS period_name
      FROM timetable_entries te
      INNER JOIN periods p ON p.id = te.period_id
      WHERE te.id = $1 AND te.deleted_at IS NULL
      LIMIT 1
      `,
      [entryId]
    );
    return result.rows[0] || null;
  }

  async checkTeacherBusyOnSlot({ teacherId, timetableId, dayOfWeek, periodId, date, excludeSubstitutionId = null }) {
    // 1. Check if teacher has a regular scheduled entry in this timetable on this day & period
    const entryRes = await this.database.query(
      `
      SELECT te.id, s.subject_name, sec.name AS section_name
      FROM timetable_entries te
      INNER JOIN subjects s ON s.id = te.subject_id
      INNER JOIN sections sec ON sec.id = te.section_id
      WHERE te.timetable_id = $1
        AND te.teacher_id = $2
        AND te.day_of_week = $3
        AND te.period_id = $4
        AND te.deleted_at IS NULL
      LIMIT 1
      `,
      [timetableId, teacherId, dayOfWeek, periodId]
    );
    if (entryRes.rows.length > 0) {
      return {
        isBusy: true,
        type: 'REGULAR_LESSON',
        details: entryRes.rows[0],
      };
    }

    // 2. Check if teacher is already assigned as an approved substitute on this date & period
    const subConditions = [
      'ts.substitute_teacher_id = $1',
      'ts.substitution_date = $2',
      'te.period_id = $3',
      "ts.status IN ('PENDING', 'APPROVED')",
      'ts.deleted_at IS NULL',
    ];
    const subValues = [teacherId, date, periodId];

    if (excludeSubstitutionId) {
      subConditions.push('ts.id != $4');
      subValues.push(excludeSubstitutionId);
    }

    const subRes = await this.database.query(
      `
      SELECT ts.id, s.subject_name, sec.name AS section_name
      FROM timetable_substitutions ts
      INNER JOIN timetable_entries te ON te.id = ts.timetable_entry_id
      INNER JOIN subjects s ON s.id = te.subject_id
      INNER JOIN sections sec ON sec.id = te.section_id
      WHERE ${subConditions.join(' AND ')}
      LIMIT 1
      `,
      subValues
    );
    if (subRes.rows.length > 0) {
      return {
        isBusy: true,
        type: 'EXISTING_SUBSTITUTION',
        details: subRes.rows[0],
      };
    }

    return { isBusy: false };
  }

  async createSubstitution(payload, client = null) {
    const db = client || this.database;
    const result = await db.query(
      `
      INSERT INTO timetable_substitutions (
        timetable_entry_id,
        original_teacher_id,
        substitute_teacher_id,
        substitution_date,
        status,
        reason,
        notes,
        requested_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
      `,
      [
        payload.timetable_entry_id,
        payload.original_teacher_id,
        payload.substitute_teacher_id,
        payload.substitution_date,
        payload.status || 'PENDING',
        payload.reason || null,
        payload.notes || null,
        payload.requested_by || null,
      ]
    );

    return result.rows[0];
  }

  async updateSubstitutionStatus(id, { status, approvedBy, notes }, client = null) {
    const db = client || this.database;
    const fields = ['status = $1', 'updated_at = CURRENT_TIMESTAMP'];
    const values = [status];
    let index = 2;

    if (approvedBy) {
      fields.push(`approved_by = $${index}`);
      values.push(approvedBy);
      index += 1;
    }

    if (notes !== undefined) {
      fields.push(`notes = $${index}`);
      values.push(notes);
      index += 1;
    }

    values.push(id);

    const result = await db.query(
      `
      UPDATE timetable_substitutions
      SET ${fields.join(', ')}
      WHERE id = $${index} AND deleted_at IS NULL
      RETURNING *
      `,
      values
    );

    return result.rows[0] || null;
  }
}

module.exports = SubstitutionRepository;
