const { SUBSTITUTION_STATUSES } = require('../timetable.constants');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function validateUUID(value) {
  return typeof value === 'string' && UUID_REGEX.test(value.trim());
}

function validateCreateSubstitutionInput(payload = {}) {
  const errors = {};
  const data = {};

  // Timetable Entry ID
  const entryId = payload.timetable_entry_id || payload.timetableEntryId;
  if (!entryId || !validateUUID(entryId)) {
    errors.timetable_entry_id = 'Valid timetable entry ID is required';
  } else {
    data.timetable_entry_id = entryId.trim();
  }

  // Substitute Teacher ID
  const subTeacherId = payload.substitute_teacher_id || payload.substituteTeacherId;
  if (!subTeacherId || !validateUUID(subTeacherId)) {
    errors.substitute_teacher_id = 'Valid substitute teacher ID is required';
  } else {
    data.substitute_teacher_id = subTeacherId.trim();
  }

  // Substitution Date (YYYY-MM-DD)
  const subDate = payload.substitution_date || payload.substitutionDate;
  if (!subDate || typeof subDate !== 'string' || !DATE_REGEX.test(subDate.trim())) {
    errors.substitution_date = 'Substitution date must be a valid date in YYYY-MM-DD format';
  } else {
    data.substitution_date = subDate.trim();
  }

  // Reason
  if (payload.reason !== undefined && payload.reason !== null) {
    data.reason = typeof payload.reason === 'string' ? payload.reason.trim() : null;
  } else {
    data.reason = null;
  }

  // Notes
  if (payload.notes !== undefined && payload.notes !== null) {
    data.notes = typeof payload.notes === 'string' ? payload.notes.trim() : null;
  } else {
    data.notes = null;
  }

  return { data, errors };
}

function validateUpdateSubstitutionStatusInput(payload = {}) {
  const errors = {};
  const data = {};

  const status = typeof payload.status === 'string' ? payload.status.trim().toUpperCase() : '';
  const validStatuses = Object.values(SUBSTITUTION_STATUSES);

  if (!status || !validStatuses.includes(status)) {
    errors.status = `Status must be one of: ${validStatuses.join(', ')}`;
  } else {
    data.status = status;
  }

  if (payload.notes !== undefined && payload.notes !== null) {
    data.notes = typeof payload.notes === 'string' ? payload.notes.trim() : null;
  }

  return { data, errors };
}

function validateSubstitutionId(id) {
  if (!id || typeof id !== 'string' || !UUID_REGEX.test(id.trim())) {
    return { isValid: false, error: 'Invalid substitution ID format' };
  }
  return { isValid: true, error: null };
}

module.exports = {
  validateCreateSubstitutionInput,
  validateUpdateSubstitutionStatusInput,
  validateSubstitutionId,
};
