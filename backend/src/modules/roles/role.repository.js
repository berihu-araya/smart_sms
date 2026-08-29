class RoleRepository {
  constructor(database) {
    this.database = database;
  }

  async findAll() {
    const result = await this.database.query(
      `
      SELECT
        r.id,
        r.name,
        r.description,
        r.created_at,
        r.updated_at,
        (SELECT COUNT(*) FROM users u WHERE u.role_id = r.id AND u.deleted_at IS NULL) AS user_count
      FROM roles r
      WHERE r.deleted_at IS NULL
      ORDER BY r.name ASC
      `
    );
    return result.rows;
  }

  async findById(id) {
    const result = await this.database.query(
      `
      SELECT
        r.id,
        r.name,
        r.description,
        r.created_at,
        r.updated_at,
        (SELECT COUNT(*) FROM users u WHERE u.role_id = r.id AND u.deleted_at IS NULL) AS user_count
      FROM roles r
      WHERE r.id = $1 AND r.deleted_at IS NULL
      LIMIT 1
      `,
      [id]
    );
    return result.rows[0] || null;
  }
}

module.exports = RoleRepository;
