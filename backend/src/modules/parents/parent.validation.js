function normalizeString(value) {
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
  if (!value) return true;
  const phoneRegex = /^[\d\s\-+()]{7,20}$/;
  return phoneRegex.test(value.trim());
}

function validateCreateParentInput(input = {}) {
  const fullName = normalizeString(input.fullName || input.full_name);
  const phone = normalizeString(input.phone);
  const email = normalizeString(input.email);
  const occupation = normalizeString(input.occupation);
  const address = normalizeString(input.address);
  const relationship = normalizeString(input.relationship || 'GUARDIAN').toUpperCase();
  const errors = {};

  if (!fullName) {
    errors.fullName = 'Full name is required';
  } else if (fullName.length < 2 || fullName.length > 150) {
    errors.fullName = 'Full name must be between 2 and 150 characters';
  }

  if (email && !isValidEmail(email)) {
    errors.email = 'A valid email address is required (e.g. name@example.com)';
  }

  if (phone && !isValidPhone(phone)) {
    errors.phone = 'Phone must be 7-20 characters (digits, spaces, dashes, +, or parentheses)';
  }

  return {
    fullName,
    phone: phone || null,
    email: email || null,
    occupation: occupation || null,
    address: address || null,
    relationship: relationship || 'GUARDIAN',
    errors,
  };
}

function validateUpdateParentInput(input = {}) {
  const fullName = input.fullName !== undefined ? normalizeString(input.fullName) : input.full_name !== undefined ? normalizeString(input.full_name) : undefined;
  const phone = input.phone !== undefined ? normalizeString(input.phone) : undefined;
  const email = input.email !== undefined ? normalizeString(input.email) : undefined;
  const occupation = input.occupation !== undefined ? normalizeString(input.occupation) : undefined;
  const address = input.address !== undefined ? normalizeString(input.address) : undefined;
  const relationship = input.relationship !== undefined ? normalizeString(input.relationship).toUpperCase() : undefined;
  const errors = {};

  if (fullName !== undefined) {
    if (!fullName) {
      errors.fullName = 'Full name cannot be empty';
    } else if (fullName.length < 2 || fullName.length > 150) {
      errors.fullName = 'Full name must be between 2 and 150 characters';
    }
  }

  if (email !== undefined && email && !isValidEmail(email)) {
    errors.email = 'A valid email address is required (e.g. name@example.com)';
  }

  if (phone !== undefined && phone && !isValidPhone(phone)) {
    errors.phone = 'Phone must be 7-20 characters (digits, spaces, dashes, +, or parentheses)';
  }

  const result = { errors };
  if (fullName !== undefined) result.full_name = fullName;
  if (phone !== undefined) result.phone = phone || null;
  if (email !== undefined) result.email = email || null;
  if (occupation !== undefined) result.occupation = occupation || null;
  if (address !== undefined) result.address = address || null;
  if (relationship !== undefined) result.relationship = relationship || 'GUARDIAN';

  return result;
}

function validateParentId(id) {
  const errors = {};
  if (!id || typeof id !== 'string' || !id.trim()) {
    errors.id = 'Parent ID is required';
  } else if (!isValidUUID(id.trim())) {
    errors.id = 'Parent ID must be a valid UUID';
  }

  return { id: id?.trim(), errors };
}

module.exports = {
  validateCreateParentInput,
  validateUpdateParentInput,
  validateParentId,
};
