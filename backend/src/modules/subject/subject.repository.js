class SubjectRepository {
  constructor(database) {
    this.database = database;
  }

  async findAll({
    search = '',
    status = 'active', // 'active' | 'inactive' | 'all'
    sortBy = 'subject_name',
    sortOrder = 'ASC',
    limit = 20,
    offset = 0,
  } = {}) {
    const searchPattern = `%${search.trim()}%`;
    const conditions = [];
    const values = [searchPattern];

    // Status filter
    if (status === 'active') {
      conditions.push("s.deleted_at IS NULL AND s.status != 'INACTIVE'");
    } else if (status === 'inactive') {
      conditions.push("(s.deleted_at IS NOT NULL OR s.status = 'INACTIVE')");
    }

    const statusClause = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';

    const whereClause = `
      WHERE (
        LOWER(s.subject_name) LIKE LOWER($1)
        OR LOWER(s.subject_code) LIKE LOWER($1)
        OR LOWER(COALESCE(s.short_name, '')) LIKE LOWER($1)
      )
      ${statusClause}
    `;

    // 1. Total count
    const countResult = await this.database.query(
      `
      SELECT COUNT(*)::int AS total
      FROM subjects s
      ${whereClause}
      `,
      values
    );
    const total = countResult.rows[0]?.total || 0;

    // 2. Sorting whitelist
    const allowedSortColumns = {
      subject_name: 's.subject_name',
      subject_code: 's.subject_code',
      credit_hours: 's.credit_hours',
      pass_mark: 's.pass_mark',
      max_mark: 's.max_mark',
      created_at: 's.created_at',
      display_order: 's.display_order',
      status: 's.status',
    };
    const sortCol = allowedSortColumns[sortBy] || 's.subject_name';
    const sortDir = String(sortOrder).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    // 3. Paginated items
    const limitIndex = values.length + 1;
    const offsetIndex = values.length + 2;
    const queryValues = [...values, limit, offset];

    const result = await this.database.query(
      `
        SELECT
          s.id,
          s.subject_code,
          s.subject_name,
          s.short_name,
          s.description,
          s.credit_hours,
          s.pass_mark,
          s.max_mark,
          s.is_elective,
          s.is_lab,
          s.display_order,
          s.status,
          s.created_at,
          s.updated_at,
          s.deleted_at,
          (SELECT COUNT(*)::int FROM grade_subjects gs WHERE gs.subject_id = s.id AND gs.deleted_at IS NULL) AS grade_count,
          (SELECT COUNT(*)::int FROM teacher_subjects ts WHERE ts.subject_id = s.id AND ts.deleted_at IS NULL) AS teacher_count
        FROM subjects s
        ${whereClause}
        ORDER BY ${sortCol} ${sortDir}
        LIMIT $${limitIndex} OFFSET $${offsetIndex}
      `,
      queryValues
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
          s.id,
          s.subject_code,
          s.subject_name,
          s.short_name,
          s.description,
          s.credit_hours,
          s.pass_mark,
          s.max_mark,
          s.is_elective,
          s.is_lab,
          s.display_order,
          s.status,
          s.created_at,
          s.updated_at,
          s.deleted_at,
          (SELECT COUNT(*)::int FROM grade_subjects gs WHERE gs.subject_id = s.id AND gs.deleted_at IS NULL) AS grade_count,
          (SELECT COUNT(*)::int FROM teacher_subjects ts WHERE ts.subject_id = s.id AND ts.deleted_at IS NULL) AS teacher_count
        FROM subjects s
        WHERE s.id = $1
        LIMIT 1
      `,
      [id]
    );

    return result.rows[0] || null;
  }

  async findByCode(code, excludeId = null) {
    const values = [code.trim()];
    let excludeClause = '';
    if (excludeId) {
      values.push(excludeId);
      excludeClause = `AND id != $2`;
    }

    const result = await this.database.query(
      `
        SELECT *
        FROM subjects
        WHERE LOWER(subject_code) = LOWER($1)
          AND deleted_at IS NULL
          ${excludeClause}
        LIMIT 1
      `,
      values
    );

    return result.rows[0] || null;
  }

  async findByName(name, excludeId = null) {
    const values = [name.trim()];
    let excludeClause = '';
    if (excludeId) {
      values.push(excludeId);
      excludeClause = `AND id != $2`;
    }

    const result = await this.database.query(
      `
        SELECT *
        FROM subjects
        WHERE LOWER(subject_name) = LOWER($1)
          AND deleted_at IS NULL
          ${excludeClause}
        LIMIT 1
      `,
      values
    );

    return result.rows[0] || null;
  }

  async checkReferences(id) {
    const gradeSubjectRes = await this.database.query(
      `SELECT COUNT(*)::int AS count FROM grade_subjects WHERE subject_id = $1 AND deleted_at IS NULL`,
      [id]
    );
    const teacherSubjectRes = await this.database.query(
      `SELECT COUNT(*)::int AS count FROM teacher_subjects WHERE subject_id = $1 AND deleted_at IS NULL`,
      [id]
    );
    const marksRes = await this.database.query(
      `SELECT COUNT(*)::int AS count FROM marks WHERE subject_id = $1`,
      [id]
    );

    const gradeSubjects = gradeSubjectRes.rows[0]?.count || 0;
    const teacherSubjects = teacherSubjectRes.rows[0]?.count || 0;
    const marks = marksRes.rows[0]?.count || 0;

    return {
      gradeSubjects,
      teacherSubjects,
      marks,
      totalReferences: gradeSubjects + teacherSubjects + marks,
      hasReferences: gradeSubjects + teacherSubjects + marks > 0,
    };
  }

  async create(payload) {
    const result = await this.database.query(
      `
        INSERT INTO subjects
        (
          subject_code,
          subject_name,
          short_name,
          description,
          credit_hours,
          pass_mark,
          max_mark,
          is_elective,
          is_lab,
          display_order,
          status
        )
        VALUES
        (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11
        )
        RETURNING *
      `,
      [
        payload.subject_code,
        payload.subject_name,
        payload.short_name || null,
        payload.description || null,
        payload.credit_hours !== undefined ? payload.credit_hours : null,
        payload.pass_mark !== undefined ? payload.pass_mark : null,
        payload.max_mark !== undefined ? payload.max_mark : null,
        payload.is_elective !== undefined ? payload.is_elective : false,
        payload.is_lab !== undefined ? payload.is_lab : false,
        payload.display_order || 0,
        payload.status || 'ACTIVE',
      ]
    );

    return result.rows[0] || null;
  }

  async update(id, payload) {
    const allowedColumns = [
      'subject_code',
      'subject_name',
      'short_name',
      'description',
      'credit_hours',
      'pass_mark',
      'max_mark',
      'is_elective',
      'is_lab',
      'display_order',
      'status',
    ];

    const fields = [];
    const values = [];
    let index = 1;

    allowedColumns.forEach((col) => {
      if (payload[col] !== undefined) {
        fields.push(`${col} = $${index}`);
        values.push(payload[col]);
        index++;
      }
    });

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await this.database.query(
      `
        UPDATE subjects
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
        UPDATE subjects
        SET
          status = 'INACTIVE',
          deleted_at = CURRENT_TIMESTAMP,
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
        UPDATE subjects
        SET
          status = 'ACTIVE',
          deleted_at = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
          AND (deleted_at IS NOT NULL OR status = 'INACTIVE')
        RETURNING *
      `,
      [id]
    );

    return result.rows[0] || null;
  }
}

module.exports = SubjectRepository;