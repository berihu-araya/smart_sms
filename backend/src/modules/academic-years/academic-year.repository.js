class AcademicYearRepository {
  constructor(database) {
    this.database = database;
  }

  async findAll({ search = '', limit = 20, offset = 0 } = {}) {
    const searchPattern = `%${search.trim()}%`;

    const result = await this.database.query(
      `
        SELECT
          ay.id,
          ay.name,
          ay.start_date,
          ay.end_date,
          ay.is_active,
          ay.description,
          ay.status,
          ay.created_at,
          ay.updated_at
        FROM academic_years ay
        WHERE ay.deleted_at IS NULL
          AND (
            LOWER(ay.name) LIKE LOWER($1)
          )
        ORDER BY ay.start_date DESC
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
          ay.id,
          ay.name,
          ay.start_date,
          ay.end_date,
          ay.is_active,
          ay.description,
          ay.status,
          ay.created_at,
          ay.updated_at
        FROM academic_years ay
        WHERE ay.id = $1
          AND ay.deleted_at IS NULL
        LIMIT 1
      `,
      [id]
    );

    return result.rows[0] || null;
  }

  async findActive() {
    const result = await this.database.query(
      `
        SELECT
          ay.id,
          ay.name,
          ay.start_date,
          ay.end_date,
          ay.is_active,
          ay.description,
          ay.status,
          ay.created_at,
          ay.updated_at
        FROM academic_years ay
        WHERE ay.is_active = true
          AND ay.deleted_at IS NULL
          AND ay.status = 'ACTIVE'
        LIMIT 1
      `
    );

    return result.rows[0] || null;
  }

  async create(payload) {
    const result = await this.database.query(
      `
        INSERT INTO academic_years (name, start_date, end_date, description)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `,
      [payload.name, payload.startDate, payload.endDate, payload.description]
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
        UPDATE academic_years
        SET ${fields.join(', ')}
        WHERE id = $${index}
          AND deleted_at IS NULL
        RETURNING *
      `,
      values
    );

    return result.rows[0] || null;
  }

  async setActive(id) {
    // Deactivate all academic years first, then activate the specified one
    const result = await this.database.query(
      `
        UPDATE academic_years
        SET is_active = (id = $1),
            updated_at = CURRENT_TIMESTAMP
        WHERE deleted_at IS NULL
        RETURNING *
      `,
      [id]
    );

    return result.rows.find(row => row.id === id) || null;
  }

  async softDelete(id) {
    const result = await this.database.query(
      `
        UPDATE academic_years
        SET deleted_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP,
            is_active = false,
            status = 'INACTIVE'
        WHERE id = $1
          AND deleted_at IS NULL
        RETURNING *
      `,
      [id]
    );

    return result.rows[0] || null;
  }
}

module.exports = AcademicYearRepository;

