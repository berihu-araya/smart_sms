/**
 * Class Teacher Repository
 * Handles database operations for class teacher assignments
 */
class ClassTeacherRepository {
  constructor(database) {
    this.database = database;// this.database = database; this mean store the database object inside this repository so all methods can use it to perform queries
  }

  /**
   * Find all class teacher assignments with filters
   */
  async findAll({ // this function performs asynchronous work database queries to retrieve class teacher assignments based on various filters and search criteria. It constructs a dynamic SQL query based on the provided parameters, ensuring that only relevant records are fetched from the database.
    teacher_id,
    section_id,
    academic_year_id,
    status = 'ACTIVE',
    search = '',
    limit = 20,
    offset = 0,
  } = {}) {   // this function takes an object as an argument, which can contain various filters and options for retrieving class teacher assignments. The parameters have default values, so if they are not provided, the function will use the defaults.
    const conditions = ['ct.deleted_at IS NULL']; // this line initializes an array called conditions with a single condition that filters out any records that have been soft-deleted (i.e., where the deleted_at column is not null). This ensures that only active records are considered in the query.
    const values = []; // this line initializes an empty array called values, which will be used to store the values for the query parameters. These values will be substituted into the SQL query to prevent SQL injection and ensure safe querying.
    let index = 1;

    if (search) {
      conditions.push(`
        (
          LOWER(t.first_name) LIKE LOWER($${index})
          OR LOWER(t.last_name) LIKE LOWER($${index})
          OR LOWER(sec.name) LIKE LOWER($${index})
          OR LOWER(g.name) LIKE LOWER($${index})
        )
      `);
      values.push(`%${search.trim()}%`);
      index++;
    }

    if (teacher_id) {
      conditions.push(`ct.teacher_id = $${index}`);
      values.push(teacher_id);
      index++;
    }

    if (section_id) {
      conditions.push(`ct.section_id = $${index}`);
      values.push(section_id);
      index++;
    }

    if (academic_year_id) {
      conditions.push(`ct.academic_year_id = $${index}`);
      values.push(academic_year_id);
      index++;
    }

    if (status) {
      conditions.push(`ct.status = $${index}`);
      values.push(status);
      index++;
    }

    values.push(limit);
    values.push(offset);

    const result = await this.database.query(
      `
      SELECT
        ct.id,
        ct.teacher_id,
        CONCAT(t.first_name, ' ', t.last_name) AS teacher_name,
        t.employee_number,
        t.email,
        ct.section_id,
        sec.name AS section_name,
        g.name AS grade_name,
        ct.academic_year_id,
        ay.name AS academic_year_name,
        ct.start_date,
        ct.end_date,
        ct.status,
        ct.notes,
        ct.created_at,
        ct.updated_at
      FROM class_teachers ct
      INNER JOIN teachers t
        ON t.id = ct.teacher_id
      INNER JOIN sections sec
        ON sec.id = ct.section_id
      LEFT JOIN grades g
        ON g.id = sec.grade_id
      INNER JOIN academic_years ay
        ON ay.id = ct.academic_year_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY ay.name DESC, sec.name, teacher_name
      LIMIT $${index}
      OFFSET $${index + 1}
      `,
      values
    );

    return result.rows;
  }

  /**
   * Find class teacher assignment by ID
   */
  async findById(id) {
    const result = await this.database.query(
      `
      SELECT
        ct.id,
        ct.teacher_id,
        CONCAT(t.first_name, ' ', t.last_name) AS teacher_name,
        t.employee_number,
        t.email,
        ct.section_id,
        sec.name AS section_name,
        g.name AS grade_name,
        ct.academic_year_id,
        ay.name AS academic_year_name,
        ct.start_date,
        ct.end_date,
        ct.status,
        ct.notes,
        ct.created_at,
        ct.updated_at
      FROM class_teachers ct
      INNER JOIN teachers t
        ON t.id = ct.teacher_id
      INNER JOIN sections sec
        ON sec.id = ct.section_id
      LEFT JOIN grades g
        ON g.id = sec.grade_id
      INNER JOIN academic_years ay
        ON ay.id = ct.academic_year_id
      WHERE ct.id = $1 AND ct.deleted_at IS NULL
      LIMIT 1
      `,
      [id]
    );

    return result.rows[0] || null;
  }

