const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUID(value) {
  return typeof value === 'string' && UUID_REGEX.test(value.trim());
}

function validateUpdateSettingsInput(body = {}) {
  const errors = {};

  if (body.schoolName !== undefined && (!body.schoolName || body.schoolName.trim().length < 2)) {
    errors.schoolName = 'School name must be at least 2 characters.';
  }

  if (body.activeAcademicYearId !== undefined && body.activeAcademicYearId !== null && !isValidUUID(body.activeAcademicYearId)) {
    errors.activeAcademicYearId = 'Invalid academic year ID format.';
  }

  return {
    schoolName: body.schoolName !== undefined ? body.schoolName.trim() : undefined,
    schoolCode: body.schoolCode !== undefined ? body.schoolCode.trim() : undefined,
    email: body.email !== undefined ? body.email.trim() : undefined,
    phone: body.phone !== undefined ? body.phone.trim() : undefined,
    address: body.address !== undefined ? body.address.trim() : undefined,
    motto: body.motto !== undefined ? body.motto.trim() : undefined,
    logoUrl: body.logoUrl !== undefined ? body.logoUrl.trim() : undefined,
    activeAcademicYearId: body.activeAcademicYearId !== undefined ? (body.activeAcademicYearId ? body.activeAcademicYearId.trim() : null) : undefined,
    activeTerm: body.activeTerm !== undefined ? body.activeTerm.trim() : undefined,
    currency: body.currency !== undefined ? body.currency.trim() : undefined,
    errors,
  };
}

module.exports = {
  isValidUUID,
  validateUpdateSettingsInput,
};
