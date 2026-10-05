/**
 * Class Teacher Service
 * Handles business logic for class teacher assignments
 * 
 * Key constraints:
 * - One teacher per section per academic year (active)
 * - One section per teacher per academic year (active)
 */

class ClassTeacherNotFoundError extends Error {
  constructor(message = 'Class teacher assignment not found') {
    super(message);
    this.name = 'ClassTeacherNotFoundError';
    this.status = 404;
  }
}

class ClassTeacherConflictError extends Error {
  constructor(message = 'Class teacher assignment conflict') {
    super(message);
    this.name = 'ClassTeacherConflictError';
    this.status = 409;
  }
}

class ClassTeacherValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ClassTeacherValidationError';
    this.status = 400;
  }
}

class ClassTeacherService {
  constructor(repository, db) {
    this.repository = repository;
    this.db = db;
  }

  /**
   * List all class teacher assignments
   */
  async listClassTeachers({
    teacher_id,
    section_id,
    academic_year_id,
    status = 'ACTIVE',
    search = '',
    limit = 20,
    offset = 0,
  } = {}) {
    const items = await this.repository.findAll({
      teacher_id,
      section_id,
      academic_year_id,
      status,
      search,
      limit,
      offset,
    });

    return {
      page: Math.floor(offset / limit) + 1,
      limit,
      items,
    };
  }

  /**
   * Get class teacher assignment by ID
   */
  async getClassTeacherById(id) {
    const assignment = await this.repository.findById(id);

    if (!assignment) {
      throw new ClassTeacherNotFoundError();
    }

    return assignment;
  }

  /**
   * Get active class teacher for a section
   */
  async getActiveClassTeacherForSection(section_id, academic_year_id) {
    const assignment = await this.repository.findActiveBySectionAndAcademicYear(
      section_id,
      academic_year_id
    );

    return assignment || null;
  }

  /**
   * Create new class teacher assignment
   * 
   * @param {Object} payload - Assignment data
   * @param {string} payload.teacher_id - Teacher ID
   * @param {string} payload.section_id - Section ID
   * @param {string} payload.academic_year_id - Academic year ID
   * @param {Date} payload.start_date - Assignment start date
   * @param {Date} payload.end_date - Assignment end date (optional)
   * @param {string} payload.status - Assignment status (default: ACTIVE)
   * @param {string} payload.notes - Assignment notes (optional)
   * @param {boolean} payload.addToTeacherSubjects - Add teacher to section's subjects (default: false)
   * @returns {Promise<Object>} Created assignment
   */
  async createClassTeacher(payload) {
    // Validate teacher
    if (!await this.repository.teacherExists(payload.teacher_id)) {
      throw new ClassTeacherValidationError('Teacher not found');
    }

    // Validate section
    if (!await this.repository.sectionExists(payload.section_id)) {
      throw new ClassTeacherValidationError('Section not found');
    }

    // Validate academic year
    if (!await this.repository.academicYearExists(payload.academic_year_id)) {
      throw new ClassTeacherValidationError('Academic year not found');
    }

    // Check if teacher already assigned as class teacher in this academic year
    const existingAssignment = await this.repository.isTeacherAssignedAsClassTeacher(
      payload.teacher_id,
      payload.academic_year_id
    );

    if (existingAssignment) {
      throw new ClassTeacherConflictError(
        'Teacher is already assigned as class teacher in this academic year'
      );
    }

    // Check if section already has a class teacher in this academic year
    const existingClassTeacher = await this.repository.findActiveBySectionAndAcademicYear(
      payload.section_id,
      payload.academic_year_id
    );

    if (existingClassTeacher) {
      throw new ClassTeacherConflictError(
        'Section already has an active class teacher in this academic year'
      );
    }

    // Create the assignment
    const assignment = await this.repository.create({
      teacher_id: payload.teacher_id,
      section_id: payload.section_id,
      academic_year_id: payload.academic_year_id,
      start_date: payload.start_date,
      end_date: payload.end_date,
      status: payload.status || 'ACTIVE',
      notes: payload.notes,
    });

    // Optionally add teacher to section's subjects
    if (payload.addToTeacherSubjects) {
      await this._addTeacherToSectionSubjects(
        payload.teacher_id,
        payload.section_id,
        payload.academic_year_id,
        payload.start_date
      );
    }

    return assignment;
  }

