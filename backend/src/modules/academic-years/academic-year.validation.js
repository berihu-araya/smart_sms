const { ACADEMIC_YEAR_STATUSES } = require('./academic-year.model');

function normalizeName(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeOptionalString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function isValidUUID(value) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

function validateCreateAcademicYearInput(input = {}) {
  const name = normalizeName(input.name);
  const startDate = normalizeOptionalString(input.startDate);
  const endDate = normalizeOptionalString(input.endDate);
  const description = normalizeOptionalString(input.description);
  const errors = {};

  if (!name) {
    errors.name = 'Academic year name is required';
  }

  if (name && name.length < 4) {
    errors.name = 'Academic year name must be at least 4 characters';
  }

  if (!startDate) {
    errors.startDate = 'Start date is required';
  }

  if (startDate && Number.isNaN(Date.parse(startDate))) {
    errors.startDate = 'Start date must be a valid date';
  }

  if (!endDate) {
    errors.endDate = 'End date is required';
  }

  if (endDate && Number.isNaN(Date.parse(endDate))) {
    errors.endDate = 'End date must be a valid date';
  }

  if (startDate && endDate && !Number.isNaN(Date.parse(startDate)) && !Number.isNaN(Date.parse(endDate))) {
    if (new Date(endDate) <= new Date(startDate)) {
      errors.endDate = 'End date must be after start date';
    }
  }

  return {
    name,
    startDate,
    endDate,
    description: description || null,
    errors,
  };
}

function validateUpdateAcademicYearInput(input = {}) {
  const name = normalizeName(input.name);
  const startDate = normalizeOptionalString(input.startDate);
  const endDate = normalizeOptionalString(input.endDate);
  const description = normalizeOptionalString(input.description);
  const errors = {};

  if (input.name !== undefined && !name) {
    errors.name = 'Academic year name is required';
  }

  if (input.name !== undefined && name.length < 4) {
    errors.name = 'Academic year name must be at least 4 characters';
  }

  if (input.startDate !== undefined && !startDate) {
    errors.startDate = 'Start date is required';
  }

  if (startDate && Number.isNaN(Date.parse(startDate))) {
    errors.startDate = 'Start date must be a valid date';
  }

  if (input.endDate !== undefined && !endDate) {
    errors.endDate = 'End date is required';
  }

  if (endDate && Number.isNaN(Date.parse(endDate))) {
    errors.endDate = 'End date must be a valid date';
  }

  if (input.startDate !== undefined && input.endDate !== undefined &&
      startDate && endDate &&
      !Number.isNaN(Date.parse(startDate)) && !Number.isNaN(Date.parse(endDate))) {
    if (new Date(endDate) <= new Date(startDate)) {
      errors.endDate = 'End date must be after start date';
    }
  }

  return {
    name: name || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    description: description || undefined,
    errors,
  };
}

function validateAcademicYearId(id) {
  const errors = {};
  if (!id || typeof id !== 'string' || !id.trim()) {
    errors.id = 'Academic year id is required';
  }

  return { id: id?.trim(), errors };
}

module.exports = {
  validateCreateAcademicYearInput,
  validateUpdateAcademicYearInput,
  validateAcademicYearId,
};

