class SectionRepository {
  constructor(database) {
    this.database = database;
  }

  async findAll({ search = '', limit = 20, offset = 0 } = {}) {
    const searchPattern = `%${search.trim()}%`;

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
        WHERE sec.deleted_at IS NULL
          AND (
            LOWER(sec.name) LIKE LOWER($1)
            OR LOWER(sec.room_number) LIKE LOWER($1)
            OR LOWER(g.name) LIKE LOWER($1)
          )
        ORDER BY g.name ASC, sec.name ASC
        LIMIT $2 OFFSET $3
      `,
      [searchPattern, limit, offset]
    );

    return result.rows;
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
          g.name AS grade_name,
          g.description AS grade_description,
          (SELECT COUNT(*)::int FROM students s WHERE s.section_id = sec.id AND s.deleted_at IS NULL) AS student_count
        FROM sections sec
        LEFT JOIN grades g ON g.id = sec.grade_id AND g.deleted_at IS NULL
        WHERE sec.id = $1
          AND sec.deleted_at IS NULL
        LIMIT 1
      `,
      [id]
    );

    return result.rows[0] || null;
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
      [payload.name, payload.gradeId, payload.roomNumber, payload.capacity]
    );

    return result.rows[0];
  }

  async update(id, payload) {
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
      return this.findById(id);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await this.database.query(
      `
        UPDATE sections
        SET ${fields.join(', ')}
        WHERE id = $${index}
          AND deleted_at IS NULL
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
}

module.exports = SectionRepository;

