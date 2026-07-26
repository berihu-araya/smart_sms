class GradeRepository {
  constructor(database) {
    this.database = database;
  }

  async findAll({ search = '', limit = 20, offset = 0 } = {}) {
    const searchPattern = `%${search.trim()}%`;

    const result = await this.database.query(
      `
        SELECT
          g.id,
          g.name,
          g.description,
          g.created_at,
          g.updated_at,
          (SELECT COUNT(*)::int FROM sections s WHERE s.grade_id = g.id AND s.deleted_at IS NULL) AS section_count
        FROM grades g
        WHERE g.deleted_at IS NULL
          AND (
            LOWER(g.name) LIKE LOWER($1)
          )
        ORDER BY g.name ASC
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
          g.id,
          g.name,
          g.description,
          g.created_at,
          g.updated_at,
          (SELECT COUNT(*)::int FROM sections s WHERE s.grade_id = g.id AND s.deleted_at IS NULL) AS section_count
        FROM grades g
        WHERE g.id = $1
          AND g.deleted_at IS NULL
        LIMIT 1
      `,
      [id]
    );

    return result.rows[0] || null;
  }

  async create(payload) {
    const result = await this.database.query(
      `
        INSERT INTO grades (name, description)
        VALUES ($1, $2)
        RETURNING *
      `,
      [payload.name, payload.description]
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
        UPDATE grades
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
}

module.exports = GradeRepository;

