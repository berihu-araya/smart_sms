class UserRepository {
  constructor(database) {
    this.database = database;
  }

  async findAll({ search = '', roleId = null, limit = 50, offset = 0 } = {}) {
    const params = [`%${search.trim()}%`];
    let where = `WHERE u.deleted_at IS NULL AND (LOWER(u.first_name) LIKE LOWER($1) OR LOWER(u.last_name) LIKE LOWER($1) OR LOWER(u.email) LIKE LOWER($1))`;
    let index = 2;

    if (roleId) {
      where += ` AND u.role_id = $${index}`;
      params.push(roleId);
      index++;
    }

    params.push(limit, offset);

    const result = await this.database.query(
      `
      SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.phone,
        u.status,
        u.profile_image,
        u.last_login,
        u.created_at,
        u.updated_at,
        r.id AS role_id,
        r.name AS role_name
      FROM users u
      LEFT JOIN roles r ON r.id = u.role_id
      ${where}
      ORDER BY u.created_at DESC
      LIMIT $${index} OFFSET $${index + 1}
      `,
      params
    );

    return result.rows;
  }

  async findById(id) {
    const result = await this.database.query(
      `
      SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.phone,
        u.status,
        u.profile_image,
        u.last_login,
        u.created_at,
        u.updated_at,
        r.id AS role_id,
        r.name AS role_name
      FROM users u
      LEFT JOIN roles r ON r.id = u.role_id
      WHERE u.id = $1 AND u.deleted_at IS NULL
      LIMIT 1
      `,
      [id]
    );
    return result.rows[0] || null;
  }

  async update(id, payload) {
    const fields = [];
    const values = [];
    let index = 1;

    const columnMap = {
      firstName: 'first_name',
      lastName: 'last_name',
      email: 'email',
      phone: 'phone',
      roleId: 'role_id',
      status: 'status',
    };

    Object.entries(payload).forEach(([key, val]) => {
      if (val !== undefined && columnMap[key]) {
        fields.push(`${columnMap[key]} = $${index}`);
        values.push(val);
        index++;
      }
    });

    if (fields.length === 0) return this.findById(id);

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const result = await this.database.query(
      `
      UPDATE users
      SET ${fields.join(', ')}
      WHERE id = $${index} AND deleted_at IS NULL
      RETURNING id, first_name, last_name, email, phone, status, role_id, updated_at
      `,
      values
    );

    return result.rows[0] || null;
  }

  async updateStatus(id, status) {
    const result = await this.database.query(
      `
      UPDATE users
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND deleted_at IS NULL
      RETURNING id, first_name, last_name, status
      `,
      [status, id]
    );
    return result.rows[0] || null;
  }

  async resetPassword(id, passwordHash) {
    const result = await this.database.query(
      `
      UPDATE users
      SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND deleted_at IS NULL
      RETURNING id, email
      `,
      [passwordHash, id]
    );
    return result.rows[0] || null;
  }

  async softDelete(id) {
    const result = await this.database.query(
      `
      UPDATE users
      SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP, status = 'INACTIVE'
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING id
      `,
      [id]
    );
    return result.rows[0] || null;
  }
}

module.exports = UserRepository;
