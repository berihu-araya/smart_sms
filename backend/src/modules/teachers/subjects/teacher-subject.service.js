class TeacherSubjectNotFoundError extends Error {
  constructor(message = 'Teacher subject assignment not found') {
    super(message);
    this.name = 'TeacherSubjectNotFoundError';
    this.status = 404;
  }
}

class TeacherSubjectConflictError extends Error {
  constructor(message = 'Teacher subject assignment already exists') {
    super(message);
    this.name = 'TeacherSubjectConflictError';
    this.status = 409;
  }
}

class TeacherSubjectValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'TeacherSubjectValidationError';
    this.status = 400;
  }
}

class TeacherSubjectService {
  constructor(repository) {
    this.repository = repository;
  }

  async listTeacherSubjects({
    teacher_id,
    grade_id,
    section_id,
    academic_year_id,
    search = '',
    limit = 20,
    offset = 0,
  } = {}) {
    const items = await this.repository.findAll({
      teacher_id,
      grade_id,
      section_id,
      academic_year_id,
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

  async getTeacherSubjectById(id) {
    const assignment = await this.repository.findById(id);

    if (!assignment) {
      throw new TeacherSubjectNotFoundError();
    }

    return assignment;
  }

  async createTeacherSubject(payload) {
    // Validate teacher
    if (!(await this.repository.teacherExists(payload.teacher_id))) {
      throw new TeacherSubjectValidationError('Teacher not found');
    }

    // Validate subject
    if (!(await this.repository.subjectExists(payload.subject_id))) {
      throw new TeacherSubjectValidationError('Subject not found');
    }

    // Validate grade
    if (!(await this.repository.gradeExists(payload.grade_id))) {
      throw new TeacherSubjectValidationError('Grade not found');
    }

    // Validate section
    if (!(await this.repository.sectionExists(payload.section_id))) {
      throw new TeacherSubjectValidationError('Section not found');
    }

    // Validate academic year
    if (
      !(await this.repository.academicYearExists(
        payload.academic_year_id
      ))
    ) {
      throw new TeacherSubjectValidationError(
        'Academic year not found'
      );
    }

    // Prevent duplicates
    const duplicate =
      await this.repository.assignmentExists(
        payload.teacher_id,
        payload.subject_id,
        payload.grade_id,
        payload.section_id,
        payload.academic_year_id
      );

    if (duplicate) {
      throw new TeacherSubjectConflictError(
        'This teacher is already assigned to this subject, grade, section and academic year'
      );
    }

    return await this.repository.create(payload);
  }

  async updateTeacherSubject(id, payload) {
    const existing = await this.repository.findById(id);

    if (!existing) {
      throw new TeacherSubjectNotFoundError();
    }

    // Validate updated references (only if present)

    if (
      payload.teacher_id &&
      !(await this.repository.teacherExists(payload.teacher_id))
    ) {
      throw new TeacherSubjectValidationError('Teacher not found');
    }

    if (
      payload.subject_id &&
      !(await this.repository.subjectExists(payload.subject_id))
    ) {
      throw new TeacherSubjectValidationError('Subject not found');
    }

    if (
      payload.grade_id &&
      !(await this.repository.gradeExists(payload.grade_id))
    ) {
      throw new TeacherSubjectValidationError('Grade not found');
    }

    if (
      payload.section_id &&
      !(await this.repository.sectionExists(payload.section_id))
    ) {
      throw new TeacherSubjectValidationError('Section not found');
    }

    if (
      payload.academic_year_id &&
      !(await this.repository.academicYearExists(payload.academic_year_id))
    ) {
      throw new TeacherSubjectValidationError(
        'Academic year not found'
      );
    }

    return await this.repository.update(id, payload);
  }

  async deleteTeacherSubject(id) {
    const existing = await this.repository.findById(id);

    if (!existing) {
      throw new TeacherSubjectNotFoundError();
    }

    return await this.repository.softDelete(id);
  }

  async getTeachersBySubject(subjectId, limit = 100, offset = 0) {
    const teachers = await this.repository.findTeachersBySubject(subjectId, limit, offset);
    return {
      page: Math.floor(offset / limit) + 1,
      limit,
      items: teachers,
    };
  }
}

module.exports = {
  TeacherSubjectService,
  TeacherSubjectNotFoundError,
  TeacherSubjectConflictError,
  TeacherSubjectValidationError,
};