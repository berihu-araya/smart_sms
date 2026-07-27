class AcademicYearNotFoundError extends Error {
  constructor(message = 'Academic year not found') {
    super(message);
    this.name = 'AcademicYearNotFoundError';
    this.status = 404;
  }
}

class AcademicYearConflictError extends Error {
  constructor(message = 'Academic year already exists') {
    super(message);
    this.name = 'AcademicYearConflictError';
    this.status = 409;
  }
}

class AcademicYearService {
  constructor(repository) {
    this.repository = repository;
  }

  async listAcademicYears({ search = '', limit = 20, offset = 0 } = {}) {
    const academicYears = await this.repository.findAll({ search, limit, offset });

    return {
      page: Math.floor(offset / limit) + 1,
      limit,
      items: academicYears,
    };
  }

  async getAcademicYearById(id) {
    const academicYear = await this.repository.findById(id);

    if (!academicYear) {
      throw new AcademicYearNotFoundError();
    }

    return academicYear;
  }

  async getActiveAcademicYear() {
    const activeYear = await this.repository.findActive();

    return activeYear;
  }

  async createAcademicYear(payload) {
    const academicYear = await this.repository.create(payload);

    if (!academicYear) {
      throw new AcademicYearConflictError('Unable to create academic year');
    }

    return academicYear;
  }

  async updateAcademicYear(id, payload) {
    const existing = await this.repository.findById(id);

    if (!existing) {
      throw new AcademicYearNotFoundError();
    }

    const updatedAcademicYear = await this.repository.update(id, payload);

    return updatedAcademicYear;
  }

  async setActiveAcademicYear(id) {
    const existing = await this.repository.findById(id);

    if (!existing) {
      throw new AcademicYearNotFoundError();
    }

    const result = await this.repository.setActive(id);

    return result;
  }

  async deleteAcademicYear(id) {
    const existing = await this.repository.findById(id);

    if (!existing) {
      throw new AcademicYearNotFoundError();
    }

    // Prevent deleting the active academic year
    if (existing.is_active) {
      throw new AcademicYearConflictError('Cannot delete the active academic year. Set another year as active first.');
    }

    const deletedAcademicYear = await this.repository.softDelete(id);

    return deletedAcademicYear;
  }
}

module.exports = {
  AcademicYearService,
  AcademicYearNotFoundError,
  AcademicYearConflictError,
};

