class GradeNotFoundError extends Error {
  constructor(message = 'Grade not found') {
    super(message);
    this.name = 'GradeNotFoundError';
    this.status = 404;
  }
}

class GradeConflictError extends Error {
  constructor(message = 'Grade already exists') {
    super(message);
    this.name = 'GradeConflictError';
    this.status = 409;
  }
}

class GradeService {
  constructor(repository) {
    this.repository = repository;
  }

  async listGrades({ search = '', limit = 20, offset = 0 } = {}) {
    const grades = await this.repository.findAll({ search, limit, offset });

    return {
      page: Math.floor(offset / limit) + 1,
      limit,
      items: grades,
    };
  }

  async getGradeById(id) {
    const grade = await this.repository.findById(id);

    if (!grade) {
      throw new GradeNotFoundError();
    }

    return grade;
  }

  async createGrade(payload) {
    const grade = await this.repository.create(payload);

    if (!grade) {
      throw new GradeConflictError('Unable to create grade');
    }

    return grade;
  }

  async updateGrade(id, payload) {
    const existing = await this.repository.findById(id);

    if (!existing) {
      throw new GradeNotFoundError();
    }

    const updatedGrade = await this.repository.update(id, payload);

    return updatedGrade;
  }

  async deleteGrade(id) {
    const existing = await this.repository.findById(id);

    if (!existing) {
      throw new GradeNotFoundError();
    }

    const deletedGrade = await this.repository.softDelete(id);

    return deletedGrade;
  }
}

module.exports = {
  GradeService,
  GradeNotFoundError,
  GradeConflictError,
};