  /**
   * Find active class teacher for a section in given academic year
   */
  async findActiveBySectionAndAcademicYear(section_id, academic_year_id) {
    const result = await this.database.query(
      `
      SELECT
        ct.id,
        ct.teacher_id,
        CONCAT(t.first_name, ' ', t.last_name) AS teacher_name,
        t.employee_number,
        t.email,
        ct.section_id,
        sec.name AS section_name,
        g.name AS grade_name,
        ct.academic_year_id,
        ay.name AS academic_year_name,
        ct.start_date,
        ct.end_date,
        ct.status,
        ct.notes,
        ct.created_at,
        ct.updated_at
      FROM class_teachers ct
      INNER JOIN teachers t
        ON t.id = ct.teacher_id
      INNER JOIN sections sec
        ON sec.id = ct.section_id
      LEFT JOIN grades g
        ON g.id = sec.grade_id
      INNER JOIN academic_years ay
        ON ay.id = ct.academic_year_id
      WHERE
        ct.section_id = $1
        AND ct.academic_year_id = $2
        AND ct.status = 'ACTIVE'
        AND ct.deleted_at IS NULL
      LIMIT 1
      `,
      [section_id, academic_year_id]
    );

    return result.rows[0] || null;
  }

  /**
   * Check if teacher is already assigned as class teacher in given academic year
   */
  async isTeacherAssignedAsClassTeacher(teacher_id, academic_year_id) {
    const result = await this.database.query(
      `
      SELECT id
      FROM class_teachers
      WHERE
        teacher_id = $1
        AND academic_year_id = $2
        AND status = 'ACTIVE'
        AND deleted_at IS NULL
      LIMIT 1
      `,
      [teacher_id, academic_year_id]
    );

    return result.rows[0] || null;
  }

  /**
   * Create new class teacher assignment
   */
  async create(payload) {
    const result = await this.database.query(
      `
      INSERT INTO class_teachers (
        teacher_id,
        section_id,
        academic_year_id,
        start_date,
        end_date,
        status,
        notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
      `,
      [
        payload.teacher_id,
        payload.section_id,
        payload.academic_year_id,
        payload.start_date,
        payload.end_date,
        payload.status || 'ACTIVE',
        payload.notes,
      ]
    );

    return result.rows[0];
  }

  /**
   * Update class teacher assignment
   */
  async update(id, payload) {
    const fields = [];
    const values = [];
    let index = 1;

    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = $${index}`);
        values.push(value);
        index++;
      }
    });

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const result = await this.database.query(
      `
      UPDATE class_teachers
      SET ${fields.join(', ')}
      WHERE id = $${index} AND deleted_at IS NULL
      RETURNING *
      `,
      values
    );

    return result.rows[0] || null;
  }

  /**
   * Soft delete class teacher assignment
   */
  async softDelete(id) {
    const result = await this.database.query(
      `
      UPDATE class_teachers
      SET
        deleted_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING *
      `,
      [id]
    );

    return result.rows[0] || null;
  }

  /**
   * Check if teacher exists
   */
  async teacherExists(id) {
    const result = await this.database.query(
      `SELECT id FROM teachers WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Check if section exists
   */
  async sectionExists(id) {
    const result = await this.database.query(
      `SELECT id FROM sections WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Check if academic year exists
   */
  async academicYearExists(id) {
    const result = await this.database.query(
      `SELECT id FROM academic_years WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Check if academic year is active
   */
  async academicYearIsActive(id) {
    const result = await this.database.query(
      `SELECT id FROM academic_years WHERE id = $1 AND is_active = true AND deleted_at IS NULL LIMIT 1`,
      [id]
    );
    return result.rows[0] || null;
  }
}

module.exports = ClassTeacherRepository;
