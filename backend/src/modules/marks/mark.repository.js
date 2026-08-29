class MarkRepository {
  constructor(database) {
    this.database = database;
  }

  async getMarksSheet(examId, subjectId, sectionId) {
    const result = await this.database.query(
      `
      SELECT
        s.id AS student_id,
        s.admission_number,
        s.first_name,
        s.last_name,
        s.gender,
        m.id AS mark_id,
        COALESCE(m.score, 0) AS score,
        COALESCE(m.is_absent, false) AS is_absent,
        m.remarks,
        m.updated_at AS marked_at
      FROM students s
      LEFT JOIN marks m
        ON m.student_id = s.id
        AND m.exam_id = $1
        AND m.subject_id = $2
      WHERE s.section_id = $3
        AND s.deleted_at IS NULL
        AND s.status = 'ACTIVE'
      ORDER BY s.first_name ASC, s.last_name ASC
      `,
      [examId, subjectId, sectionId]
    );

    return result.rows;
  }

  async batchUpsertMarks({ examId, subjectId, sectionId, teacherId, marks }) {
    if (!marks || marks.length === 0) return [];

    const client = await this.database.connect();
    try {
      await client.query('BEGIN');

      const saved = [];

      for (const item of marks) {
        const result = await client.query(
          `
          INSERT INTO marks (
            exam_id,
            student_id,
            subject_id,
            section_id,
            teacher_id,
            score,
            is_absent,
            remarks,
            created_at,
            updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT (exam_id, student_id, subject_id)
          DO UPDATE SET
            score = EXCLUDED.score,
            is_absent = EXCLUDED.is_absent,
            remarks = EXCLUDED.remarks,
            section_id = EXCLUDED.section_id,
            teacher_id = COALESCE(EXCLUDED.teacher_id, marks.teacher_id),
            updated_at = CURRENT_TIMESTAMP
          RETURNING *
          `,
          [
            examId,
            item.studentId,
            subjectId,
            sectionId,
            teacherId || null,
            item.score,
            item.isAbsent,
            item.remarks || null,
          ]
        );
        saved.push(result.rows[0]);
      }

      await client.query('COMMIT');
      return saved;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getStudentMarks(studentId, { academicYearId = null } = {}) {
    const params = [studentId];
    let whereYear = '';

    if (academicYearId) {
      whereYear = 'AND e.academic_year_id = $2';
      params.push(academicYearId);
    }

    const result = await this.database.query(
      `
      SELECT
        m.id,
        m.score,
        m.is_absent,
        m.remarks,
        m.created_at,
        e.id AS exam_id,
        e.title AS exam_title,
        e.exam_type,
        e.weight_percentage,
        e.max_marks,
        e.term_or_semester,
        sub.id AS subject_id,
        sub.subject_name AS subject_name,
        sub.subject_code AS subject_code
      FROM marks m
      JOIN exams e ON e.id = m.exam_id
      JOIN subjects sub ON sub.id = m.subject_id
      WHERE m.student_id = $1
        AND e.deleted_at IS NULL
        ${whereYear}
      ORDER BY e.exam_date DESC, sub.subject_name ASC
      `,
      params
    );

    return result.rows;
  }
}

module.exports = MarkRepository;
