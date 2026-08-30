class ExamRepository {
  constructor(database) {
    this.database = database;
  }

  async findAll({ search = '', academicYearId = null, gradeId = null, teacherId = null, limit = 50, offset = 0 } = {}) {
    const params = [`%${search.trim()}%`];
    let whereClause = `WHERE e.deleted_at IS NULL AND (LOWER(e.title) LIKE LOWER($1) OR LOWER(e.term_or_semester) LIKE LOWER($1))`;
    let index = 2;

    if (academicYearId) {
      whereClause += ` AND e.academic_year_id = $${index}`;
      params.push(academicYearId);
      index++;
    }

    if (gradeId) {
      whereClause += ` AND e.grade_id = $${index}`;
      params.push(gradeId);
      index++;
    }

    if (teacherId) {
      whereClause += ` AND EXISTS (
        SELECT 1 FROM teacher_subjects ts
        WHERE ts.teacher_id = $${index}
          AND ts.deleted_at IS NULL
          AND ts.grade_id = e.grade_id
          AND ts.subject_id = e.subject_id
      )`;
      params.push(teacherId);
      index++;
    }

    params.push(limit, offset);

    const result = await this.database.query(
      `
      SELECT
        e.id,
        e.title,
        e.term_or_semester,
        e.exam_type,
        e.weight_percentage,
        e.max_marks,
        e.exam_date,
        e.is_published,
        e.description,
        e.created_at,
        e.updated_at,
        g.name AS grade_name,
        sub.subject_name AS subject_name,
        ay.name AS academic_year_name,
        (SELECT COUNT(*) FROM marks m WHERE m.exam_id = e.id) AS marks_entered_count
      FROM exams e
      LEFT JOIN grades g ON g.id = e.grade_id
      LEFT JOIN subjects sub ON sub.id = e.subject_id
      LEFT JOIN academic_years ay ON ay.id = e.academic_year_id
      ${whereClause}
      ORDER BY e.created_at DESC
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
        e.*,
        g.name AS grade_name,
        sub.subject_name AS subject_name,
        ay.name AS academic_year_name
      FROM exams e
      LEFT JOIN grades g ON g.id = e.grade_id
      LEFT JOIN subjects sub ON sub.id = e.subject_id
      LEFT JOIN academic_years ay ON ay.id = e.academic_year_id
      WHERE e.id = $1
        AND e.deleted_at IS NULL
      LIMIT 1
      `,
      [id]
    );

    return result.rows[0] || null;
  }

  async create(payload) {
    const result = await this.database.query(
      `
      INSERT INTO exams (
        title,
        term_or_semester,
        exam_type,
        weight_percentage,
        max_marks,
        exam_date,
        grade_id,
        subject_id,
        academic_year_id,
        is_published,
        description,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
      `,
      [
        payload.title,
        payload.termOrSemester,
        payload.examType,
        payload.weightPercentage,
        payload.maxMarks,
        payload.examDate,
        payload.gradeId,
        payload.subjectId,
        payload.academicYearId,
        payload.isPublished,
        payload.description,
      ]
    );

    return result.rows[0];
  }

  async update(id, payload) {
    const fields = [];
    const values = [];
    let index = 1;

    const columnMap = {
      title: 'title',
      termOrSemester: 'term_or_semester',
      examType: 'exam_type',
      weightPercentage: 'weight_percentage',
      maxMarks: 'max_marks',
      examDate: 'exam_date',
      gradeId: 'grade_id',
      subjectId: 'subject_id',
      academicYearId: 'academic_year_id',
      isPublished: 'is_published',
      description: 'description',
    };

    Object.entries(payload).forEach(([key, val]) => {
      if (val !== undefined && columnMap[key]) {
        fields.push(`${columnMap[key]} = $${index}`);
        values.push(val);
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
      UPDATE exams
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
      UPDATE exams
      SET deleted_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
        AND deleted_at IS NULL
      RETURNING *
      `,
      [id]
    );

    return result.rows[0] || null;
  }
}

module.exports = ExamRepository;
