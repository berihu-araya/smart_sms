class ClassTeacherRepository {
  constructor(database) {
    this.database = database;
  }

  async findTeacherById(id) {
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

  async findSectionById(id) {
    const result = await this.database.query(
      `
        SELECT id, name, grade_id
        FROM sections
        WHERE id = $1 AND deleted_at IS NULL
        LIMIT 1
      `,
      [id]
    );

    return result.rows[0] || null;
  }

  async findAcademicYearById(id) {
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

  async findActiveAssignment({ academic_year_id, section_id }) {
    const result = await this.database.query(
      `
        SELECT id, teacher_id, section_id, academic_year_id, status
        FROM class_teachers
        WHERE academic_year_id = $1
          AND section_id = $2
          AND deleted_at IS NULL
          AND status = 'ACTIVE'
        LIMIT 1
      `,
      [academic_year_id, section_id]
    );

    return result.rows[0] || null;
  }

  async create(payload) {
    const today = new Date().toISOString().split('T')[0];
    const result = await this.database.query(
      `
        INSERT INTO class_teachers (teacher_id, section_id, academic_year_id, status, assignment_date, end_date)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `,
      [
        payload.teacher_id,
        payload.section_id,
        payload.academic_year_id,
        payload.status || 'ACTIVE',
        payload.assignment_date || today,
        payload.end_date || null,
      ]
    );

    return result.rows[0];
  }

  async deactivateExisting(id) {
    const result = await this.database.query(
      `
        UPDATE class_teachers
        SET status = 'INACTIVE',
            end_date = CURRENT_DATE,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
          AND deleted_at IS NULL
        RETURNING *
      `,
      [id]
    );

    return result.rows[0] || null;
  }

  async listAssignments({ search = '', section_id, academic_year_id, teacher_id, status = 'ACTIVE', limit = 20, offset = 0 }) {
    const values = [status];
    const conditions = ['ct.status = $1'];
    let index = 2;

    if (search) {
      conditions.push(`(LOWER(CONCAT(t.first_name, ' ', t.last_name)) LIKE LOWER($${index}) OR LOWER(sec.name) LIKE LOWER($${index}))`);
      values.push(`%${search}%`);
      index += 1;
    }

    if (section_id) {
      conditions.push(`ct.section_id = $${index}`);
      values.push(section_id);
      index += 1;
    }

    if (academic_year_id) {
      conditions.push(`ct.academic_year_id = $${index}`);
      values.push(academic_year_id);
      index += 1;
    }

    if (teacher_id) {
      conditions.push(`ct.teacher_id = $${index}`);
      values.push(teacher_id);
      index += 1;
    }

    values.push(limit, offset);

    const result = await this.database.query(
      `
        SELECT
          ct.id,
          ct.teacher_id,
          CONCAT(t.first_name, ' ', t.last_name) AS teacher_name,
          ct.section_id,
          sec.name AS section_name,
          g.name AS grade_name,
          ct.academic_year_id,
          ay.name AS academic_year_name,
          ct.status,
          ct.assignment_date,
          ct.end_date,
          ct.created_at,
          ct.updated_at
        FROM class_teachers ct
        INNER JOIN teachers t ON t.id = ct.teacher_id
        INNER JOIN sections sec ON sec.id = ct.section_id
        INNER JOIN grades g ON g.id = sec.grade_id
        INNER JOIN academic_years ay ON ay.id = ct.academic_year_id
        WHERE ${conditions.join(' AND ')}
        ORDER BY ay.name DESC, sec.name ASC
        LIMIT $${index} OFFSET $${index + 1}
      `,
      values
    );

    return result.rows;
  }

  async getActiveClassTeacherForSection(sectionId) {
    const result = await this.database.query(
      `
        SELECT
          ct.id,
          ct.teacher_id,
          CONCAT(t.first_name, ' ', t.last_name) AS teacher_name,
          sec.name AS section_name,
          ay.name AS academic_year_name,
          ct.assignment_date
        FROM class_teachers ct
        INNER JOIN teachers t ON t.id = ct.teacher_id
        INNER JOIN sections sec ON sec.id = ct.section_id
        INNER JOIN academic_years ay ON ay.id = ct.academic_year_id
        WHERE ct.section_id = $1
          AND ct.deleted_at IS NULL
          AND ct.status = 'ACTIVE'
        ORDER BY ct.assignment_date DESC
        LIMIT 1
      `,
      [sectionId]
    );

    return result.rows[0] || null;
  }
}

module.exports = ClassTeacherRepository;
