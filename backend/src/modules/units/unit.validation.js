function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function validateCreateUnitInput(input = {}) {
  const name = normalizeString(input.name);
  const description = typeof input.description === 'string' ? input.description.trim() : null;
  const errors = {};

  if (!name) {
    errors.name = 'Unit name is required';
  } else if (name.length < 2) {
    errors.name = 'Unit name must be at least 2 characters';
  }

  return {
    name,
    description,
    errors,
  };
}

function validateUpdateUnitInput(input = {}) {
  const payload = {};
  const errors = {};

  if (input.name !== undefined) {
    const name = normalizeString(input.name);
    if (!name) {
      errors.name = 'Unit name is required';
    } else if (name.length < 2) {
      errors.name = 'Unit name must be at least 2 characters';
    } else {
      payload.name = name;
    }
  }

  if (input.description !== undefined) {
    payload.description = typeof input.description === 'string' ? input.description.trim() || null : null;
  }

  return { ...payload, errors };
}

function validateUnitId(id) {
  const errors = {};
  const cleanId = normalizeString(id);

  if (!cleanId) {
    errors.id = 'Unit id is required';
  }

  return { id: cleanId, errors };
}

function validateAssignClassToUnitInput(input = {}) {
  const unit_id = normalizeString(input.unit_id || input.unitId);
  const section_id = normalizeString(input.section_id || input.sectionId);
  const academic_year_id = normalizeString(input.academic_year_id || input.academicYearId || input.session_id || input.sessionId);
  const errors = {};

  if (!unit_id) errors.unit_id = 'Unit is required';
  if (!section_id) errors.section_id = 'Section is required';
  if (!academic_year_id) errors.academic_year_id = 'Academic year is required';

  return {
    unit_id,
    section_id,
    academic_year_id,
    errors,
  };
}

module.exports = {
  validateCreateUnitInput,
  validateUpdateUnitInput,
  validateUnitId,
  validateAssignClassToUnitInput,
};
