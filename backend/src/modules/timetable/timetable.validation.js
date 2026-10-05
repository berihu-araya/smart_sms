const { TIMETABLE_STATUSES, DAYS_OF_WEEK } = require('./timetable.constants');

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUuid(id) {
  return typeof id === 'string' && UUID_REGEX.test(id.trim());
}

function normalizeOptionalString(value) {
  if (value === undefined || value === null) return null;
  const str = String(value).trim();
  return str.length > 0 ? str : null;
}

function validateCreateTimetableInput(input = {}) {
  const errors = {};

  const academicYearId = input.academic_year_id || input.academicYearId;
  if (!academicYearId || !isValidUuid(academicYearId)) {
    errors.academic_year_id = 'Valid Academic Year ID is required';
  }

  const term = typeof input.term === 'string' ? input.term.trim() : '';
  if (!term) {
    errors.term = 'Term/Semester name is required';
  } else if (term.length > 50) {
    errors.term = 'Term cannot exceed 50 characters';
  }

  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (!name) {
    errors.name = 'Timetable name is required';
  } else if (name.length < 2 || name.length > 150) {
    errors.name = 'Timetable name must be between 2 and 150 characters';
  }

  let status = 'DRAFT';
  if (input.status) {
    const rawStatus = String(input.status).trim().toUpperCase();
    if (!Object.values(TIMETABLE_STATUSES).includes(rawStatus)) {
      errors.status = `Invalid status. Allowed: ${Object.values(TIMETABLE_STATUSES).join(', ')}`;
    } else {
      status = rawStatus;
    }
  }

  return {
    data: {
      academic_year_id: academicYearId,
      term,
      name,
      status,
    },
    errors,
  };
}

function validateUpdateTimetableInput(input = {}) {
  const errors = {};
  const data = {};

  if (input.name !== undefined) {
    const name = String(input.name).trim();
    if (!name || name.length < 2 || name.length > 150) {
      errors.name = 'Timetable name must be between 2 and 150 characters';
    } else {
      data.name = name;
    }
  }

  if (input.term !== undefined) {
    const term = String(input.term).trim();
    if (!term || term.length > 50) {
      errors.term = 'Term must be between 1 and 50 characters';
    } else {
      data.term = term;
    }
  }

  if (input.status !== undefined) {
    const rawStatus = String(input.status).trim().toUpperCase();
    if (!Object.values(TIMETABLE_STATUSES).includes(rawStatus)) {
      errors.status = `Invalid status. Allowed: ${Object.values(TIMETABLE_STATUSES).join(', ')}`;
    } else {
      data.status = rawStatus;
    }
  }

  if (input.is_active !== undefined || input.isActive !== undefined) {
    data.is_active = Boolean(input.is_active !== undefined ? input.is_active : input.isActive);
  }

  return {
    data,
    errors,
  };
}

function validateCreateEntryInput(input = {}) {
  const errors = {};

  const timetableId = input.timetable_id || input.timetableId;
  if (!timetableId || !isValidUuid(timetableId)) {
    errors.timetable_id = 'Valid Timetable ID is required';
  }

  const sectionId = input.section_id || input.sectionId;
  if (!sectionId || !isValidUuid(sectionId)) {
    errors.section_id = 'Valid Section ID is required';
  }

  const subjectId = input.subject_id || input.subjectId;
  if (!subjectId || !isValidUuid(subjectId)) {
    errors.subject_id = 'Valid Subject ID is required';
  }

  const teacherId = input.teacher_id || input.teacherId;
  if (!teacherId || !isValidUuid(teacherId)) {
    errors.teacher_id = 'Valid Teacher ID is required';
  }

  const periodId = input.period_id || input.periodId;
  if (!periodId || !isValidUuid(periodId)) {
    errors.period_id = 'Valid Period ID is required';
  }

  const roomId = input.room_id || input.roomId;
  if (roomId && !isValidUuid(roomId)) {
    errors.room_id = 'Room ID must be a valid UUID';
  }

  const dayOfWeek = String(input.day_of_week || input.dayOfWeek || '').trim().toUpperCase();
  if (!dayOfWeek || !DAYS_OF_WEEK.includes(dayOfWeek)) {
    errors.day_of_week = `Valid day of week is required (${DAYS_OF_WEEK.join(', ')})`;
  }

  return {
    data: {
      timetable_id: timetableId,
      section_id: sectionId,
      subject_id: subjectId,
      teacher_id: teacherId,
      room_id: roomId || null,
      period_id: periodId,
      day_of_week: dayOfWeek,
    },
    errors,
  };
}

function validateUpdateEntryInput(input = {}) {
  const errors = {};
  const data = {};

  const sectionId = input.section_id || input.sectionId;
  if (sectionId !== undefined) {
    if (!isValidUuid(sectionId)) {
      errors.section_id = 'Valid Section ID is required';
    } else {
      data.section_id = sectionId;
    }
  }

  const subjectId = input.subject_id || input.subjectId;
  if (subjectId !== undefined) {
    if (!isValidUuid(subjectId)) {
      errors.subject_id = 'Valid Subject ID is required';
    } else {
      data.subject_id = subjectId;
    }
  }

  const teacherId = input.teacher_id || input.teacherId;
  if (teacherId !== undefined) {
    if (!isValidUuid(teacherId)) {
      errors.teacher_id = 'Valid Teacher ID is required';
    } else {
      data.teacher_id = teacherId;
    }
  }

  const periodId = input.period_id || input.periodId;
  if (periodId !== undefined) {
    if (!isValidUuid(periodId)) {
      errors.period_id = 'Valid Period ID is required';
    } else {
      data.period_id = periodId;
    }
  }

  if (input.room_id !== undefined || input.roomId !== undefined) {
    const roomId = input.room_id !== undefined ? input.room_id : input.roomId;
    if (roomId && !isValidUuid(roomId)) {
      errors.room_id = 'Room ID must be a valid UUID';
    } else {
      data.room_id = roomId || null;
    }
  }

  const dayOfWeek = input.day_of_week || input.dayOfWeek;
  if (dayOfWeek !== undefined) {
    const normalized = String(dayOfWeek).trim().toUpperCase();
    if (!DAYS_OF_WEEK.includes(normalized)) {
      errors.day_of_week = `Valid day of week is required (${DAYS_OF_WEEK.join(', ')})`;
    } else {
      data.day_of_week = normalized;
    }
  }

  return {
    data,
    errors,
  };
}

function validateTimetableId(id) {
  if (!id || typeof id !== 'string' || !isValidUuid(id)) {
    return {
      isValid: false,
      error: 'Invalid or missing Timetable ID (must be a valid UUID)',
    };
  }
  return {
    isValid: true,
    error: null,
  };
}

function validateEntryId(id) {
  if (!id || typeof id !== 'string' || !isValidUuid(id)) {
    return {
      isValid: false,
      error: 'Invalid or missing Entry ID (must be a valid UUID)',
    };
  }
  return {
    isValid: true,
    error: null,
  };
}

module.exports = {
  validateCreateTimetableInput,
  validateUpdateTimetableInput,
  validateCreateEntryInput,
  validateUpdateEntryInput,
  validateTimetableId,
  validateEntryId,
  isValidUuid,
};