  /**
   * Update class teacher assignment
   */
  async updateClassTeacher(id, payload) {
    const existing = await this.repository.findById(id);

    if (!existing) {
      throw new ClassTeacherNotFoundError();
    }

    // Validate teacher if changing
    if (
      payload.teacher_id &&
      payload.teacher_id !== existing.teacher_id &&
      !await this.repository.teacherExists(payload.teacher_id)
    ) {
      throw new ClassTeacherValidationError('Teacher not found');
    }

    // Check if new teacher already assigned as class teacher
    if (
      payload.teacher_id &&
      payload.teacher_id !== existing.teacher_id
    ) {
      const existingAssignment = await this.repository.isTeacherAssignedAsClassTeacher(
        payload.teacher_id,
        existing.academic_year_id
      );

      if (existingAssignment) {
        throw new ClassTeacherConflictError(
          'Teacher is already assigned as class teacher in this academic year'
        );
      }
    }

    // Validate section if changing
    if (
      payload.section_id &&
      payload.section_id !== existing.section_id &&
      !await this.repository.sectionExists(payload.section_id)
    ) {
      throw new ClassTeacherValidationError('Section not found');
    }

    // Check if new section already has a class teacher
    if (
      payload.section_id &&
      payload.section_id !== existing.section_id &&
      payload.status === 'ACTIVE'
    ) {
      const existingClassTeacher = await this.repository.findActiveBySectionAndAcademicYear(
        payload.section_id,
        existing.academic_year_id
      );

      if (existingClassTeacher) {
        throw new ClassTeacherConflictError(
          'Section already has an active class teacher in this academic year'
        );
      }
    }

    return await this.repository.update(id, payload);
  }

  /**
   * Delete (soft delete) class teacher assignment
   */
  async deleteClassTeacher(id) {
    const existing = await this.repository.findById(id);

    if (!existing) {
      throw new ClassTeacherNotFoundError();
    }

    return await this.repository.softDelete(id);
  }

  /**
   * Get class teacher for current academic year
   */
  async getClassTeacherForCurrentYear(section_id) {
    // Find current active academic year
    const currentYearResult = await this.db.query(
      `
      SELECT id
      FROM academic_years
      WHERE is_active = true AND deleted_at IS NULL
      LIMIT 1
      `
    );

    if (currentYearResult.rows.length === 0) {
      return null;
    }

    const academicYearId = currentYearResult.rows[0].id;
    return this.getActiveClassTeacherForSection(section_id, academicYearId);
  }

  /**
   * Internal helper: Add teacher to all subjects of a section
   */
  async _addTeacherToSectionSubjects(
    teacher_id,
    section_id,
    academic_year_id,
    start_date
  ) {
    try {
      // Get all subjects assigned to this section in the academic year
      const subjectsResult = await this.db.query(
        `
        SELECT DISTINCT gs.subject_id, gs.grade_id
        FROM grade_subjects gs
        INNER JOIN sections sec ON sec.id = $1
        WHERE gs.status = 'ACTIVE' AND gs.deleted_at IS NULL
        `,
        [section_id]
      );

      if (subjectsResult.rows.length === 0) {
        return; // No subjects to assign
      }

      // Add teacher to each subject
      const insertPromises = subjectsResult.rows.map(({ subject_id, grade_id }) =>
        this.db.query(
          `
          INSERT INTO teacher_subjects (
            teacher_id, subject_id, grade_id, section_id, academic_year_id, start_date, status
          )
          VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE')
          ON CONFLICT DO NOTHING
          `,
          [teacher_id, subject_id, grade_id, section_id, academic_year_id, start_date]
        )
      );

      await Promise.all(insertPromises);
    } catch (error) {
      // Log error but don't fail the main operation
      console.error('Error adding teacher to section subjects:', error.message);
    }
  }
}

module.exports = {
  ClassTeacherService,
  ClassTeacherNotFoundError,
  ClassTeacherConflictError,
  ClassTeacherValidationError,
};
