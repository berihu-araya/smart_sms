const { TEACHER_STATUSES, GENDERS } = require('./teacher.model');

function normalizeName(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeOptionalString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function isValidEmail(value) {
  if (!value) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
}

function isValidPhone(value) {
  if (!value) return true;
  const phoneRegex = /^[\d\s\-+()]{7,20}$/;
  return phoneRegex.test(value.trim());
}

function validateCreateTeacherInput(input = {}) {
  const employeeNumber = normalizeOptionalString(input.employeeNumber);
  const firstName = normalizeName(input.firstName);
  const lastName = normalizeName(input.lastName);
  const gender = normalizeOptionalString(input.gender).toUpperCase();
  const dateOfBirth = normalizeOptionalString(input.dateOfBirth);
  const phone = normalizeOptionalString(input.phone);
  const email = normalizeOptionalString(input.email);
  const address = normalizeOptionalString(input.address);
  const qualification = normalizeOptionalString(input.qualification);
  const designation = normalizeOptionalString(input.designation);
  const department = normalizeOptionalString(input.department);
  const joiningDate = normalizeOptionalString(input.joiningDate);
  const status = normalizeOptionalString(input.status).toUpperCase() || TEACHER_STATUSES.ACTIVE;
  const errors = {};

  if (!firstName) {
    errors.firstName = 'First name is required';
  }

  if (!lastName) {
    errors.lastName = 'Last name is required';
  }

  if (!gender || !Object.values(GENDERS).includes(gender)) {
    errors.gender = 'A valid gender is required';
  }

  if (dateOfBirth && Number.isNaN(Date.parse(dateOfBirth))) {
    errors.dateOfBirth = 'Date of birth must be a valid date';
  }

  if (email && !isValidEmail(email)) {
    errors.email = 'A valid email address is required (e.g., example@domain.com)';
  }

  if (phone && !isValidPhone(phone)) {
    errors.phone = 'Phone must be 7-20 characters: digits, spaces, dashes, plus, or parentheses';
  }

  if (joiningDate && Number.isNaN(Date.parse(joiningDate))) {
    errors.joiningDate = 'Joining date must be a valid date';
  }

  if (status && !Object.values(TEACHER_STATUSES).includes(status)) {
    errors.status = 'A valid status is required';
  }

  return {
    employeeNumber: employeeNumber || undefined,
    firstName,
    lastName,
    gender,
    dateOfBirth: dateOfBirth || null,
    phone: phone || null,
    email: email || null,
    address: address || null,
    qualification: qualification || null,
    designation: designation || null,
    department: department || null,
    joiningDate: joiningDate || null,
    status,
    errors,
  };
}

function validateUpdateTeacherInput(input = {}) {
  const employeeNumber = normalizeOptionalString(input.employeeNumber);
  const firstName = normalizeName(input.firstName);
  const lastName = normalizeName(input.lastName);
  const gender = normalizeOptionalString(input.gender).toUpperCase();
  const dateOfBirth = normalizeOptionalString(input.dateOfBirth);
  const phone = normalizeOptionalString(input.phone);
  const email = normalizeOptionalString(input.email);
  const address = normalizeOptionalString(input.address);
  const qualification = normalizeOptionalString(input.qualification);
  const designation = normalizeOptionalString(input.designation);
  const department = normalizeOptionalString(input.department);
  const joiningDate = normalizeOptionalString(input.joiningDate);
  const status = normalizeOptionalString(input.status).toUpperCase();
  const errors = {};

  if (input.employeeNumber !== undefined && !employeeNumber) {
    errors.employeeNumber = 'Employee number is required';
  }

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

  if (joiningDate && Number.isNaN(Date.parse(joiningDate))) {
    errors.joiningDate = 'Joining date must be a valid date';
  }

  if (input.email !== undefined && email && !isValidEmail(email)) {
    errors.email = 'A valid email address is required (e.g., example@domain.com)';
  }

  if (input.phone !== undefined && phone && !isValidPhone(phone)) {
    errors.phone = 'Phone must be 7-20 characters: digits, spaces, dashes, plus, or parentheses';
  }

  if (input.status !== undefined && !Object.values(TEACHER_STATUSES).includes(status)) {
    errors.status = 'A valid status is required';
  }

  return {
    employeeNumber: employeeNumber || undefined,
    firstName: firstName || undefined,
    lastName: lastName || undefined,
    gender: gender || undefined,
    dateOfBirth: dateOfBirth || undefined,
    phone: phone || null,
    email: email || null,
    address: address || undefined,
    qualification: qualification || undefined,
    designation: designation || undefined,
    department: department || undefined,
    joiningDate: joiningDate || undefined,
    status: status || undefined,
    errors,
  };
}

function validateTeacherId(id) {
  const errors = {};
  if (!id || typeof id !== 'string' || !id.trim()) {
    errors.id = 'Teacher id is required';
  }

  return { id: id?.trim(), errors };
}

module.exports = {
  validateCreateTeacherInput,
  validateUpdateTeacherInput,
  validateTeacherId,
};

