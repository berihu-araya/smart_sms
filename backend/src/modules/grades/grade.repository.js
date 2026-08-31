function getGradeSortValue(value) {
  if (value === null || value === undefined) {
    return Number.MAX_SAFE_INTEGER;
  }

  const normalized = String(value).trim().toLowerCase();
  if (!normalized) {
    return Number.MAX_SAFE_INTEGER;
  }

  if (['kg', 'kindergarten', 'nursery', 'prep'].includes(normalized)) {
    return 0;
  }

  const match = normalized.match(/(?:grade|class|level)\s*(\d+)/i) || normalized.match(/(\d+)/);
  if (match) {
    return Number(match[1]);
  }

  return Number.MAX_SAFE_INTEGER;
}

class GradeRepository {
  constructor(database) {
    this.database = database;
  }

  async findAll({
    search = '',
    status = 'active', // 'active' | 'inactive' | 'all'
    sortBy = 'name',
    sortOrder = 'ASC',
    limit = 20,
    offset = 0,
  } = {}) {
    const searchPattern = `%${search.trim()}%`;
    const values = [searchPattern];
    const conditions = [];

    // Status filter
    if (status === 'active') {
      conditions.push('g.deleted_at IS NULL');
    } else if (status === 'inactive') {
      conditions.push('g.deleted_at IS NOT NULL');
    }
    // if status === 'all', no deleted_at filter is added

    const statusClause = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';

    const whereClause = `
      WHERE (
        LOWER(g.name) LIKE LOWER($1)
        OR LOWER(COALESCE(g.description, '')) LIKE LOWER($1)
      )
      ${statusClause}
    `;

    // 1. Total count
    const countResult = await this.database.query(
      `
      SELECT COUNT(*)::int AS total
      FROM grades g
      ${whereClause}
      `,
      values
    );
    const total = countResult.rows[0]?.total || 0;

    // 2. Sorting whitelist
    const allowedSortColumns = {
      name: 'g.name',
      created_at: 'g.created_at',
      updated_at: 'g.updated_at',
      section_count: 'section_count',
    };
    const sortDir = String(sortOrder).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    const normalizedSortBy = String(sortBy || 'name').toLowerCase();
    const sortCol = allowedSortColumns[normalizedSortBy] || 'g.name';
    const gradeNameSortExpression = `
      CASE
        WHEN LOWER(g.name) IN ('kg', 'kindergarten', 'nursery', 'prep') THEN 0
        WHEN LOWER(g.name) ~ '^(grade|class|level)\\s*[0-9]+$' THEN CAST(regexp_replace(LOWER(g.name), '[^0-9]', '', 'g') AS INTEGER)
        WHEN LOWER(g.name) ~ '^[0-9]+$' THEN CAST(g.name AS INTEGER)
        ELSE 999999
      END
    `;
    const finalOrderBy = normalizedSortBy === 'name'
      ? `${gradeNameSortExpression} ${sortDir}, LOWER(g.name) ${sortDir}`
      : `${sortCol} ${sortDir}`;

    // 3. Paginated items
    const limitIndex = values.length + 1;
    const offsetIndex = values.length + 2;
    const queryValues = [...values, limit, offset];

    const result = await this.database.query(
      `
      SELECT
        g.id,
        g.name,
        g.description,
        g.created_at,
        g.updated_at,
        g.deleted_at,
        CASE WHEN g.deleted_at IS NULL THEN 'ACTIVE' ELSE 'INACTIVE' END AS status,
        (SELECT COUNT(*)::int FROM sections s WHERE s.grade_id = g.id AND s.deleted_at IS NULL) AS section_count,
        (SELECT COUNT(*)::int FROM students st JOIN sections sec ON sec.id = st.section_id WHERE sec.grade_id = g.id AND st.deleted_at IS NULL) AS student_count,
        (SELECT COUNT(*)::int FROM grade_subjects gs WHERE gs.grade_id = g.id AND gs.deleted_at IS NULL) AS subject_count
      FROM grades g
      ${whereClause}
      ORDER BY ${finalOrderBy}
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
        g.id,
        g.name,
        g.description,
        g.created_at,
        g.updated_at,
        g.deleted_at,
        CASE WHEN g.deleted_at IS NULL THEN 'ACTIVE' ELSE 'INACTIVE' END AS status,
        (SELECT COUNT(*)::int FROM sections s WHERE s.grade_id = g.id AND s.deleted_at IS NULL) AS section_count,
        (SELECT COUNT(*)::int FROM students st JOIN sections sec ON sec.id = st.section_id WHERE sec.grade_id = g.id AND st.deleted_at IS NULL) AS student_count,
        (SELECT COUNT(*)::int FROM grade_subjects gs WHERE gs.grade_id = g.id AND gs.deleted_at IS NULL) AS subject_count
      FROM grades g
      WHERE g.id = $1
      LIMIT 1
      `,
      [id]
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
      SELECT id, name
      FROM grades
      WHERE LOWER(name) = LOWER($1)
        AND deleted_at IS NULL
        ${excludeClause}
      LIMIT 1
      `,
      values
    );

    return result.rows[0] || null;
  }

  async checkReferences(id) {
    const sectionRes = await this.database.query(
      `SELECT COUNT(*)::int AS count FROM sections WHERE grade_id = $1 AND deleted_at IS NULL`,
      [id]
    );
    const studentRes = await this.database.query(
      `SELECT COUNT(*)::int AS count FROM students st JOIN sections sec ON sec.id = st.section_id WHERE sec.grade_id = $1 AND st.deleted_at IS NULL`,
      [id]
    );
    const gradeSubjectRes = await this.database.query(
      `SELECT COUNT(*)::int AS count FROM grade_subjects WHERE grade_id = $1 AND deleted_at IS NULL`,
      [id]
    );
    const examRes = await this.database.query(
      `SELECT COUNT(*)::int AS count FROM exams WHERE grade_id = $1 AND deleted_at IS NULL`,
      [id]
    );

    const sections = sectionRes.rows[0]?.count || 0;
    const students = studentRes.rows[0]?.count || 0;
    const gradeSubjects = gradeSubjectRes.rows[0]?.count || 0;
    const exams = examRes.rows[0]?.count || 0;

    return {
      sections,
      students,
      gradeSubjects,
      exams,
      totalReferences: sections + students + gradeSubjects + exams,
      hasReferences: sections + students + gradeSubjects + exams > 0,
    };
  }

  async create(payload) {
    const result = await this.database.query(
      `
      INSERT INTO grades (name, description)
      VALUES ($1, $2)
      RETURNING *
      `,
      [payload.name, payload.description || null]
    );

    return result.rows[0];
  }

  async update(id, payload) {
    const allowedColumns = ['name', 'description'];
    const fields = [];
    const values = [];
    let index = 1;

    allowedColumns.forEach((col) => {
      if (payload[col] !== undefined) {
        fields.push(`${col} = $${index}`);
        values.push(payload[col]);
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
      UPDATE grades
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
      UPDATE grades
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
      UPDATE grades
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

module.exports = GradeRepository;
module.exports.getGradeSortValue = getGradeSortValue;
