class DepartmentRepository {
  constructor(database) {
    this.database = database;
  }

  async findAll({ search, type, status, schoolId } = {}) {
    let query = `
      SELECT
        d.id,
        d.school_id,
        d.name,
        d.code,
        d.type,
        d.hod_teacher_id,
        d.budget,
        d.description,
        d.status,
        d.created_at,
        d.updated_at,
        CONCAT(u.first_name, ' ', u.last_name) AS hod_name,
        u.email AS hod_email,
        u.phone AS hod_phone,
        (
          SELECT COUNT(*)::int
          FROM teachers t
          WHERE t.department_id = d.id AND t.deleted_at IS NULL
        ) AS teacher_count
      FROM departments d
      LEFT JOIN teachers t_hod ON t_hod.id = d.hod_teacher_id
      LEFT JOIN users u ON u.id = t_hod.user_id
      WHERE d.deleted_at IS NULL
    `;
    const params = [];

    if (schoolId) {
      params.push(schoolId);
      query += ` AND d.school_id = $${params.length}`;
    }

    if (type && type !== 'ALL') {
      params.push(type);
      query += ` AND d.type = $${params.length}`;
    }

    if (status && status !== 'ALL') {
      params.push(status);
      query += ` AND d.status = $${params.length}`;
    }

    if (search) {
      params.push(`%${search.trim()}%`);
      query += ` AND (d.name ILIKE $${params.length} OR d.code ILIKE $${params.length} OR d.description ILIKE $${params.length})`;
    }

    query += ` ORDER BY d.type ASC, d.name ASC`;

    const result = await this.database.query(query, params);
    return result.rows;
  }

  async findById(id) {
    const result = await this.database.query(
      `
      SELECT
        d.id,
        d.school_id,
        d.name,
        d.code,
        d.type,
        d.hod_teacher_id,
        d.budget,
        d.description,
        d.status,
        d.created_at,
        d.updated_at,
        CONCAT(u.first_name, ' ', u.last_name) AS hod_name,
        u.email AS hod_email,
        u.phone AS hod_phone,
        (
          SELECT COUNT(*)::int
          FROM teachers t
          WHERE t.department_id = d.id AND t.deleted_at IS NULL
        ) AS teacher_count
      FROM departments d
      LEFT JOIN teachers t_hod ON t_hod.id = d.hod_teacher_id
      LEFT JOIN users u ON u.id = t_hod.user_id
      WHERE d.id = $1 AND d.deleted_at IS NULL
      LIMIT 1
      `,
      [id]
    );

    return result.rows[0] || null;
  }

  async create(payload) {
    const result = await this.database.query(
      `
      INSERT INTO departments (
        name, code, type, hod_teacher_id, budget, description, status, school_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
      `,
      [
        payload.name,
        payload.code.toUpperCase(),
        payload.type || 'ACADEMIC',
        payload.hodTeacherId || null,
        payload.budget || 0,
        payload.description || null,
        payload.status || 'ACTIVE',
        payload.schoolId || null,
      ]
    );

    return result.rows[0];
  }

  async update(id, payload) {
    const fields = [];
    const values = [];
    let idx = 1;

    const map = {
      name: 'name',
      code: 'code',
      type: 'type',
      hodTeacherId: 'hod_teacher_id',
      budget: 'budget',
      description: 'description',
      status: 'status',
    };

    Object.entries(payload).forEach(([k, v]) => {
      if (v !== undefined && map[k]) {
        fields.push(`${map[k]} = $${idx}`);
        values.push(k === 'code' ? String(v).toUpperCase() : v);
        idx++;
      }
    });

    if (fields.length === 0) return this.findById(id);

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const result = await this.database.query(
      `
      UPDATE departments
      SET ${fields.join(', ')}
      WHERE id = $${idx} AND deleted_at IS NULL
      RETURNING *
      `,
      values
    );

    return result.rows[0] || null;
  }

  async delete(id) {
    // Unassign teachers first
    await this.database.query(
      `UPDATE teachers SET department_id = NULL WHERE department_id = $1`,
      [id]
    );

    const result = await this.database.query(
      `
      UPDATE departments
      SET deleted_at = CURRENT_TIMESTAMP, status = 'INACTIVE'
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING id
      `,
      [id]
    );

    return result.rows.length > 0;
  }

  async getHodCandidates(schoolId) {
    let query = `
      SELECT
        t.id AS teacher_id,
        t.user_id,
        CONCAT(u.first_name, ' ', u.last_name) AS name,
        u.email,
        u.phone,
        t.specialization,
        t.department_id,
        d.name AS current_department_name
      FROM teachers t
      INNER JOIN users u ON u.id = t.user_id
      LEFT JOIN departments d ON d.id = t.department_id
      WHERE t.deleted_at IS NULL AND u.deleted_at IS NULL AND u.status = 'ACTIVE'
    `;
    const params = [];
    if (schoolId) {
      params.push(schoolId);
      query += ` AND t.school_id = $1`;
    }
    query += ` ORDER BY u.first_name ASC, u.last_name ASC`;

    const result = await this.database.query(query, params);
    return result.rows;
  }

  async getDepartmentFaculty(departmentId) {
    const result = await this.database.query(
      `
      SELECT
        t.id AS teacher_id,
        t.user_id,
        CONCAT(u.first_name, ' ', u.last_name) AS name,
        u.email,
        u.phone,
        t.specialization,
        t.qualification,
        (
          SELECT string_agg(DISTINCT s.name, ', ')
          FROM teacher_subjects ts
          JOIN subjects s ON s.id = ts.subject_id
          WHERE ts.teacher_id = t.id AND ts.deleted_at IS NULL
        ) AS subjects_taught
      FROM teachers t
      INNER JOIN users u ON u.id = t.user_id
      WHERE t.department_id = $1 AND t.deleted_at IS NULL AND u.deleted_at IS NULL
      ORDER BY u.first_name ASC, u.last_name ASC
      `,
      [departmentId]
    );
    return result.rows;
  }

  async assignTeacherToDepartment(teacherId, departmentId) {
    const result = await this.database.query(
      `
      UPDATE teachers
      SET department_id = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND deleted_at IS NULL
      RETURNING id, department_id
      `,
      [departmentId, teacherId]
    );
    return result.rows[0] || null;
  }
}

module.exports = DepartmentRepository;
