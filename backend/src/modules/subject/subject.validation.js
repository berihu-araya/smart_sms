const { SUBJECT_STATUSES } = require('./subject.constants');

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeNumber(value) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const number = Number(value);

  return Number.isNaN(number) ? value : number;
}

function normalizeBoolean(value) {
  if (value === true || value === false) {
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

function validateCreateSubjectInput(input = {}) {
  const subject_code = normalizeString(input.subject_code).toUpperCase();
  const subject_name = normalizeString(input.subject_name);
  const short_name = normalizeString(input.short_name);
  const description = normalizeString(input.description);

  const credit_hours = normalizeNumber(input.credit_hours);
  const pass_mark = normalizeNumber(input.pass_mark);
  const max_mark = normalizeNumber(input.max_mark);

  const is_elective =
    normalizeBoolean(input.is_elective) ?? false;

  const is_lab =
    normalizeBoolean(input.is_lab) ?? false;

  const display_order =
    normalizeNumber(input.display_order) ?? 0;

  const status =
    normalizeString(input.status).toUpperCase() ||
    SUBJECT_STATUSES.ACTIVE;

  const errors = {};

  if (!subject_code) {
    errors.subject_code = 'Subject code is required';
  } else if (subject_code.length < 2 || subject_code.length > 20) {
    errors.subject_code =
      'Subject code must be between 2 and 20 characters';
  }

  if (!subject_name) {
    errors.subject_name = 'Subject name is required';
  } else if (subject_name.length < 2) {
    errors.subject_name =
      'Subject name must be at least 2 characters';
  }

  if (
    credit_hours !== undefined &&
    (Number.isNaN(credit_hours) || credit_hours < 0)
  ) {
    errors.credit_hours =
      'Credit hours must be a positive number';
  }

  if (
    pass_mark !== undefined &&
    (Number.isNaN(pass_mark) || pass_mark < 0)
  ) {
    errors.pass_mark =
      'Pass mark must be zero or greater';
  }

  if (
    max_mark !== undefined &&
    (Number.isNaN(max_mark) || max_mark <= 0)
  ) {
    errors.max_mark =
      'Maximum mark must be greater than zero';
  }

  if (
    pass_mark !== undefined &&
    max_mark !== undefined &&
    pass_mark > max_mark
  ) {
    errors.pass_mark =
      'Pass mark cannot be greater than maximum mark';
  }

  if (!Object.values(SUBJECT_STATUSES).includes(status)) {
    errors.status = 'Invalid subject status';
  }

  return {
    subject_code,
    subject_name,
    short_name: short_name || null,
    description: description || null,
    credit_hours,
    pass_mark,
    max_mark,
    is_elective,
    is_lab,
    display_order,
    status,
    errors,
  };
}

function validateUpdateSubjectInput(input = {}) {
  const errors = {};

  const payload = {};

  if (input.subject_code !== undefined) {
    payload.subject_code = normalizeString(
      input.subject_code
    ).toUpperCase();

    if (!payload.subject_code) {
      errors.subject_code = 'Subject code is required';
    } else if (
      payload.subject_code.length < 2 ||
      payload.subject_code.length > 20
    ) {
      errors.subject_code =
        'Subject code must be between 2 and 20 characters';
    }
  }

  if (input.subject_name !== undefined) {
    payload.subject_name = normalizeString(
      input.subject_name
    );

    if (!payload.subject_name) {
      errors.subject_name = 'Subject name is required';
    } else if (payload.subject_name.length < 2) {
      errors.subject_name =
        'Subject name must be at least 2 characters';
    }
  }

  if (input.short_name !== undefined) {
    payload.short_name =
      normalizeString(input.short_name) || null;
  }

  if (input.description !== undefined) {
    payload.description =
      normalizeString(input.description) || null;
  }

  if (input.credit_hours !== undefined) {
    payload.credit_hours = normalizeNumber(
      input.credit_hours
    );

    if (
      Number.isNaN(payload.credit_hours) ||
      payload.credit_hours < 0
    ) {
      errors.credit_hours =
        'Credit hours must be a positive number';
    }
  }

  if (input.pass_mark !== undefined) {
    payload.pass_mark = normalizeNumber(input.pass_mark);

    if (
      Number.isNaN(payload.pass_mark) ||
      payload.pass_mark < 0
    ) {
      errors.pass_mark =
        'Pass mark must be zero or greater';
    }
  }

  if (input.max_mark !== undefined) {
    payload.max_mark = normalizeNumber(input.max_mark);

    if (
      Number.isNaN(payload.max_mark) ||
      payload.max_mark <= 0
    ) {
      errors.max_mark =
        'Maximum mark must be greater than zero';
    }
  }

  const pass =
    payload.pass_mark ?? normalizeNumber(input.pass_mark);

  const max =
    payload.max_mark ?? normalizeNumber(input.max_mark);

  if (
    pass !== undefined &&
    max !== undefined &&
    pass > max
  ) {
    errors.pass_mark =
      'Pass mark cannot be greater than maximum mark';
  }

  if (input.is_elective !== undefined) {
    payload.is_elective = normalizeBoolean(
      input.is_elective
    );
  }

  if (input.is_lab !== undefined) {
    payload.is_lab = normalizeBoolean(input.is_lab);
  }

  if (input.display_order !== undefined) {
    payload.display_order = normalizeNumber(
      input.display_order
    );
  }

  if (input.status !== undefined) {
    payload.status = normalizeString(input.status).toUpperCase();

    if (
      !Object.values(SUBJECT_STATUSES).includes(
        payload.status
      )
    ) {
      errors.status = 'Invalid subject status';
    }
  }

  return {
    ...payload,
    errors,
  };
}

function validateSubjectId(id) {
  const errors = {};

  if (!id || typeof id !== 'string' || !id.trim()) {
    errors.id = 'Subject id is required';
  }

  return {
    id: id?.trim(),
    errors,
  };
}

module.exports = {
  validateCreateSubjectInput,
  validateUpdateSubjectInput,
  validateSubjectId,
};