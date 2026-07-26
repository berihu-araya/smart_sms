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

function validateCreateSectionInput(input = {}) {
  const name = normalizeName(input.name);
  const gradeId = normalizeOptionalString(input.gradeId);
  const roomNumber = normalizeOptionalString(input.roomNumber);
  const capacity = input.capacity !== undefined && input.capacity !== null ? Number(input.capacity) : undefined;
  const errors = {};

  if (!name) {
    errors.name = 'Section name is required';
  }

  if (gradeId && !isValidUUID(gradeId)) {
    errors.gradeId = 'Grade id must be a valid UUID';
  }

  if (capacity !== undefined && (Number.isNaN(capacity) || capacity < 1)) {
    errors.capacity = 'Capacity must be a positive number';
  }

  return {
    name,
    gradeId: gradeId || null,
    roomNumber: roomNumber || null,
    capacity: capacity ?? null,
    errors,
  };
}

function validateUpdateSectionInput(input = {}) {
  const name = normalizeName(input.name);
  const gradeId = normalizeOptionalString(input.gradeId);
  const roomNumber = normalizeOptionalString(input.roomNumber);
  const capacity = input.capacity !== undefined && input.capacity !== null ? Number(input.capacity) : undefined;
  const errors = {};

  if (input.name !== undefined && !name) {
    errors.name = 'Section name is required';
  }

  if (input.gradeId !== undefined && !isValidUUID(gradeId)) {
    errors.gradeId = 'Grade id must be a valid UUID';
  }

  if (input.capacity !== undefined && input.capacity !== null && (Number.isNaN(capacity) || capacity < 1)) {
    errors.capacity = 'Capacity must be a positive number';
  }

  return {
    name: name || undefined,
    gradeId: gradeId || undefined,
    roomNumber: roomNumber || undefined,
    capacity: capacity ?? undefined,
    errors,
  };
}

function validateSectionId(id) {
  const errors = {};
  if (!id || typeof id !== 'string' || !id.trim()) {
    errors.id = 'Section id is required';
  }

  return { id: id?.trim(), errors };
}

module.exports = {
  validateCreateSectionInput,
  validateUpdateSectionInput,
  validateSectionId,
};

