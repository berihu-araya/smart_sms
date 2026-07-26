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

function isValidEmail(value) {
  if (!value) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
}

function isValidPhone(value) {
  if (!value) return true; // phone is optional
  // Accept digits, spaces, dashes, plus, parentheses - min 7, max 20 chars
  const phoneRegex = /^[\d\s\-+()]{7,20}$/;
  return phoneRegex.test(value.trim());
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
  const email = normalizeOptionalString(input.email);
  const phone = normalizeOptionalString(input.phone);
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

  if (email && !isValidEmail(email)) {
    errors.email = 'A valid email address is required (e.g., example@domain.com)';
  }

  if (phone && !isValidPhone(phone)) {
    errors.phone = 'Phone must be 7-20 characters: digits, spaces, dashes, plus, or parentheses';
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
    email: email || null,
    phone: phone || null,
    status,
    errors,
  };
}

function validateUpdateStudentInput(input = {}) {
  const admissionNumber = normalizeOptionalString(input.admissionNumber);
  const firstName = normalizeName(input.firstName);
  const lastName = normalizeName(input.lastName);
  const gender = normalizeOptionalString(input.gender).toUpperCase();
  const dateOfBirth = normalizeOptionalString(input.dateOfBirth);
  const admissionDate = normalizeOptionalString(input.admissionDate);
  const parentId = normalizeOptionalString(input.parentId);
  const sectionId = normalizeOptionalString(input.sectionId);
  const address = normalizeOptionalString(input.address);
  const email = normalizeOptionalString(input.email);
  const phone = normalizeOptionalString(input.phone);
  const status = normalizeOptionalString(input.status).toUpperCase();
  const errors = {};

  if (input.admissionNumber !== undefined && !admissionNumber) {
    errors.admission_number = 'Admission number is required';
  }

  if (input.firstName !== undefined && !firstName) {
    errors.first_name = 'First name is required';
  }

  if (input.lastName !== undefined && !lastName) {
    errors.last_name = 'Last name is required';
  }

  if (input.gender !== undefined && !Object.values(GENDERS).includes(gender)) {
    errors.gender = 'A valid gender is required';
  }

  if (dateOfBirth && Number.isNaN(Date.parse(dateOfBirth))) {
    errors.date_of_birth = 'Date of birth must be a valid date';
  }

  if (admissionDate && Number.isNaN(Date.parse(admissionDate))) {
    errors.admission_date = 'Admission date must be a valid date';
  }

  if (status && !Object.values(STUDENT_STATUSES).includes(status)) {
    errors.status = 'A valid status is required';
  }

  if (parentId && !isValidUUID(parentId)) {
    errors.parent_id = 'Parent id must be a valid UUID';
  }

  if (sectionId && !isValidUUID(sectionId)) {
    errors.section_id = 'Section id must be a valid UUID';
  }

  if (input.email !== undefined && email && !isValidEmail(email)) {
    errors.email = 'A valid email address is required (e.g., example@domain.com)';
  }

  if (input.phone !== undefined && phone && !isValidPhone(phone)) {
    errors.phone = 'Phone must be 7-20 characters: digits, spaces, dashes, plus, or parentheses';
  }

  return {
    admission_number: admissionNumber || undefined,
    first_name: firstName || undefined,
    last_name: lastName || undefined,
    gender: gender || undefined,
    date_of_birth: dateOfBirth || undefined,
    admission_date: admissionDate || undefined,
    parent_id: parentId || undefined,
    section_id: sectionId || undefined,
    address: address || undefined,
    email: email || null,
    phone: phone || null,
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
