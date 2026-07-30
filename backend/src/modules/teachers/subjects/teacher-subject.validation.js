function normalizeString(value) {
  return typeof value === 'string'
    ? value.trim()
    : '';
}

function normalizeBoolean(value) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return undefined;
}

function normalizeNumber(value) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return undefined;
  }

  const number = Number(value);

  return Number.isNaN(number)
    ? undefined
    : number;
}

function validateCreateTeacherSubjectInput(
  input = {}
) {
  const teacher_id = normalizeString(input.teacher_id);
  const subject_id = normalizeString(input.subject_id);
  const grade_id = normalizeString(input.grade_id);
  const section_id = normalizeString(input.section_id);
  const academic_year_id = normalizeString(
    input.academic_year_id
  );

  const start_date = input.start_date || null;
  const end_date = input.end_date || null;

  const status = normalizeString(input.status);

  const errors = {};

  if (!teacher_id) { errors.teacher_id = 'Teacher is required';
  }

  if (!subject_id) { errors.subject_id = 'Subject is required';
  }

  if (!grade_id) {errors.grade_id = 'Grade is required';
  }

  if (!section_id) { errors.section_id = 'Section is required';
  }

  if (!academic_year_id) {errors.academic_year_id = 'Academic year is required';
  }

  if (
    start_date &&
    end_date &&
    new Date(end_date) < new Date(start_date)
  ) {
    errors.end_date ='End date must be after start date';
  }

  return {
    teacher_id,
    subject_id,
    grade_id,
    section_id,
    academic_year_id,
    start_date,
    end_date,
    status: status || 'ACTIVE',
    errors,
  };
}

function validateUpdateTeacherSubjectInput(
  input = {}
) {
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

  if (input.subject_id !== undefined) {
    const value = normalizeString(input.subject_id);

    if (!value) {
      errors.subject_id = 'Subject is required';
    } else {
      payload.subject_id = value;
    }
  }

  if (input.grade_id !== undefined) {
    const value = normalizeString(input.grade_id);

    if (!value) {
      errors.grade_id = 'Grade is required';
    } else {
      payload.grade_id = value;
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
    const value = normalizeString(
      input.academic_year_id
    );

    if (!value) {
      errors.academic_year_id =
        'Academic year is required';
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

  return {
    ...payload,
    errors,
  };
}

function validateTeacherSubjectId(id) {
  const errors = {};

  if (
    !id ||
    typeof id !== 'string' ||
    !id.trim()
  ) {
    errors.id =
      'Teacher subject id is required';
  }

  return {
    id: id?.trim(),
    errors,
  };
}

module.exports = {
  validateCreateTeacherSubjectInput,
  validateUpdateTeacherSubjectInput,
  validateTeacherSubjectId,
};