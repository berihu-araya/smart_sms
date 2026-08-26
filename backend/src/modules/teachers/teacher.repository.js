class TeacherRepository {
  constructor(database) {
    this.database = database;
  }

  async findAll({ search = '', limit = 20, offset = 0 } = {}) {
    const searchPattern = `%${search.trim()}%`;

    const result = await this.database.query(
      `
        SELECT
          t.id,
          t.employee_number,
          t.first_name,
          t.last_name,
          t.gender,
          t.date_of_birth,
          t.email,
          t.phone,
          t.address,
          t.qualification,
          t.designation,
          t.department,
          t.joining_date,
          t.status,
          t.created_at,
          t.updated_at
        FROM teachers t
        WHERE t.deleted_at IS NULL
          AND (
            LOWER(t.first_name) LIKE LOWER($1)
            OR LOWER(t.last_name) LIKE LOWER($1)
            OR LOWER(t.employee_number) LIKE LOWER($1)
            OR LOWER(t.department) LIKE LOWER($1)
            OR LOWER(t.designation) LIKE LOWER($1)
          )
        ORDER BY t.first_name ASC, t.last_name ASC
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
          t.id,
          t.user_id,
          t.employee_number,
          t.first_name,
          t.last_name,
          t.gender,
          t.date_of_birth,
          t.email,
          t.phone,
          t.address,
          t.qualification,
          t.designation,
          t.department,
          t.joining_date,
          t.status,
          t.created_at,
          t.updated_at
        FROM teachers t
        WHERE t.id = $1
          AND t.deleted_at IS NULL
        LIMIT 1
      `,
      [id]
    );

    return result.rows[0] || null;
  }

  async generateEmployeeNumber(client) {
    const activeYearResult = await client.query(
      `
        SELECT EXTRACT(YEAR FROM start_date)::integer AS start_year
        FROM academic_years
        WHERE is_active = true
          AND status = 'ACTIVE'
          AND deleted_at IS NULL
        LIMIT 1
      `
    );
    const startYear = activeYearResult.rows[0]?.start_year;

    if (!startYear) {
      const error = new Error('An active academic year is required to generate an employee number');
      error.code = 'ACTIVE_ACADEMIC_YEAR_REQUIRED';
      throw error;
    }

    await client.query(
      `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`,
      [`teacher-employee-number:${startYear}`]
    );

    const sequenceResult = await client.query(
      `
        SELECT COALESCE(
          MAX((substring(employee_number FROM '^TCH-([0-9]+)-'))::integer),
          0
        ) + 1 AS next_number
        FROM teachers
        WHERE employee_number ~ $1
      `,
      [`^TCH-[0-9]+-${startYear}/[0-9]{2}$`]
    );
    const sequenceNumber = sequenceResult.rows[0].next_number;
    const academicYear = `${startYear}/${String(startYear + 1).slice(-2)}`;

    return `TCH-${String(sequenceNumber).padStart(4, '0')}-${academicYear}`;
  }

  async create(payload, client = null) {
    const db = client || this.database;
    const result = await db.query(
      `
        INSERT INTO teachers (
          user_id,
          employee_number,
          first_name,
          last_name,
          gender,
          date_of_birth,
          email,
          phone,
          address,
          qualification,
          designation,
          department,
          joining_date,
          status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
      `,
      [
        payload.userId || null,
        payload.employeeNumber,
        payload.firstName,
        payload.lastName,
        payload.gender,
        payload.dateOfBirth || null,
        payload.email || null,
        payload.phone || null,
        payload.address || null,
        payload.qualification || null,
        payload.designation || null,
        payload.department || null,
        payload.joiningDate || null,
        payload.status || 'ACTIVE',
      ]
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
        UPDATE teachers
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
        UPDATE teachers
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

  async updateStatus(id, status) {
    const result = await this.database.query(
      `
        UPDATE teachers
        SET status = $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
          AND deleted_at IS NULL
        RETURNING *
      `,
      [status, id]
    );

    return result.rows[0] || null;
  }
}

module.exports = TeacherRepository;

