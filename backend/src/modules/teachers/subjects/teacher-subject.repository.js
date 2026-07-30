class TeacherSubjectRepository {

  constructor(database) {
    this.database = database;
  }

  async findAll({
    teacher_id,
    grade_id,
    section_id,
    academic_year_id,
    search = '',
    limit = 20,
    offset = 0,
  } = {}) {

    const conditions = ['ts.deleted_at IS NULL'];
    const values = [];
    let index = 1;

    if (search) {
      conditions.push(`
        (
          LOWER(t.first_name) LIKE LOWER($${index})
          OR LOWER(t.last_name) LIKE LOWER($${index})
          OR LOWER(s.subject_name) LIKE LOWER($${index})
        )
      `);

      values.push(`%${search.trim()}%`);
      index++;
    }

    if (teacher_id) {
      conditions.push(`ts.teacher_id = $${index}`);
      values.push(teacher_id);
      index++;
    }

    if (grade_id) {
      conditions.push(`ts.grade_id = $${index}`);
      values.push(grade_id);
      index++;
    }

    if (section_id) {
      conditions.push(`ts.section_id = $${index}`);
      values.push(section_id);
      index++;
    }

    if (academic_year_id) {
      conditions.push(`ts.academic_year_id = $${index}`);
      values.push(academic_year_id);
      index++;
    }

    values.push(limit);
    values.push(offset);

    const result = await this.database.query(
      `
      SELECT

        ts.id,

        ts.teacher_id,
        CONCAT(t.first_name, ' ', t.last_name) AS teacher_name,

        ts.subject_id,
        s.subject_name,
        s.subject_code,

        ts.grade_id,
        g.name AS grade_name,

        ts.section_id,
        sec.name AS section_name,

        ts.academic_year_id,
        ay.name AS academic_year_name,

        ts.start_date,
        ts.end_date,

        ts.status,

        ts.created_at,
        ts.updated_at

      FROM teacher_subjects ts

      INNER JOIN teachers t
        ON t.id = ts.teacher_id

      INNER JOIN subjects s
        ON s.id = ts.subject_id

      INNER JOIN grades g
        ON g.id = ts.grade_id

      INNER JOIN sections sec
        ON sec.id = ts.section_id

      INNER JOIN academic_years ay
        ON ay.id = ts.academic_year_id

      WHERE ${conditions.join(' AND ')}

      ORDER BY
        teacher_name,
        grade_name,
        section_name,
        subject_name

      LIMIT $${index}
      OFFSET $${index + 1}
      `,
      values
    );

    return result.rows;
  }

  async findById(id) {

    const result = await this.database.query(
      `
      SELECT
        ts.*,

        CONCAT(t.first_name,' ',t.last_name) AS teacher_name,
        s.subject_name,
        g.name AS grade_name,
        sec.name AS section_name,
        ay.name AS academic_year_name

      FROM teacher_subjects ts

      INNER JOIN teachers t
        ON t.id = ts.teacher_id

      INNER JOIN subjects s
        ON s.id = ts.subject_id

      INNER JOIN grades g
        ON g.id = ts.grade_id

      INNER JOIN sections sec
        ON sec.id = ts.section_id

      INNER JOIN academic_years ay
        ON ay.id = ts.academic_year_id

      WHERE
        ts.id = $1
        AND ts.deleted_at IS NULL

      LIMIT 1
      `,
      [id]
    );

    return result.rows[0] || null;
  }

  async create(payload) {

    const result = await this.database.query(
      `
      INSERT INTO teacher_subjects (

        teacher_id,
        subject_id,
        grade_id,
        section_id,
        academic_year_id,
        start_date,
        end_date,
        status

      )

      VALUES (

        $1,$2,$3,$4,$5,$6,$7,$8

      )

      RETURNING *
      `,
      [
        payload.teacher_id,
        payload.subject_id,
        payload.grade_id,
        payload.section_id,
        payload.academic_year_id,
        payload.start_date,
        payload.end_date,
        payload.status,
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
      UPDATE teacher_subjects

      SET ${fields.join(', ')}

      WHERE
        id = $${index}
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
      UPDATE teacher_subjects

      SET
        deleted_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP

      WHERE
        id = $1
        AND deleted_at IS NULL

      RETURNING *
      `,
      [id]
    );

    return result.rows[0] || null;
  }

  async assignmentExists(
    teacher_id,
    subject_id,
    grade_id,
    section_id,
    academic_year_id
  ) {

    const result = await this.database.query(
      `
      SELECT id

      FROM teacher_subjects

      WHERE

        teacher_id = $1
        AND subject_id = $2
        AND grade_id = $3
        AND section_id = $4
        AND academic_year_id = $5
        AND deleted_at IS NULL

      LIMIT 1
      `,
      [
        teacher_id,
        subject_id,
        grade_id,
        section_id,
        academic_year_id,
      ]
    );

    return result.rows[0] || null;
  }

  async teacherExists(id) {
    const result = await this.database.query(
      `SELECT id FROM teachers WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
      [id]
    );

    return result.rows[0] || null;
  }

  async subjectExists(id) {
    const result = await this.database.query(
      `SELECT id FROM subjects WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
      [id]
    );

    return result.rows[0] || null;
  }

  async gradeExists(id) {
    const result = await this.database.query(
      `SELECT id FROM grades WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
      [id]
    );

    return result.rows[0] || null;
  }

  async sectionExists(id) {
    const result = await this.database.query(
      `SELECT id FROM sections WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
      [id]
    );

    return result.rows[0] || null;
  }

  async academicYearExists(id) {
    const result = await this.database.query(
      `SELECT id FROM academic_years WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
      [id]
    );

    return result.rows[0] || null;
  }

}

module.exports = TeacherSubjectRepository;