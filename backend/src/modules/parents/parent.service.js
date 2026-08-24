class ParentNotFoundError extends Error {
  constructor(message = 'Parent/Guardian not found') {
    super(message);
    this.name = 'ParentNotFoundError';
    this.status = 404;
  }
}

class ParentConflictError extends Error {
  constructor(message = 'A parent with this phone number or email already exists') {
    super(message);
    this.name = 'ParentConflictError';
    this.status = 409;
  }
}

class ParentService {
  constructor(repository) {
    this.repository = repository;
  }

  async listParents({ search = '', limit = 20, offset = 0 } = {}) {
    const data = await this.repository.findAll({ search, limit, offset });

    return {
      page: Math.floor(offset / limit) + 1,
      limit,
      total: data.total,
      totalPages: Math.ceil(data.total / limit) || 1,
      items: data.items,
    };
  }

  async getParentById(id) {
    const parent = await this.repository.findById(id);

    if (!parent) {
      throw new ParentNotFoundError();
    }

    const students = await this.repository.findStudentsByParentId(id);

    return {
      ...parent,
      students,
    };
  }

  async createParent(payload) {
    if (payload.phone) {
      const existingPhone = await this.repository.findByPhone(payload.phone);
      if (existingPhone) {
        throw new ParentConflictError('Another parent is already registered with this phone number');
      }
    }

    const parent = await this.repository.create(payload);

    if (!parent) {
      throw new ParentConflictError('Unable to create parent');
    }

    return parent;
  }

  async updateParent(id, payload) {
    const existing = await this.repository.findById(id);

    if (!existing) {
      throw new ParentNotFoundError();
    }

    if (payload.phone && payload.phone !== existing.phone) {
      const existingPhone = await this.repository.findByPhone(payload.phone);
      if (existingPhone && existingPhone.id !== id) {
        throw new ParentConflictError('Another parent is already registered with this phone number');
      }
    }

    const updated = await this.repository.update(id, payload);
    return updated;
  }

  async deleteParent(id) {
    const existing = await this.repository.findById(id);

    if (!existing) {
      throw new ParentNotFoundError();
    }

    const deleted = await this.repository.softDelete(id);
    return deleted;
  }

  async getParentStudents(id) {
    const existing = await this.repository.findById(id);

    if (!existing) {
      throw new ParentNotFoundError();
    }

    const students = await this.repository.findStudentsByParentId(id);
    return {
      parent: existing,
      students,
    };
  }
}

module.exports = {
  ParentService,
  ParentNotFoundError,
  ParentConflictError,
};
