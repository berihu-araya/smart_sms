class GradeSubjectNotFoundError extends Error {
  constructor(message = 'Grade subject not found') {
    super(message);
    this.name = 'GradeSubjectNotFoundError';
    this.status = 404;
  }
}

class GradeSubjectConflictError extends Error {
  constructor(message = 'Grade subject already exists') {
    super(message);
    this.name = 'GradeSubjectConflictError';
    this.status = 409;
  }
}

class GradeSubjectValidationError extends Error {
  constructor(message = 'Invalid grade subject data') {
    super(message);
    this.name = 'GradeSubjectValidationError';
    this.status = 400;
  }
}

class GradeSubjectService {
  constructor(repository) {
    this.repository = repository;
  }

  async listGradeSubjects({
    grade_id,
    academic_year_id,
    status,
    is_compulsory,
    search = '',
    limit = 20,
    offset = 0,
  } = {}) {
    const { items, total } = await this.repository.findAll({
      grade_id,
      academic_year_id,
      status,
      is_compulsory,
      search,
      limit,
      offset,
    });

    const parsedLimit = Math.max(1, Number(limit) || 20);
    const parsedOffset = Math.max(0, Number(offset) || 0);

    return {
      page: Math.floor(parsedOffset / parsedLimit) + 1,
      limit: parsedLimit,
      total,
      totalPages: Math.ceil(total / parsedLimit),
      items,
    };
  }

  async getGradeSubjectById(id) {
    const item = await this.repository.findById(id);
    if (!item) {
      throw new GradeSubjectNotFoundError();
    }
    return item;
  }

  async createGradeSubject(payload) {
    const grade = await this.repository.gradeExists(payload.grade_id);
    if (!grade) {
      throw new GradeSubjectValidationError('Grade does not exist');
    }

    const subject = await this.repository.subjectExists(payload.subject_id);
    if (!subject) {
      throw new GradeSubjectValidationError('Subject does not exist');
    }

    const academicYear = await this.repository.academicYearExists(payload.academic_year_id);
    if (!academicYear) {
      throw new GradeSubjectValidationError('Academic year does not exist');
    }

    const existing = await this.repository.findAssignment(
      payload.grade_id,
      payload.subject_id,
      payload.academic_year_id
    );

    if (existing) {
      throw new GradeSubjectConflictError(
        'Subject is already assigned to this grade for this academic year'
      );
    }

    return await this.repository.create(payload);
  }

  async bulkAssignSubjects({ grade_id, academic_year_id, subjects }) {
    const grade = await this.repository.gradeExists(grade_id);
    if (!grade) {
      throw new GradeSubjectValidationError('Target Grade does not exist');
    }

    const academicYear = await this.repository.academicYearExists(academic_year_id);
    if (!academicYear) {
      throw new GradeSubjectValidationError('Academic Year does not exist');
    }

    // Verify all subjects exist
    for (const item of subjects) {
      const sub = await this.repository.subjectExists(item.subject_id);
      if (!sub) {
        throw new GradeSubjectValidationError(`Subject with ID ${item.subject_id} does not exist`);
      }
    }

    const saved = await this.repository.bulkUpsert({
      grade_id,
      academic_year_id,
      subjects,
    });

    return {
      assignedCount: saved.length,
      items: saved,
    };
  }

  async cloneGradeSubjects({
    source_grade_id,
    source_academic_year_id,
    target_grade_id,
    target_academic_year_id,
  }) {
    const sourceGrade = await this.repository.gradeExists(source_grade_id);
    if (!sourceGrade) {
      throw new GradeSubjectValidationError('Source Grade does not exist');
    }

    const sourceYear = await this.repository.academicYearExists(source_academic_year_id);
    if (!sourceYear) {
      throw new GradeSubjectValidationError('Source Academic Year does not exist');
    }

    const targetGrade = await this.repository.gradeExists(target_grade_id);
    if (!targetGrade) {
      throw new GradeSubjectValidationError('Target Grade does not exist');
    }

    const targetYear = await this.repository.academicYearExists(target_academic_year_id);
    if (!targetYear) {
      throw new GradeSubjectValidationError('Target Academic Year does not exist');
    }

    const result = await this.repository.cloneAssignments({
      source_grade_id,
      source_academic_year_id,
      target_grade_id,
      target_academic_year_id,
    });

    if (result.clonedCount === 0) {
      throw new GradeSubjectValidationError(
        'No active subjects found in source grade for the given academic year to clone'
      );
    }

    return result;
  }

  async getCurriculumStats({ grade_id, academic_year_id } = {}) {
    return await this.repository.getCurriculumStats({
      grade_id,
      academic_year_id,
    });
  }

  async getSubjectMappedGrades(subject_id, academic_year_id = null) {
    const subject = await this.repository.subjectExists(subject_id);
    if (!subject) {
      throw new GradeSubjectValidationError('Subject does not exist');
    }

    return await this.repository.getSubjectMappedGrades(subject_id, academic_year_id);
  }

  async updateGradeSubject(id, payload) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new GradeSubjectNotFoundError();
    }

    return await this.repository.update(id, payload);
  }

  async deleteGradeSubject(id) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new GradeSubjectNotFoundError();
    }

    return await this.repository.softDelete(id);
  }
}

module.exports = {
  GradeSubjectService,
  GradeSubjectNotFoundError,
  GradeSubjectConflictError,
  GradeSubjectValidationError,
};