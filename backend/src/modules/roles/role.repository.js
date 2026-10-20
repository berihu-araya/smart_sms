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
        (SELECT COUNT(*)::int FROM users u WHERE u.role_id = r.id AND u.deleted_at IS NULL) AS user_count,
        (SELECT COUNT(*)::int FROM role_permissions rp WHERE rp.role_id = r.id AND rp.can_view = true) AS active_permissions_count
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
        (SELECT COUNT(*)::int FROM users u WHERE u.role_id = r.id AND u.deleted_at IS NULL) AS user_count
      FROM roles r
      WHERE r.id = $1 AND r.deleted_at IS NULL
      LIMIT 1
      `,
      [id]
    );
    return result.rows[0] || null;
  }

  async create({ name, description }) {
    const result = await this.database.query(
      `
      INSERT INTO roles (name, description, created_at, updated_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
      `,
      [name.trim(), description || null]
    );
    const createdRole = result.rows[0];

    // Seed default baseline read permissions for this new role
    const defaultModules = [
      'students', 'teachers', 'attendance', 'marks', 'exams',
      'timetable', 'finance', 'library', 'transport', 'announcements',
      'reports', 'departments', 'roles_permissions', 'audit_logs', 'backups', 'settings'
    ];

    for (const mod of defaultModules) {
      await this.database.query(
        `
        INSERT INTO role_permissions (role_id, module, can_view, can_create, can_edit, can_delete, can_approve, can_export, scope)
        VALUES ($1, $2, false, false, false, false, false, false, 'SCHOOL')
        ON CONFLICT (role_id, module) DO NOTHING
        `,
        [createdRole.id, mod]
      );
    }

    return createdRole;
  }

  async delete(id) {
    const role = await this.findById(id);
    if (!role) {
      const error = new Error('Role not found');
      error.status = 404;
      throw error;
    }

    const protectedRoles = ['school admin', 'admin', 'super admin', 'teacher', 'student', 'parent', 'staff'];
    if (protectedRoles.includes(role.name.toLowerCase())) {
      const error = new Error(`Cannot delete system protected role '${role.name}'`);
      error.status = 403;
      throw error;
    }

    if (parseInt(role.user_count, 10) > 0) {
      const error = new Error(`Cannot delete role '${role.name}' because ${role.user_count} active user(s) are assigned to it`);
      error.status = 400;
      throw error;
    }

    await this.database.query(`DELETE FROM role_permissions WHERE role_id = $1`, [id]);
    const result = await this.database.query(
      `UPDATE roles SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id`,
      [id]
    );
    return result.rows.length > 0;
  }

  async getRolePermissions(roleId) {
    const result = await this.database.query(
      `
      SELECT
        rp.id,
        rp.role_id,
        rp.module,
        rp.can_view,
        rp.can_create,
        rp.can_edit,
        rp.can_delete,
        rp.can_approve,
        rp.can_export,
        rp.scope,
        rp.created_at,
        rp.updated_at
      FROM role_permissions rp
      WHERE rp.role_id = $1
      ORDER BY rp.module ASC
      `,
      [roleId]
    );

    return result.rows;
  }

  async updateRolePermissions(roleId, permissionsList) {
    if (!Array.isArray(permissionsList)) return [];

    const updated = [];
    for (const p of permissionsList) {
      const res = await this.database.query(
        `
        INSERT INTO role_permissions (
          role_id, module, can_view, can_create, can_edit, can_delete, can_approve, can_export, scope, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
        ON CONFLICT (role_id, module) DO UPDATE
        SET
          can_view = EXCLUDED.can_view,
          can_create = EXCLUDED.can_create,
          can_edit = EXCLUDED.can_edit,
          can_delete = EXCLUDED.can_delete,
          can_approve = EXCLUDED.can_approve,
          can_export = EXCLUDED.can_export,
          scope = EXCLUDED.scope,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
        `,
        [
          roleId,
          p.module,
          p.can_view ?? false,
          p.can_create ?? false,
          p.can_edit ?? false,
          p.can_delete ?? false,
          p.can_approve ?? false,
          p.can_export ?? false,
          p.scope || 'SCHOOL',
        ]
      );
      if (res.rows[0]) updated.push(res.rows[0]);
    }

    return updated;
  }
}

module.exports = RoleRepository;
