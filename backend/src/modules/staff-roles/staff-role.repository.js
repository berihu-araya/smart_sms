class StaffRoleRepository {
  constructor(database) {
    this.database = database;
  }

  // Get a role by ID
  async getRoleById(id) {
    const result = await this.database.query(
      `
        SELECT id, name, scope_type, description, status
        FROM staff_roles
        WHERE id = $1 AND deleted_at IS NULL
        LIMIT 1
      `,
      [id]
    );

    return result.rows[0] || null;
  }

  // Get a teacher by ID
  async getTeacherById(id) {
    const result = await this.database.query(
      `
        SELECT id, first_name, last_name, status
        FROM teachers
        WHERE id = $1 AND deleted_at IS NULL
        LIMIT 1
      `,
      [id]
    );

    return result.rows[0] || null;
  }

  // Get an academic year by ID
  async getAcademicYearById(id) {
    const result = await this.database.query(
      `
        SELECT id, name, status
        FROM academic_years
        WHERE id = $1 AND deleted_at IS NULL
        LIMIT 1
      `,
      [id]
    );

    return result.rows[0] || null;
  }

  // Find active assignment based on scope-aware filters
  async findActiveAssignment(filters) {
    let query = `
      SELECT id, staff_role_id, teacher_id, academic_year_id, unit_id, section_id, status
      FROM staff_role_assignments
      WHERE deleted_at IS NULL
        AND status = 'ACTIVE'
        AND staff_role_id = $1
        AND academic_year_id = $2
    `;
    const params = [filters.staff_role_id, filters.academic_year_id];

    // Add scope-specific filters
    if (filters.unit_id) {
      query += ` AND unit_id = $${params.length + 1}`;
      params.push(filters.unit_id);
    }

    if (filters.section_id) {
      query += ` AND section_id = $${params.length + 1}`;
      params.push(filters.section_id);
    }

    query += ` LIMIT 1`;

    const result = await this.database.query(query, params);
    return result.rows[0] || null;
  }

  // Create a new assignment
  async createAssignment(payload) {
    const result = await this.database.query(
      `
        INSERT INTO staff_role_assignments 
          (staff_role_id, teacher_id, academic_year_id, unit_id, section_id, status, assignment_date, end_date)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `,
      [
        payload.staff_role_id,
        payload.teacher_id,
        payload.academic_year_id,
        payload.unit_id || null,
        payload.section_id || null,
        payload.status || 'ACTIVE',
        payload.assignment_date || new Date(),
        payload.end_date || null,
      ]
    );

    return result.rows[0];
  }

  // List all staff roles
  async findAllRoles(filters = {}) {
    let query = `
      SELECT id, name, scope_type, description, status
      FROM staff_roles
      WHERE deleted_at IS NULL
    `;
    const params = [];

    if (filters.status) {
      query += ` AND status = $${params.length + 1}`;
      params.push(filters.status);
    }

    query += ` ORDER BY name ASC`;

    const result = await this.database.query(query, params);
    return result.rows;
  }

  // List all assignments with optional filters
  async findAllAssignments(filters = {}) {
    let query = `
      SELECT 
        sra.id,
        sra.staff_role_id,
        sra.teacher_id,
        sra.academic_year_id,
        sra.unit_id,
        sra.section_id,
        sra.status,
        sra.assignment_date,
        sra.end_date,
        sr.name as role_name,
        sr.scope_type,
        t.first_name,
        t.last_name,
        ay.name as academic_year_name,
        u.name as unit_name,
        s.name as section_name,
        g.name as grade_name
      FROM staff_role_assignments sra
      LEFT JOIN staff_roles sr ON sra.staff_role_id = sr.id
      LEFT JOIN teachers t ON sra.teacher_id = t.id
      LEFT JOIN academic_years ay ON sra.academic_year_id = ay.id
      LEFT JOIN units u ON sra.unit_id = u.id
      LEFT JOIN sections s ON sra.section_id = s.id
      LEFT JOIN grades g ON s.grade_id = g.id
      WHERE sra.deleted_at IS NULL
    `;
    const params = [];

    if (filters.role_id || filters.roleId) {
      query += ` AND sra.staff_role_id = $${params.length + 1}`;
      params.push(filters.role_id || filters.roleId);
    }

    if (filters.academic_year_id || filters.academicYearId) {
      query += ` AND sra.academic_year_id = $${params.length + 1}`;
      params.push(filters.academic_year_id || filters.academicYearId);
    }

    if (filters.teacher_id || filters.teacherId) {
      query += ` AND sra.teacher_id = $${params.length + 1}`;
      params.push(filters.teacher_id || filters.teacherId);
    }

    if (filters.status) {
      query += ` AND sra.status = $${params.length + 1}`;
      params.push(filters.status);
    }

    query += ` ORDER BY sra.assignment_date DESC, sra.created_at DESC`;

    const result = await this.database.query(query, params);
    return result.rows;
  }

  // Find assignments for a specific teacher
  async findAssignmentsByTeacher(teacherId) {
    const result = await this.database.query(
      `
        SELECT 
          sra.id,
          sra.staff_role_id,
          sra.teacher_id,
          sra.academic_year_id,
          sra.unit_id,
          sra.section_id,
          sra.status,
          sra.assignment_date,
          sra.end_date,
          sr.name as role_name,
          sr.scope_type,
          t.first_name,
          t.last_name,
          ay.name as academic_year_name,
          u.name as unit_name,
          s.name as section_name,
          g.name as grade_name
        FROM staff_role_assignments sra
        LEFT JOIN staff_roles sr ON sra.staff_role_id = sr.id
        LEFT JOIN teachers t ON sra.teacher_id = t.id
        LEFT JOIN academic_years ay ON sra.academic_year_id = ay.id
        LEFT JOIN units u ON sra.unit_id = u.id
        LEFT JOIN sections s ON sra.section_id = s.id
        LEFT JOIN grades g ON s.grade_id = g.id
        WHERE sra.teacher_id = $1 AND sra.deleted_at IS NULL
        ORDER BY sra.assignment_date DESC
      `,
      [teacherId]
    );

    return result.rows;
  }

  // Deactivate an assignment
  async deactivateAssignment(id) {
    const result = await this.database.query(
      `
        UPDATE staff_role_assignments
        SET status = 'INACTIVE',
            end_date = CURRENT_DATE,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING *
      `,
      [id]
    );

    return result.rows[0] || null;
  }

  // Soft delete an assignment
  async deleteAssignment(id) {
    const result = await this.database.query(
      `
        UPDATE staff_role_assignments
        SET deleted_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `,
      [id]
    );

    return result.rows[0] || null;
  }
}

module.exports = StaffRoleRepository;
