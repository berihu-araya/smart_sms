class ResultRepository {
  constructor(database) {
    this.database = database;
  }

  async getGradingScales() {
    const result = await this.database.query(
      `
      SELECT id, grade_letter, min_score, max_score, grade_point, description
      FROM grading_scales
      ORDER BY min_score DESC
      `
    );
    return result.rows;
  }

  async getSectionSubjects(sectionId) {
    const result = await this.database.query(
      `
      SELECT DISTINCT sub.id, sub.subject_name AS name, sub.subject_code AS code
      FROM subjects sub
      JOIN sections sec ON sec.id = $1
      JOIN grade_subjects gs ON gs.grade_id = sec.grade_id AND gs.subject_id = sub.id
      WHERE sub.deleted_at IS NULL
      ORDER BY sub.subject_name ASC
      `,
      [sectionId]
    );

    // If grade_subjects is empty, fallback to all active subjects
    if (result.rows.length === 0) {
      const fallback = await this.database.query(
        `SELECT id, subject_name AS name, subject_code AS code FROM subjects WHERE deleted_at IS NULL ORDER BY subject_name ASC`
      );
      return fallback.rows;
    }

    return result.rows;
  }

  async getSectionStudents(sectionId) {
    const result = await this.database.query(
      `
      SELECT
        s.id,
        s.admission_number,
        s.first_name,
        s.last_name,
        s.gender,
        sec.name AS section_name,
        g.name AS grade_name
      FROM students s
      JOIN sections sec ON sec.id = s.section_id
      LEFT JOIN grades g ON g.id = sec.grade_id
      WHERE s.section_id = $1
        AND s.deleted_at IS NULL
        AND s.status = 'ACTIVE'
      ORDER BY s.first_name ASC, s.last_name ASC
      `,
      [sectionId]
    );
    return result.rows;
  }

  async getSectionMarks(sectionId, { academicYearId = null, term = null } = {}) {
    const params = [sectionId];
    let whereClause = `WHERE m.section_id = $1 AND e.deleted_at IS NULL`;
    let index = 2;

    if (academicYearId) {
      whereClause += ` AND e.academic_year_id = $${index}`;
      params.push(academicYearId);
      index++;
    }

    if (term) {
      whereClause += ` AND LOWER(e.term_or_semester) = LOWER($${index})`;
      params.push(term);
      index++;
    }

    const result = await this.database.query(
      `
      SELECT
        m.student_id,
        m.subject_id,
        m.exam_id,
        m.score,
        m.is_absent,
        e.title AS exam_title,
        e.exam_type,
        e.weight_percentage,
        e.max_marks,
        e.term_or_semester,
        sub.subject_name AS subject_name,
        sub.subject_code AS subject_code
      FROM marks m
      JOIN exams e ON e.id = m.exam_id
      JOIN subjects sub ON sub.id = m.subject_id
      ${whereClause}
      `,
      params
    );

    return result.rows;
  }

  async getStudentReportCardData(studentId, { academicYearId = null, term = null } = {}) {
    const studentRes = await this.database.query(
      `
      SELECT
        s.id,
        s.admission_number,
        s.first_name,
        s.last_name,
        s.gender,
        s.date_of_birth,
        sec.id AS section_id,
        sec.name AS section_name,
        g.name AS grade_name,
        p.full_name AS parent_name,
        p.phone AS parent_phone
      FROM students s
      LEFT JOIN sections sec ON sec.id = s.section_id
      LEFT JOIN grades g ON g.id = sec.grade_id
      LEFT JOIN parents p ON p.id = s.parent_id
      WHERE s.id = $1
        AND s.deleted_at IS NULL
      LIMIT 1
      `,
      [studentId]
    );

    const student = studentRes.rows[0] || null;
    if (!student) return null;

    // Get attendance summary for this student
    const attendanceRes = await this.database.query(
      `
      SELECT
        COUNT(*) AS total_days,
        COUNT(*) FILTER (WHERE status = 'PRESENT') AS present_days,
        COUNT(*) FILTER (WHERE status = 'ABSENT') AS absent_days,
        COUNT(*) FILTER (WHERE status = 'LATE') AS late_days,
        COUNT(*) FILTER (WHERE status = 'EXCUSED') AS excused_days
      FROM attendance
      WHERE student_id = $1
        AND deleted_at IS NULL
      `,
      [studentId]
    );

    // Get school settings
    const settingsRes = await this.database.query(`SELECT * FROM settings LIMIT 1`);
    const school = settingsRes.rows[0] || {};

    // Get marks for this student
    const params = [studentId];
    let whereClause = `WHERE m.student_id = $1 AND e.deleted_at IS NULL`;
    let index = 2;

    if (academicYearId) {
      whereClause += ` AND e.academic_year_id = $${index}`;
      params.push(academicYearId);
      index++;
    }

    if (term) {
      whereClause += ` AND LOWER(e.term_or_semester) = LOWER($${index})`;
      params.push(term);
      index++;
    }

    const marksRes = await this.database.query(
      `
      SELECT
        m.score,
        m.is_absent,
        m.remarks,
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
      ${whereClause}
      ORDER BY sub.subject_name ASC, e.exam_date ASC
      `,
      params
    );

    return {
      student,
      school,
      attendance: attendanceRes.rows[0] || {},
      marks: marksRes.rows,
    };
  }
}

module.exports = ResultRepository;
