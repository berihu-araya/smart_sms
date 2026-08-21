class SectionNotFoundError extends Error {
  constructor(message = 'Section not found') {
    super(message);
    this.name = 'SectionNotFoundError';
    this.status = 404;
  }
}

class SectionConflictError extends Error {
  constructor(message = 'Section already exists') {
    super(message);
    this.name = 'SectionConflictError';
    this.status = 409;
  }
}

class SectionService {
  constructor(repository) {
    this.repository = repository;
  }

  async listSections({ search = '', gradeId = '', limit = 20, offset = 0 } = {}) {
    const sections = await this.repository.findAll({ search, gradeId, limit, offset });

    return {
      page: Math.floor(offset / limit) + 1,
      limit,
      items: sections,
    };
  }

  async getSectionById(id) {
    const section = await this.repository.findById(id);

    if (!section) {
      throw new SectionNotFoundError();
    }

    return section;
  }

  async getSectionsByGrade(gradeId) {
    const sections = await this.repository.findByGradeId(gradeId);

    return sections;
  }

  async createSection(payload) {
    const section = await this.repository.create(payload);

    if (!section) {
      throw new SectionConflictError('Unable to create section');
    }

    return section;
  }

  async updateSection(id, payload) {
    const existing = await this.repository.findById(id);

    if (!existing) {
      throw new SectionNotFoundError();
    }

    const updatedSection = await this.repository.update(id, payload);

    return updatedSection;
  }

  async deleteSection(id) {
    const existing = await this.repository.findById(id);

    if (!existing) {
      throw new SectionNotFoundError();
    }

    const deletedSection = await this.repository.softDelete(id);

    return deletedSection;
  }
}

module.exports = {
  SectionService,
  SectionNotFoundError,
  SectionConflictError,
};

