class SubjectNotFoundError extends Error {
  constructor(message = 'Subject not found') {
    super(message);
    this.name = 'SubjectNotFoundError';
    this.status = 404;
  }
}

class SubjectConflictError extends Error {
  constructor(message = 'Subject already exists') {
    super(message);
    this.name = 'SubjectConflictError';
    this.status = 409;
  }
}

class SubjectService {
  constructor(repository) {
    this.repository = repository;
  }

  async listSubjects({
    search = '',
    status = 'active',
    sortBy = 'subject_name',
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

  async getSubjectById(id) {
    const subject = await this.repository.findById(id);
    if (!subject) {
      throw new SubjectNotFoundError();
    }
    return subject;
  }

  async checkSubjectReferences(id) {
    const subject = await this.repository.findById(id);
    if (!subject) {
      throw new SubjectNotFoundError();
    }
    const references = await this.repository.checkReferences(id);
    return {
      subject,
      ...references,
    };
  }

  async createSubject(payload) {
    const existingCode = await this.repository.findByCode(payload.subject_code);
    if (existingCode) {
      throw new SubjectConflictError(`Subject code "${payload.subject_code}" is already in use.`);
    }

    const existingName = await this.repository.findByName(payload.subject_name);
    if (existingName) {
      throw new SubjectConflictError(`Subject name "${payload.subject_name}" already exists.`);
    }

    const subject = await this.repository.create(payload);
    if (!subject) {
      throw new SubjectConflictError('Unable to create subject');
    }

    return subject;
  }

  async updateSubject(id, payload) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new SubjectNotFoundError();
    }

    if (payload.subject_code && payload.subject_code.trim() !== existing.subject_code) {
      const duplicateCode = await this.repository.findByCode(payload.subject_code, id);
      if (duplicateCode) {
        throw new SubjectConflictError(`Subject code "${payload.subject_code}" is already in use.`);
      }
    }

    if (payload.subject_name && payload.subject_name.trim().toLowerCase() !== existing.subject_name.toLowerCase()) {
      const duplicateName = await this.repository.findByName(payload.subject_name, id);
      if (duplicateName) {
        throw new SubjectConflictError(`Subject name "${payload.subject_name}" already exists.`);
      }
    }

    const updatedSubject = await this.repository.update(id, payload);
    return updatedSubject;
  }

  async deleteSubject(id) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new SubjectNotFoundError();
    }

    const deletedSubject = await this.repository.softDelete(id);
    return deletedSubject;
  }

  async restoreSubject(id) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new SubjectNotFoundError();
    }

    const restoredSubject = await this.repository.restore(id);
    return restoredSubject;
  }
}

module.exports = {
  SubjectService,
  SubjectNotFoundError,
  SubjectConflictError,
};