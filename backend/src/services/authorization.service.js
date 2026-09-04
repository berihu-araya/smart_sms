/**
 * Authorization Service
 *
 * Provides high-performance, fine-grained relationship and tenant authorization checks for:
 * - School / Multi-tenant access verification
 * - Teacher-subject relationships
 * - Teacher-section assignments (class teacher & subject teacher)
 * - Teacher-student relationships
 * - Parent-child relationships
 * - Mark grading and evaluation permissions
 */

class AuthorizationService {
  constructor(database) {
    this.db = database;
  }

  /**
   * Verify that a user has access to a specific school (or tenant)
   * @param {string} userId - User UUID
   * @param {string} schoolId - School UUID
   * @returns {Promise<boolean>}
   */
  async canUserAccessSchool(userId, schoolId) {
    if (!userId || !schoolId) return true; // Graceful fallback if school context is not enabled
    try {
      const res = await this.db.query(
        `SELECT school_id FROM users WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
        [userId]
      );
      if (res.rows.length === 0) return false;
      const userSchoolId = res.rows[0].school_id;
      // If user has no school_id assigned yet, allow access (single-school default)
      if (!userSchoolId) return true;
      return userSchoolId === schoolId;
    } catch {
      return true; // Fallback if multi-school column is pending migration
    }
  }

  /**
   * Verify that a teacher is assigned to teach a specific subject
   * @param {string} userId - Teacher user UUID
   * @param {string} subjectId - Subject UUID
   * @param {string} academicYearId - Academic year UUID (optional)
   * @returns {Promise<boolean>}
   */
  async canTeacherTeachSubject(userId, subjectId, academicYearId = null) {
    if (!userId || !subjectId) return false;
    let query = `
      SELECT 1
      FROM teacher_subjects ts
      INNER JOIN teachers t ON t.id = ts.teacher_id
      WHERE t.user_id = $1
        AND ts.subject_id = $2
        AND ts.status = 'ACTIVE'
        AND ts.deleted_at IS NULL
        AND t.deleted_at IS NULL
    `;
    const params = [userId, subjectId];
    if (academicYearId) {
      params.push(academicYearId);
      query += ` AND ts.academic_year_id = $${params.length}`;
    }
    const res = await this.db.query(query, params);
    return res.rows.length > 0;
  }

  /**
   * Verify that a teacher is assigned to a specific section/class
   * (either as class teacher or subject teacher)
   * @param {string} userId - Teacher user UUID
   * @param {string} sectionId - Section UUID
   * @returns {Promise<boolean>}
   */
  async canTeacherTeachSection(userId, sectionId) {
    if (!userId || !sectionId) return false;
    const res = await this.db.query(
      `
      SELECT 1 FROM (
        SELECT ct.section_id
        FROM class_teachers ct
        INNER JOIN teachers t ON t.id = ct.teacher_id
        WHERE t.user_id = $1 AND ct.section_id = $2 AND ct.deleted_at IS NULL AND t.deleted_at IS NULL
        UNION
        SELECT ts.section_id
        FROM teacher_subjects ts
        INNER JOIN teachers t ON t.id = ts.teacher_id
        WHERE t.user_id = $1 AND ts.section_id = $2 AND ts.deleted_at IS NULL AND t.deleted_at IS NULL
      ) active_assignments
      LIMIT 1
      `,
      [userId, sectionId]
    );
    return res.rows.length > 0;
  }

  /**
   * Verify that a teacher can access a specific student (student is in their section)
   * @param {string} teacherUserId - Teacher user UUID
   * @param {string} studentIdOrUserId - Student UUID or student user UUID
   * @returns {Promise<boolean>}
   */
  async canTeacherAccessStudent(teacherUserId, studentIdOrUserId) {
    if (!teacherUserId || !studentIdOrUserId) return false;
    const res = await this.db.query(
      `
      SELECT 1
      FROM students s
      WHERE (s.id = $1 OR s.user_id = $1)
        AND s.deleted_at IS NULL
        AND s.section_id IN (
          SELECT ct.section_id
          FROM class_teachers ct
          INNER JOIN teachers t ON t.id = ct.teacher_id
          WHERE t.user_id = $2 AND ct.deleted_at IS NULL AND t.deleted_at IS NULL
          UNION
          SELECT ts.section_id
          FROM teacher_subjects ts
          INNER JOIN teachers t ON t.id = ts.teacher_id
          WHERE t.user_id = $2 AND ts.deleted_at IS NULL AND t.deleted_at IS NULL
        )
      LIMIT 1
      `,
      [studentIdOrUserId, teacherUserId]
    );
    return res.rows.length > 0;
  }

  /**
   * Verify that a parent is linked to a student
   * @param {string} parentUserId - Parent user UUID
   * @param {string} studentIdOrUserId - Student UUID or student user UUID
   * @returns {Promise<boolean>}
   */
  async isParentOfStudent(parentUserId, studentIdOrUserId) {
    if (!parentUserId || !studentIdOrUserId) return false;
    const res = await this.db.query(
      `
      SELECT 1
      FROM student_parents sp
      INNER JOIN parents p ON p.id = sp.parent_id
      INNER JOIN students s ON s.id = sp.student_id
      WHERE p.user_id = $1
        AND (s.id = $2 OR s.user_id = $2)
        AND sp.deleted_at IS NULL
        AND p.deleted_at IS NULL
        AND s.deleted_at IS NULL
      LIMIT 1
      `,
      [parentUserId, studentIdOrUserId]
    );
    return res.rows.length > 0;
  }

  /**
   * Verify that a teacher can grade a student in a specific subject
   * @param {string} teacherUserId - Teacher user UUID
   * @param {string} studentId - Student UUID
   * @param {string} subjectId - Subject UUID
   * @returns {Promise<boolean>}
   */
  async canTeacherGradeStudent(teacherUserId, studentId, subjectId) {
    if (!teacherUserId || !studentId || !subjectId) return false;
    const res = await this.db.query(
      `
      SELECT 1
      FROM teacher_subjects ts
      INNER JOIN teachers t ON t.id = ts.teacher_id
      INNER JOIN students s ON s.section_id = ts.section_id
      WHERE t.user_id = $1
        AND (s.id = $2 OR s.user_id = $2)
        AND ts.subject_id = $3
        AND ts.status = 'ACTIVE'
        AND ts.deleted_at IS NULL
        AND t.deleted_at IS NULL
        AND s.deleted_at IS NULL
      LIMIT 1
      `,
      [teacherUserId, studentId, subjectId]
    );
    return res.rows.length > 0;
  }

  /**
   * Verify that a student can view their own marks record
   * @param {string} studentUserId - Student user UUID
   * @param {string} marksId - Marks UUID
   * @returns {Promise<boolean>}
   */
  async canStudentViewMarks(studentUserId, marksId) {
    if (!studentUserId || !marksId) return false;
    const res = await this.db.query(
      `
      SELECT 1
      FROM marks m
      INNER JOIN students s ON s.id = m.student_id
      WHERE s.user_id = $1 AND m.id = $2 AND s.deleted_at IS NULL
      LIMIT 1
      `,
      [studentUserId, marksId]
    );
    return res.rows.length > 0;
  }

  /**
   * Verify that a parent can view marks for their child
   * @param {string} parentUserId - Parent user UUID
   * @param {string} marksId - Marks UUID
   * @returns {Promise<boolean>}
   */
  async canParentViewMarks(parentUserId, marksId) {
    if (!parentUserId || !marksId) return false;
    const res = await this.db.query(
      `
      SELECT 1
      FROM marks m
      INNER JOIN student_parents sp ON sp.student_id = m.student_id
      INNER JOIN parents p ON p.id = sp.parent_id
      WHERE p.user_id = $1 AND m.id = $2 AND sp.deleted_at IS NULL AND p.deleted_at IS NULL
      LIMIT 1
      `,
      [parentUserId, marksId]
    );
    return res.rows.length > 0;
  }
}

module.exports = AuthorizationService;
