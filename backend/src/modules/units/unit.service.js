class UnitNotFoundError extends Error {
  constructor(message = 'Unit not found') {
    super(message);
    this.name = 'UnitNotFoundError';
    this.status = 404;
  }
}

class UnitConflictError extends Error {
  constructor(message = 'Unit already exists') {
    super(message);
    this.name = 'UnitConflictError';
    this.status = 409;
  }
}

class UnitValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UnitValidationError';
    this.status = 400;
  }
}

class UnitService {
  constructor(repository) {
    this.repository = repository;
  }

  async listUnits({ search = '', status = 'active', limit = 20, offset = 0 } = {}) {
    const parsedLimit = Math.max(1, Number(limit) || 20);
    const parsedOffset = Math.max(0, Number(offset) || 0);
    const items = await this.repository.findAll({ search, status, limit: parsedLimit, offset: parsedOffset });

    return {
      page: Math.floor(parsedOffset / parsedLimit) + 1,
      limit: parsedLimit,
      items,
    };
  }

  async getUnitById(id) {
    const unit = await this.repository.findById(id);
    if (!unit) {
      throw new UnitNotFoundError();
    }
    return unit;
  }

  async createUnit(payload) {
    const existing = await this.repository.findByName(payload.name);
    if (existing) {
      throw new UnitConflictError(`Unit "${payload.name}" already exists.`);
    }

    const unit = await this.repository.create(payload);
    if (!unit) {
      throw new UnitConflictError('Unable to create unit');
    }

    return unit;
  }

  async updateUnit(id, payload) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new UnitNotFoundError();
    }

    if (payload.name && payload.name.trim() !== existing.name) {
      const duplicate = await this.repository.findByName(payload.name, id);
      if (duplicate) {
        throw new UnitConflictError(`Another unit "${payload.name}" already exists.`);
      }
    }

    const updated = await this.repository.update(id, payload);
    return updated;
  }

  async deleteUnit(id) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new UnitNotFoundError();
    }

    return this.repository.softDelete(id);
  }

  async assignClassToUnit(payload) {
    if (!payload.unit_id || !payload.section_id || !payload.academic_year_id) {
      throw new UnitValidationError('Unit, section and academic year are required');
    }

    const unit = await this.repository.findById(payload.unit_id);
    if (!unit) {
      throw new UnitNotFoundError();
    }

    const existing = await this.repository.classAssignmentExists(payload);
    if (existing) {
      throw new UnitConflictError('This class is already assigned to the selected unit for the active academic year.');
    }

    return this.repository.assignClassToUnit(payload);
  }

  async getUnitClassAssignments(unitId) {
    const unit = await this.repository.findById(unitId);
    if (!unit) {
      throw new UnitNotFoundError();
    }

    return this.repository.listClassesForUnit(unitId);
  }

  async removeClassFromUnit(unitAssignmentId) {
    const removed = await this.repository.deactivateClassAssignment(unitAssignmentId);
    if (!removed) {
      throw new UnitNotFoundError('Unit class assignment not found');
    }
    return removed;
  }
}

module.exports = {
  UnitService,
  UnitNotFoundError,
  UnitConflictError,
  UnitValidationError,
};
