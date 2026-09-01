class UnitRepository {
  constructor(database) {
    this.database = database;
  }

  async findAll({ search = '', status = 'active', limit = 20, offset = 0 } = {}) {
    const searchPattern = `%${search.trim()}%`;
    const conditions = ['u.deleted_at IS NULL'];
    const values = [searchPattern];
    let index = 2;

    if (status === 'active') {
      conditions.push('u.status = $2');
      values.push('ACTIVE');
      index += 1;
    } else if (status === 'inactive') {
      conditions.push('u.status = $2');
      values.push('INACTIVE');
      index += 1;
    }

    values.push(limit, offset);

    const result = await this.database.query(
      `
        SELECT
          u.id,
          u.name,
          u.description,
          u.status,
          u.created_at,
          u.updated_at,
          (
            SELECT COUNT(*)::int
            FROM unit_classes uc
            WHERE uc.unit_id = u.id
              AND uc.deleted_at IS NULL
              AND uc.status = 'ACTIVE'
          ) AS class_count
        FROM units u
        WHERE (
          LOWER(u.name) LIKE LOWER($1)
          OR LOWER(COALESCE(u.description, '')) LIKE LOWER($1)
        )
          AND ${conditions.join(' AND ')}
        ORDER BY u.name ASC
        LIMIT $${index} OFFSET $${index + 1}
      `,
      values
    );

    return result.rows;
  }

  async findById(id) {
    const result = await this.database.query(
      `
        SELECT
          u.id,
          u.name,
          u.description,
          u.status,
          u.created_at,
          u.updated_at,
          (
            SELECT COUNT(*)::int
            FROM unit_classes uc
            WHERE uc.unit_id = u.id
              AND uc.deleted_at IS NULL
              AND uc.status = 'ACTIVE'
          ) AS class_count
        FROM units u
        WHERE u.id = $1
          AND u.deleted_at IS NULL
        LIMIT 1
      `,
      [id]
    );

    return result.rows[0] || null;
  }

  async findByName(name, excludeId = null) {
    const values = [name.trim()];
    let clause = '';

    if (excludeId) {
      values.push(excludeId);
      clause = 'AND u.id != $2';
    }

    const result = await this.database.query(
      `
        SELECT id, name
        FROM units u
        WHERE LOWER(u.name) = LOWER($1)
          AND u.deleted_at IS NULL
          ${clause}
        LIMIT 1
      `,
      values
    );

    return result.rows[0] || null;
  }

  async create(payload) {
    const result = await this.database.query(
      `
        INSERT INTO units (name, description, status)
        VALUES ($1, $2, $3)
        RETURNING *
      `,
      [payload.name, payload.description || null, payload.status || 'ACTIVE']
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

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const result = await this.database.query(
      `
        UPDATE units
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
        UPDATE units
        SET deleted_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP,
            status = 'INACTIVE'
        WHERE id = $1
          AND deleted_at IS NULL
        RETURNING *
      `,
      [id]
    );

    return result.rows[0] || null;
  }

  async classAssignmentExists({ unit_id, section_id, academic_year_id }) {
    const result = await this.database.query(
      `
        SELECT id
        FROM unit_classes
        WHERE unit_id = $1
          AND section_id = $2
          AND academic_year_id = $3
          AND deleted_at IS NULL
          AND status = 'ACTIVE'
        LIMIT 1
      `,
      [unit_id, section_id, academic_year_id]
    );

    return result.rows[0] || null;
  }

  async listClassesForUnit(unitId) {
    const result = await this.database.query(
      `
        SELECT
          uc.id,
          uc.unit_id,
          uc.section_id,
          sec.name AS section_name,
          g.name AS grade_name,
          uc.academic_year_id,
          ay.name AS academic_year_name,
          uc.status,
          uc.created_at,
          uc.updated_at
        FROM unit_classes uc
        INNER JOIN sections sec ON sec.id = uc.section_id
        INNER JOIN grades g ON g.id = sec.grade_id
        INNER JOIN academic_years ay ON ay.id = uc.academic_year_id
        WHERE uc.unit_id = $1
          AND uc.deleted_at IS NULL
        ORDER BY grade_name ASC, section_name ASC
      `,
      [unitId]
    );

    return result.rows;
  }

  async assignClassToUnit(payload) {
    const result = await this.database.query(
      `
        INSERT INTO unit_classes (unit_id, section_id, academic_year_id, status)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `,
      [payload.unit_id, payload.section_id, payload.academic_year_id, payload.status || 'ACTIVE']
    );

    return result.rows[0];
  }

  async deactivateClassAssignment(id) {
    const result = await this.database.query(
      `
        UPDATE unit_classes
        SET deleted_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP,
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

module.exports = UnitRepository;
