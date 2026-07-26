function normalizeName(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeOptionalString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function validateCreateGradeInput(input = {}) {
  const name = normalizeName(input.name);
  const description = normalizeOptionalString(input.description);
  const errors = {};

  if (!name) {
    errors.name = 'Grade name is required';
  }

  if (name && name.length < 2) {
    errors.name = 'Grade name must be at least 2 characters';
  }

  return {
    name,
    description: description || null,
    errors,
  };
}

function validateUpdateGradeInput(input = {}) {
  const name = normalizeName(input.name);
  const description = normalizeOptionalString(input.description);
  const errors = {};

  if (input.name !== undefined && !name) {
    errors.name = 'Grade name is required';
  }

  if (input.name !== undefined && name.length < 2) {
    errors.name = 'Grade name must be at least 2 characters';
  }

  return {
    name: name || undefined,
    description: description || undefined,
    errors,
  };
}

function validateGradeId(id) {
  const errors = {};
  if (!id || typeof id !== 'string' || !id.trim()) {
    errors.id = 'Grade id is required';
  }

  return { id: id?.trim(), errors };
}

module.exports = {
  validateCreateGradeInput,
  validateUpdateGradeInput,
  validateGradeId,
};

