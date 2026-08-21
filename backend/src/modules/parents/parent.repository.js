class ParentRepository {
  constructor(database) {
    this.database = database;
  }

  async findAll({ search = '', limit = 20, offset = 0 } = {}) {
    const searchPattern = `%${search.trim()}%`;

    const countResult = await this.database.query(
      `
        SELECT COUNT(*) AS total
        FROM parents p
        WHERE p.deleted_at IS NULL
          AND (
            LOWER(p.full_name) LIKE LOWER($1)
            OR LOWER(COALESCE(p.phone, '')) LIKE LOWER($1)
            OR LOWER(COALESCE(p.email, '')) LIKE LOWER($1)
            OR LOWER(COALESCE(p.occupation, '')) LIKE LOWER($1)
          )
      `,
      [searchPattern]
    );

    const result = await this.database.query(
      `
        SELECT
          p.id,
          p.full_name,
          p.phone,
          p.email,
          p.occupation,
          p.address,
          COALESCE(p.relationship, 'GUARDIAN') AS relationship,
          p.created_at,
          p.updated_at,
          COUNT(s.id) FILTER (WHERE s.deleted_at IS NULL) AS students_count
        FROM parents p
        LEFT JOIN students s ON s.parent_id = p.id
        WHERE p.deleted_at IS NULL
          AND (
            LOWER(p.full_name) LIKE LOWER($1)
            OR LOWER(COALESCE(p.phone, '')) LIKE LOWER($1)
            OR LOWER(COALESCE(p.email, '')) LIKE LOWER($1)
            OR LOWER(COALESCE(p.occupation, '')) LIKE LOWER($1)
          )
        GROUP BY p.id
        ORDER BY p.created_at DESC
        LIMIT $2 OFFSET $3
      `,
      [searchPattern, limit, offset]
    );

    return {
      items: result.rows,
      total: Number(countResult.rows[0]?.total || 0),
    };
  }

  async findById(id, client = null) {
    const db = client || this.database;
    const result = await db.query(
      `
        SELECT
          p.id,
          p.full_name,
          p.phone,
          p.email,
          p.occupation,
          p.address,
          COALESCE(p.relationship, 'GUARDIAN') AS relationship,
          p.created_at,
          p.updated_at,
          COUNT(s.id) FILTER (WHERE s.deleted_at IS NULL) AS students_count
        FROM parents p
        LEFT JOIN students s ON s.parent_id = p.id
        WHERE p.id = $1
          AND p.deleted_at IS NULL
        GROUP BY p.id
        LIMIT 1
      `,
      [id]
    );

    return result.rows[0] || null;
  }

  async findByPhone(phone, client = null) {
    if (!phone) return null;
    const db = client || this.database;
    const result = await db.query(
      `
        SELECT *
        FROM parents
        WHERE phone = $1
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [phone.trim()]
    );

    return result.rows[0] || null;
  }

  async findByEmail(email, client = null) {
    if (!email) return null;
    const db = client || this.database;
    const result = await db.query(
      `
        SELECT *
        FROM parents
        WHERE LOWER(email) = LOWER($1)
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [email.trim()]
    );

    return result.rows[0] || null;
  }

  async create(payload, client = null) {
    const db = client || this.database;
    const result = await db.query(
      `
        INSERT INTO parents (
          full_name,
          phone,
          email,
          occupation,
          address,
          relationship
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `,
      [
        payload.fullName || payload.full_name,
        payload.phone || null,
        payload.email || null,
        payload.occupation || null,
        payload.address || null,
        payload.relationship || 'GUARDIAN',
      ]
    );

    return result.rows[0];
  }

  async update(id, payload, client = null) {
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
      return this.findById(id, db);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await db.query(
      `
        UPDATE parents
        SET ${fields.join(', ')}
        WHERE id = $${index}
          AND deleted_at IS NULL
        RETURNING *
      `,
      values
    );

    return result.rows[0] || null;
  }

  async softDelete(id, client = null) {
    const db = client || this.database;
    const result = await db.query(
      `
        UPDATE parents
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

  async findStudentsByParentId(parentId, client = null) {
    const db = client || this.database;
    const result = await db.query(
      `
        SELECT
          s.id,
          s.admission_number,
          s.first_name,
          s.last_name,
          s.gender,
          s.date_of_birth,
          s.admission_date,
          s.status,
          s.email,
          s.phone,
          s.section_id,
          sec.name AS section_name,
          g.id AS grade_id,
          g.name AS grade_name
        FROM students s
        LEFT JOIN sections sec ON sec.id = s.section_id AND sec.deleted_at IS NULL
        LEFT JOIN grades g ON g.id = sec.grade_id AND g.deleted_at IS NULL
        WHERE s.parent_id = $1
          AND s.deleted_at IS NULL
        ORDER BY s.first_name ASC, s.last_name ASC
      `,
      [parentId]
    );

    return result.rows;
  }
}

module.exports = ParentRepository;
