const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUID(value) {
  return typeof value === 'string' && UUID_REGEX.test(value.trim());
}

function validateCreateUserInput(body = {}) {
  const errors = {};

  if (!body.firstName || typeof body.firstName !== 'string' || body.firstName.trim().length < 2) {
    errors.firstName = 'First name must be at least 2 characters.';
  }

  if (!body.lastName || typeof body.lastName !== 'string' || body.lastName.trim().length < 2) {
    errors.lastName = 'Last name must be at least 2 characters.';
  }

  if (!body.email || typeof body.email !== 'string' || !body.email.includes('@')) {
    errors.email = 'Valid email is required.';
  }

  if (!body.roleId || !isValidUUID(body.roleId)) {
    errors.roleId = 'Valid role ID is required.';
  }

  if (!body.password || typeof body.password !== 'string' || body.password.length < 6) {
    errors.password = 'Password must be at least 6 characters.';
  }

  return {
    firstName: body.firstName ? body.firstName.trim() : '',
    lastName: body.lastName ? body.lastName.trim() : '',
    email: body.email ? body.email.trim().toLowerCase() : '',
    phone: body.phone ? body.phone.trim() : null,
    roleId: body.roleId ? body.roleId.trim() : '',
    password: body.password || '',
    status: body.status || 'ACTIVE',
    errors,
  };
}

function validateUpdateUserInput(body = {}) {
  const errors = {};

  if (body.email !== undefined && (!body.email || !body.email.includes('@'))) {
    errors.email = 'Valid email is required.';
  }

  if (body.roleId !== undefined && !isValidUUID(body.roleId)) {
    errors.roleId = 'Valid role ID is required.';
  }

  return {
    firstName: body.firstName !== undefined ? body.firstName.trim() : undefined,
    lastName: body.lastName !== undefined ? body.lastName.trim() : undefined,
    email: body.email !== undefined ? body.email.trim().toLowerCase() : undefined,
    phone: body.phone !== undefined ? body.phone.trim() : undefined,
    roleId: body.roleId !== undefined ? body.roleId.trim() : undefined,
    status: body.status !== undefined ? body.status.trim() : undefined,
    errors,
  };
}

module.exports = {
  isValidUUID,
  validateCreateUserInput,
  validateUpdateUserInput,
};
