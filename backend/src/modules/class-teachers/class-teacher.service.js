class ClassTeacherConflictError extends Error {
  constructor(message = 'Class teacher assignment already exists') {
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
  constructor(repository) {
    this.repository = repository;
  }

  async assignClassTeacher(payload) {
    if (!payload.teacher_id || !payload.section_id || !payload.academic_year_id) {
      throw new ClassTeacherValidationError('Teacher, section and academic year are required');
    }

    const teacher = await this.repository.findTeacherById(payload.teacher_id);
    if (!teacher) {
      throw new ClassTeacherValidationError('Teacher not found');
    }

    const section = await this.repository.findSectionById(payload.section_id);
    if (!section) {
      throw new ClassTeacherValidationError('Section not found');
    }

    const year = await this.repository.findAcademicYearById(payload.academic_year_id);
    if (!year) {
      throw new ClassTeacherValidationError('Academic year not found');
    }

    const existing = await this.repository.findActiveAssignment({
      academic_year_id: payload.academic_year_id,
      section_id: payload.section_id,
    });

    if (existing) {
      throw new ClassTeacherConflictError(
        `A class teacher is already assigned to this section for the selected academic year.`
      );
    }

    const created = await this.repository.create({
      teacher_id: payload.teacher_id,
      section_id: payload.section_id,
      academic_year_id: payload.academic_year_id,
      assignment_date: payload.assignment_date || null,
      status: payload.status || 'ACTIVE',
    });

    return created;
  }

  async reassignClassTeacher(payload) {
    if (!payload.teacher_id || !payload.section_id || !payload.academic_year_id) {
      throw new ClassTeacherValidationError('Teacher, section and academic year are required');
    }

    const current = await this.repository.findActiveAssignment({
      academic_year_id: payload.academic_year_id,
      section_id: payload.section_id,
    });

    if (current) {
      await this.repository.deactivateExisting(current.id);
    }

    return this.assignClassTeacher(payload);
  }

  async listAssignments(filters = {}) {
    return this.repository.listAssignments(filters);
  }

  async deactivateAssignment(id) {
    return this.repository.deactivateExisting(id);
  }
}

module.exports = {
  ClassTeacherService,
  ClassTeacherConflictError,
  ClassTeacherValidationError,
};
