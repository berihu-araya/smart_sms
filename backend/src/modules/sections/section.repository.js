class SectionRepository {
  constructor(database) {
    this.database = database;
  }

  async findAll({
    search = '',
    gradeId = '',
    status = 'active', // 'active' | 'inactive' | 'all'
    sortBy = 'name',
    sortOrder = 'ASC',
    limit = 20,
    offset = 0,
  } = {}) {
    const conditions = [];
    const values = [];
    let index = 1;

    // Status filter
    if (status === 'active') {
      conditions.push('sec.deleted_at IS NULL');
    } else if (status === 'inactive') {
      conditions.push('sec.deleted_at IS NOT NULL');
    }

    if (search && search.trim()) {
      const searchPattern = `%${search.trim()}%`;
      conditions.push(`(
        LOWER(sec.name) LIKE LOWER($${index})
        OR LOWER(COALESCE(sec.room_number, '')) LIKE LOWER($${index})
        OR LOWER(COALESCE(g.name, '')) LIKE LOWER($${index})
      )`);
      values.push(searchPattern);
      index += 1;
    }

    if (gradeId && gradeId.trim()) {
      conditions.push(`sec.grade_id = $${index}`);
      values.push(gradeId.trim());
      index += 1;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 1. Total count
    const countResult = await this.database.query(
      `
      SELECT COUNT(*)::int AS total
      FROM sections sec
      LEFT JOIN grades g ON g.id = sec.grade_id
      ${whereClause}
      `,
      values
    );
    const total = countResult.rows[0]?.total || 0;

    // 2. Sorting whitelist
    const allowedSortColumns = {
      name: 'sec.name',
      room_number: 'sec.room_number',
      capacity: 'sec.capacity',
      grade_name: 'g.name',
      created_at: 'sec.created_at',
      student_count: 'student_count',
    };
    const sortCol = allowedSortColumns[sortBy] || 'sec.name';
    const sortDir = String(sortOrder).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    // 3. Paginated items
    values.push(limit);
    const limitIndex = index;
    index += 1;

    values.push(offset);
    const offsetIndex = index;

    const result = await this.database.query(
      `
        SELECT
          sec.id,
          sec.name,
          sec.room_number,
          sec.capacity,
          sec.grade_id,
          sec.created_at,
          sec.updated_at,
          sec.deleted_at,
          CASE WHEN sec.deleted_at IS NULL THEN 'ACTIVE' ELSE 'INACTIVE' END AS status,
          g.name AS grade_name,
          (SELECT COUNT(*)::int FROM students s WHERE s.section_id = sec.id AND s.deleted_at IS NULL) AS student_count,
          (SELECT COUNT(*)::int FROM teacher_subjects ts WHERE ts.section_id = sec.id AND ts.deleted_at IS NULL) AS teacher_count
        FROM sections sec
        LEFT JOIN grades g ON g.id = sec.grade_id
        ${whereClause}
        ORDER BY ${sortCol} ${sortDir}
        LIMIT $${limitIndex} OFFSET $${offsetIndex}
      `,
      values
    );

    return {
      items: result.rows,
      total,
    };
  }

  async findById(id) {
    const result = await this.database.query(
      `
        SELECT
          sec.id,
          sec.name,
          sec.room_number,
          sec.capacity,
          sec.grade_id,
          sec.created_at,
          sec.updated_at,
          sec.deleted_at,
          CASE WHEN sec.deleted_at IS NULL THEN 'ACTIVE' ELSE 'INACTIVE' END AS status,
          g.name AS grade_name,
          g.description AS grade_description,
          (SELECT COUNT(*)::int FROM students s WHERE s.section_id = sec.id AND s.deleted_at IS NULL) AS student_count,
          (SELECT COUNT(*)::int FROM teacher_subjects ts WHERE ts.section_id = sec.id AND ts.deleted_at IS NULL) AS teacher_count
        FROM sections sec
        LEFT JOIN grades g ON g.id = sec.grade_id
        WHERE sec.id = $1
        LIMIT 1
      `,
      [id]
    );

    return result.rows[0] || null;
  }

  async findByNameAndGrade(name, gradeId, excludeId = null) {
    const values = [name.trim(), gradeId];
    let excludeClause = '';
    if (excludeId) {
      values.push(excludeId);
      excludeClause = `AND id != $3`;
    }

    const result = await this.database.query(
      `
      SELECT id, name
      FROM sections
      WHERE LOWER(name) = LOWER($1)
        AND grade_id = $2
        AND deleted_at IS NULL
        ${excludeClause}
      LIMIT 1
      `,
      values
    );

    return result.rows[0] || null;
  }

  async checkReferences(id) {
    const studentRes = await this.database.query(
      `SELECT COUNT(*)::int AS count FROM students WHERE section_id = $1 AND deleted_at IS NULL`,
      [id]
    );
    const teacherSubjectRes = await this.database.query(
      `SELECT COUNT(*)::int AS count FROM teacher_subjects WHERE section_id = $1 AND deleted_at IS NULL`,
      [id]
    );
    const attendanceRes = await this.database.query(
      `SELECT COUNT(*)::int AS count FROM attendance WHERE section_id = $1 AND deleted_at IS NULL`,
      [id]
    );
    const marksRes = await this.database.query(
      `SELECT COUNT(*)::int AS count FROM marks WHERE section_id = $1`,
      [id]
    );

    const students = studentRes.rows[0]?.count || 0;
    const teacherSubjects = teacherSubjectRes.rows[0]?.count || 0;
    const attendance = attendanceRes.rows[0]?.count || 0;
    const marks = marksRes.rows[0]?.count || 0;

    return {
      students,
      teacherSubjects,
      attendance,
      marks,
      totalReferences: students + teacherSubjects + attendance + marks,
      hasReferences: students + teacherSubjects + attendance + marks > 0,
    };
  }

  async findByGradeId(gradeId) {
    const result = await this.database.query(
      `
        SELECT
          sec.id,
          sec.name,
          sec.room_number,
          sec.capacity,
          sec.grade_id,
          sec.created_at,
          sec.updated_at,
          g.name AS grade_name,
          (SELECT COUNT(*)::int FROM students s WHERE s.section_id = sec.id AND s.deleted_at IS NULL) AS student_count
        FROM sections sec
        LEFT JOIN grades g ON g.id = sec.grade_id AND g.deleted_at IS NULL
        WHERE sec.grade_id = $1
          AND sec.deleted_at IS NULL
        ORDER BY sec.name ASC
      `,
      [gradeId]
    );

    return result.rows;
  }

  async create(payload) {
    const result = await this.database.query(
      `
        INSERT INTO sections (name, grade_id, room_number, capacity)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `,
      [payload.name, payload.gradeId || payload.grade_id, payload.roomNumber || payload.room_number || null, payload.capacity || null]
    );

    return result.rows[0];
  }

  async update(id, payload) {
    const fields = [];
    const values = [];
    let index = 1;

    const keyMap = {
      name: 'name',
      gradeId: 'grade_id',
      grade_id: 'grade_id',
      roomNumber: 'room_number',
      room_number: 'room_number',
      capacity: 'capacity',
    };

    Object.entries(payload).forEach(([key, value]) => {
      const col = keyMap[key] || key;
      if (value !== undefined) {
        fields.push(`${col} = $${index}`);
        values.push(value);
        index += 1;
      }
    });

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await this.database.query(
      `
        UPDATE sections
        SET ${fields.join(', ')}
        WHERE id = $${index}
        RETURNING *
      `,
      values
    );

    return result.rows[0] || null;
  }

  async softDelete(id) {
    const result = await this.database.query(
      `
        UPDATE sections
        SET deleted_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
          AND deleted_at IS NULL
        RETURNING *
      `,
      [id]
    );

    return result.rows[0] || null;
  }

  async restore(id) {
    const result = await this.database.query(
      `
        UPDATE sections
        SET deleted_at = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
          AND deleted_at IS NOT NULL
        RETURNING *
      `,
      [id]
    );

    return result.rows[0] || null;
  }
}

module.exports = SectionRepository;
