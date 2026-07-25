const { STUDENT_STATUSES, GENDERS } = require('./student.model');

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

function validateCreateStudentInput(input = {}) {
  const admissionNumber = normalizeOptionalString(input.admissionNumber);
  const firstName = normalizeName(input.firstName);
  const lastName = normalizeName(input.lastName);
  const gender = normalizeOptionalString(input.gender).toUpperCase();
  const dateOfBirth = normalizeOptionalString(input.dateOfBirth);
  const admissionDate = normalizeOptionalString(input.admissionDate);
  const parentId = normalizeOptionalString(input.parentId);
  const sectionId = normalizeOptionalString(input.sectionId);
  const address = normalizeOptionalString(input.address);
  const status = normalizeOptionalString(input.status).toUpperCase() || STUDENT_STATUSES.ACTIVE;
  const errors = {};

  if (!admissionNumber) {
    errors.admissionNumber = 'Admission number is required';
  }

  if (!firstName) {
    errors.firstName = 'First name is required';
  }

  if (!lastName) {
    errors.lastName = 'Last name is required';
  }

  if (!gender || !Object.values(GENDERS).includes(gender)) {
    errors.gender = 'A valid gender is required';
  }

  if (!admissionDate) {
    errors.admissionDate = 'Admission date is required';
  }

  if (dateOfBirth && Number.isNaN(Date.parse(dateOfBirth))) {
    errors.dateOfBirth = 'Date of birth must be a valid date';
  }

  if (admissionDate && Number.isNaN(Date.parse(admissionDate))) {
    errors.admissionDate = 'Admission date must be a valid date';
  }

  if (parentId && !isValidUUID(parentId)) {
    errors.parentId = 'Parent id must be a valid UUID';
  }

  if (sectionId && !isValidUUID(sectionId)) {
    errors.sectionId = 'Section id must be a valid UUID';
  }

  if (!Object.values(STUDENT_STATUSES).includes(status)) {
    errors.status = 'A valid status is required';
  }

  return {
    admissionNumber,
    firstName,
    lastName,
    gender,
    dateOfBirth,
    admissionDate,
    parentId,
    sectionId,
    address,
    status,
    errors,
  };
}

function validateUpdateStudentInput(input = {}) {
  const firstName = normalizeName(input.firstName);
  const lastName = normalizeName(input.lastName);
  const gender = normalizeOptionalString(input.gender).toUpperCase();
  const dateOfBirth = normalizeOptionalString(input.dateOfBirth);
  const address = normalizeOptionalString(input.address);
  const status = normalizeOptionalString(input.status).toUpperCase();
  const errors = {};

  if (input.firstName !== undefined && !firstName) {
    errors.firstName = 'First name is required';
  }

  if (input.lastName !== undefined && !lastName) {
    errors.lastName = 'Last name is required';
  }

  if (input.gender !== undefined && !Object.values(GENDERS).includes(gender)) {
    errors.gender = 'A valid gender is required';
  }

  if (dateOfBirth && Number.isNaN(Date.parse(dateOfBirth))) {
    errors.dateOfBirth = 'Date of birth must be a valid date';
  }

  if (status && !Object.values(STUDENT_STATUSES).includes(status)) {
    errors.status = 'A valid status is required';
  }

  return {
    firstName,
    lastName,
    gender: gender || undefined,
    dateOfBirth: dateOfBirth || undefined,
    address: address || undefined,
    status: status || undefined,
    errors,
  };
}

function validateStudentId(id) {
  const errors = {};
  if (!id || typeof id !== 'string' || !id.trim()) {
    errors.id = 'Student id is required';
  }

  return { id: id?.trim(), errors };
}

module.exports = {
  validateCreateStudentInput,
  validateUpdateStudentInput,
  validateStudentId,
};
