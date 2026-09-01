/**
 * Class Teacher Validation
 */

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Validate input for creating a class teacher assignment
 */
function validateCreateClassTeacherInput(input = {}) {
  const teacher_id = normalizeString(input.teacher_id);
  const section_id = normalizeString(input.section_id);
  const academic_year_id = normalizeString(input.academic_year_id);
  const start_date = input.start_date || null;
  const end_date = input.end_date || null;
  const status = normalizeString(input.status);
  const notes = normalizeString(input.notes);
  const addToTeacherSubjects = input.addToTeacherSubjects === true;

  const errors = {};

  if (!teacher_id) {
    errors.teacher_id = 'Teacher is required';
  }

  if (!section_id) {
    errors.section_id = 'Section is required';
  }

  if (!academic_year_id) {
    errors.academic_year_id = 'Academic year is required';
  }

  if (!start_date) {
    errors.start_date = 'Start date is required';
  }

  if (
    start_date &&
    end_date &&
    new Date(end_date) < new Date(start_date)
  ) {
    errors.end_date = 'End date must be after start date';
  }

  return {
    teacher_id,
    section_id,
    academic_year_id,
    start_date,
    end_date: end_date || null,
    status: status || 'ACTIVE',
    notes: notes || null,
    addToTeacherSubjects,
    errors,
  };
}

/**
 * Validate input for updating a class teacher assignment
 */
function validateUpdateClassTeacherInput(input = {}) {
  const errors = {};
  const payload = {};

  if (input.teacher_id !== undefined) {
    const value = normalizeString(input.teacher_id);
    if (!value) {
      errors.teacher_id = 'Teacher is required';
    } else {
      payload.teacher_id = value;
    }
  }

  if (input.section_id !== undefined) {
    const value = normalizeString(input.section_id);
    if (!value) {
      errors.section_id = 'Section is required';
    } else {
      payload.section_id = value;
    }
  }

  if (input.academic_year_id !== undefined) {
    const value = normalizeString(input.academic_year_id);
    if (!value) {
      errors.academic_year_id = 'Academic year is required';
    } else {
      payload.academic_year_id = value;
    }
  }

  if (input.start_date !== undefined) {
    payload.start_date = input.start_date || null;
  }

  if (input.end_date !== undefined) {
    payload.end_date = input.end_date || null;
  }

  if (input.status !== undefined) {
    payload.status = normalizeString(input.status);
  }

  if (input.notes !== undefined) {
    payload.notes = normalizeString(input.notes);
  }

  return {
    ...payload,
    errors,
  };
}

/**
 * Validate class teacher ID
 */
function validateClassTeacherId(id) {
  const errors = {};

  if (!id || typeof id !== 'string' || !id.trim()) {
    errors.id = 'Class teacher id is required';
  }

  return {
    id: id?.trim(),
    errors,
  };
}

module.exports = {
  validateCreateClassTeacherInput,
  validateUpdateClassTeacherInput,
  validateClassTeacherId,
};
