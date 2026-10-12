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

  async getSectionSubjects(sectionId, teacherId = null) {
    const params = [sectionId];
    let whereClause = 'WHERE sub.deleted_at IS NULL';
    let index = 2;

    if (teacherId) {
      whereClause += ` AND sub.id IN (
        SELECT ts.subject_id
        FROM teacher_subjects ts
        WHERE ts.teacher_id = $${index}
          AND ts.section_id = $1
          AND ts.deleted_at IS NULL
      )`;
      params.push(teacherId);
      index++;
    }

    const result = await this.database.query(
      `
      SELECT DISTINCT sub.id, sub.subject_name AS name, sub.subject_code AS code
      FROM subjects sub
      JOIN sections sec ON sec.id = $1
      JOIN grade_subjects gs ON gs.grade_id = sec.grade_id AND gs.subject_id = sub.id
      ${whereClause}
      ORDER BY sub.subject_name ASC
      `,
      params
    );

    // If grade_subjects is empty, fallback to all active subjects only for unrestricted queries.
    if (!teacherId && result.rows.length === 0) {
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

  async getSectionMarks(sectionId, { academicYearId = null, term = null, teacherId = null } = {}) {
    const params = [sectionId];
    let whereClause = `WHERE m.section_id = $1 AND e.deleted_at IS NULL`;
    let index = 2;

    if (academicYearId) {
      whereClause += ` AND e.academic_year_id = $${index}`;
      params.push(academicYearId);
      index++;
    }

    if (term && term !== 'all' && term !== 'All' && term !== 'ALL') {
      whereClause += ` AND (LOWER(e.term_or_semester) = LOWER($${index}) OR e.term_or_semester IS NULL)`;
      params.push(term);
      index++;
    }

    if (teacherId) {
      whereClause += ` AND m.subject_id IN (
        SELECT ts.subject_id
        FROM teacher_subjects ts
        WHERE ts.teacher_id = $${index}
          AND ts.section_id = $1
          AND ts.deleted_at IS NULL
      )`;
      params.push(teacherId);
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

  async getStudentReportCardData(studentId, { academicYearId = null, term = null, teacherId = null } = {}) {
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
        g.id AS grade_id,
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

    if (term && term !== 'all' && term !== 'All' && term !== 'ALL') {
      whereClause += ` AND (LOWER(e.term_or_semester) = LOWER($${index}) OR e.term_or_semester IS NULL)`;
      params.push(term);
      index++;
    }

    if (teacherId) {
      whereClause += ` AND m.subject_id IN (
        SELECT ts.subject_id
        FROM teacher_subjects ts
        WHERE ts.teacher_id = $${index}
          AND ts.section_id = $${index + 1}
          AND ts.deleted_at IS NULL
      )`;
      params.push(teacherId, student.section_id);
      index += 2;
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

  async getAcademicReportCohortData({
    academicYearId = null,
    gradeId = null,
    sectionId = null,
    term = null,
    accessibleSectionIds = null,
    teacherId = null,
  } = {}) {
    // 1. Build Student filter
    const studentParams = [];
    let studentWhere = 'WHERE s.deleted_at IS NULL AND s.status = \'ACTIVE\'';

    if (sectionId) {
      studentParams.push(sectionId);
      studentWhere += ` AND s.section_id = $${studentParams.length}`;
    } else if (gradeId) {
      studentParams.push(gradeId);
      studentWhere += ` AND sec.grade_id = $${studentParams.length}`;
    }

    if (accessibleSectionIds && accessibleSectionIds.length > 0) {
      studentParams.push(accessibleSectionIds);
      studentWhere += ` AND s.section_id = ANY($${studentParams.length}::uuid[])`;
    }

    const studentsPromise = this.database.query(
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
        g.id AS grade_id,
        g.name AS grade_name,
        p.full_name AS parent_name,
        p.phone AS parent_phone
      FROM students s
      JOIN sections sec ON sec.id = s.section_id
      JOIN grades g ON g.id = sec.grade_id
      LEFT JOIN parents p ON p.id = s.parent_id
      ${studentWhere}
      ORDER BY g.name ASC, sec.name ASC, s.first_name ASC, s.last_name ASC
      `,
      studentParams
    );

    // 2. Build Marks filter
    const marksParams = [];
    let marksWhere = 'WHERE e.deleted_at IS NULL';

    if (sectionId) {
      marksParams.push(sectionId);
      marksWhere += ` AND m.section_id = $${marksParams.length}`;
    } else if (gradeId) {
      marksParams.push(gradeId);
      marksWhere += ` AND sec.grade_id = $${marksParams.length}`;
    }

    if (accessibleSectionIds && accessibleSectionIds.length > 0) {
      marksParams.push(accessibleSectionIds);
      marksWhere += ` AND m.section_id = ANY($${marksParams.length}::uuid[])`;
    }

    if (academicYearId) {
      marksParams.push(academicYearId);
      marksWhere += ` AND e.academic_year_id = $${marksParams.length}`;
    }

    if (term && term !== 'all' && term !== 'All' && term !== 'ALL') {
      marksParams.push(term);
      marksWhere += ` AND (LOWER(e.term_or_semester) = LOWER($${marksParams.length}) OR e.term_or_semester IS NULL)`;
    }

    if (teacherId) {
      marksParams.push(teacherId);
      marksWhere += ` AND m.subject_id IN (
        SELECT ts.subject_id FROM teacher_subjects ts WHERE ts.teacher_id = $${marksParams.length} AND ts.deleted_at IS NULL
      )`;
    }

    const marksPromise = this.database.query(
      `
      SELECT
        m.student_id,
        m.subject_id,
        m.exam_id,
        m.score,
        m.is_absent,
        m.section_id,
        e.title AS exam_title,
        e.exam_type,
        e.weight_percentage,
        e.max_marks,
        e.term_or_semester,
        sub.subject_name,
        sub.subject_code
      FROM marks m
      JOIN exams e ON e.id = m.exam_id
      JOIN subjects sub ON sub.id = m.subject_id
      JOIN sections sec ON sec.id = m.section_id
      ${marksWhere}
      `,
      marksParams
    );

    // 3. Subjects list
    const subjectsPromise = this.database.query(
      `SELECT id, subject_name AS name, subject_code AS code FROM subjects WHERE deleted_at IS NULL ORDER BY subject_name ASC`
    );

    // 4. Grading scales
    const scalesPromise = this.getGradingScales();

    // 5. Sections list with grade info
    const sectionsPromise = this.database.query(
      `
      SELECT sec.id, sec.name, g.id AS grade_id, g.name AS grade_name
      FROM sections sec
      JOIN grades g ON g.id = sec.grade_id
      WHERE sec.deleted_at IS NULL
      ORDER BY g.name ASC, sec.name ASC
      `
    );

    // 6. Settings (school name, etc.)
    const settingsPromise = this.database.query(`SELECT * FROM settings LIMIT 1`);

    const [studentsRes, marksRes, subjectsRes, scalesRes, sectionsRes, settingsRes] = await Promise.all([
      studentsPromise,
      marksPromise,
      subjectsPromise,
      scalesPromise,
      sectionsPromise,
      settingsPromise,
    ]);

    return {
      students: studentsRes.rows,
      marks: marksRes.rows,
      subjects: subjectsRes.rows,
      gradingScales: scalesRes,
      sections: sectionsRes.rows,
      school: settingsRes.rows[0] || {},
    };
  }

  async getStudentAcademicAnalytics(studentId, { academicYearId = null, term = null } = {}) {
    const reportCardData = await this.getStudentReportCardData(studentId, { academicYearId, term });
    if (!reportCardData || !reportCardData.student) return null;

    const student = reportCardData.student;

    // Fetch cohort marks in the same section to compute section averages per subject
    let sectionMarks = [];
    if (student.section_id) {
      const secParams = [student.section_id];
      let secWhere = 'WHERE m.section_id = $1 AND e.deleted_at IS NULL';
      if (academicYearId) {
        secParams.push(academicYearId);
        secWhere += ` AND e.academic_year_id = $${secParams.length}`;
      }
      if (term && term !== 'all' && term !== 'All' && term !== 'ALL') {
        secParams.push(term);
        secWhere += ` AND (LOWER(e.term_or_semester) = LOWER($${secParams.length}) OR e.term_or_semester IS NULL)`;
      }

      const secRes = await this.database.query(
        `
        SELECT m.subject_id, m.score, m.is_absent, e.max_marks, e.weight_percentage
        FROM marks m
        JOIN exams e ON e.id = m.exam_id
        ${secWhere}
        `,
        secParams
      );
      sectionMarks = secRes.rows;
    }

    return {
      ...reportCardData,
      sectionMarks,
    };
  }
}

module.exports = ResultRepository;
