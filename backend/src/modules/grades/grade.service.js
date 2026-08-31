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

  async listGrades({
    search = '',
    status = 'active',
    sortBy = 'name',
    sortOrder = 'ASC',
    limit = 20,
    offset = 0,
  } = {}) {
    const parsedLimit = Math.max(1, Number(limit) || 20);
    const parsedOffset = Math.max(0, Number(offset) || 0);

    const { items, total } = await this.repository.findAll({
      search,
      status,
      sortBy,
      sortOrder,
      limit: parsedLimit,
      offset: parsedOffset,
    });

    return {
      page: Math.floor(parsedOffset / parsedLimit) + 1,
      limit: parsedLimit,
      total,
      totalPages: Math.ceil(total / parsedLimit),
      items,
    };
  }

  async getGradeById(id) {
    const grade = await this.repository.findById(id);
    if (!grade) {
      throw new GradeNotFoundError();
    }
    return grade;
  }

  async checkGradeReferences(id) {
    const grade = await this.repository.findById(id);
    if (!grade) {
      throw new GradeNotFoundError();
    }
    const references = await this.repository.checkReferences(id);
    return {
      grade,
      ...references,
    };
  }

  async createGrade(payload) {
    const existing = await this.repository.findByName(payload.name);
    if (existing) {
      throw new GradeConflictError(`Grade with name "${payload.name}" already exists.`);
    }

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

    if (payload.name && payload.name.trim() !== existing.name) {
      const duplicate = await this.repository.findByName(payload.name, id);
      if (duplicate) {
        throw new GradeConflictError(`Another grade with name "${payload.name}" already exists.`);
      }
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

  async restoreGrade(id) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new GradeNotFoundError();
    }

    const restoredGrade = await this.repository.restore(id);
    return restoredGrade;
  }
}

module.exports = {
  GradeService,
  GradeNotFoundError,
  GradeConflictError,
};
