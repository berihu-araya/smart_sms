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

  async listSections({
    search = '',
    gradeId = '',
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
      gradeId,
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

  async getSectionById(id) {
    const section = await this.repository.findById(id);
    if (!section) {
      throw new SectionNotFoundError();
    }
    return section;
  }

  async checkSectionReferences(id) {
    const section = await this.repository.findById(id);
    if (!section) {
      throw new SectionNotFoundError();
    }
    const references = await this.repository.checkReferences(id);
    return {
      section,
      ...references,
    };
  }

  async getSectionsByGrade(gradeId) {
    const sections = await this.repository.findByGradeId(gradeId);
    return sections;
  }

  async createSection(payload) {
    const gradeId = payload.gradeId || payload.grade_id;
    if (gradeId) {
      const existing = await this.repository.findByNameAndGrade(payload.name, gradeId);
      if (existing) {
        throw new SectionConflictError(`Section "${payload.name}" already exists in this grade.`);
      }
    }

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

    const targetGrade = payload.gradeId || payload.grade_id || existing.grade_id;
    const targetName = payload.name || existing.name;

    if (targetGrade && (payload.name || payload.gradeId || payload.grade_id)) {
      const duplicate = await this.repository.findByNameAndGrade(targetName, targetGrade, id);
      if (duplicate) {
        throw new SectionConflictError(`Another section "${targetName}" already exists in this grade.`);
      }
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

  async restoreSection(id) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new SectionNotFoundError();
    }

    const restoredSection = await this.repository.restore(id);
    return restoredSection;
  }
}

module.exports = {
  SectionService,
  SectionNotFoundError,
  SectionConflictError,
};
