const { PERIOD_TYPES, DAYS_OF_WEEK, STANDARD_SCHOOL_DAYS } = require('../timetable.constants');

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/;

function isValidUuid(id) {
  return typeof id === 'string' && UUID_REGEX.test(id.trim());
}

function isValidTime(timeStr) {
  return typeof timeStr === 'string' && TIME_REGEX.test(timeStr.trim());
}

function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(':');
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

function validateCreatePeriodInput(input = {}) {
  const errors = {};

  const academicYearId = input.academic_year_id || input.academicYearId;
  if (!academicYearId || !isValidUuid(academicYearId)) {
    errors.academic_year_id = 'Valid Academic Year ID is required';
  }

  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (!name) {
    errors.name = 'Period name is required';
  } else if (name.length < 1 || name.length > 100) {
    errors.name = 'Period name must be between 1 and 100 characters';
  }

  let periodType = 'LESSON';
  if (input.period_type || input.periodType) {
    const raw = String(input.period_type || input.periodType).trim().toUpperCase();
    if (!Object.values(PERIOD_TYPES).includes(raw)) {
      errors.period_type = `Invalid period type. Allowed: ${Object.values(PERIOD_TYPES).join(', ')}`;
    } else {
      periodType = raw;
    }
  }

  const startTime = typeof input.start_time === 'string' ? input.start_time.trim() : (typeof input.startTime === 'string' ? input.startTime.trim() : '');
  if (!startTime || !isValidTime(startTime)) {
    errors.start_time = 'Valid start time (HH:MM) is required';
  }

  const endTime = typeof input.end_time === 'string' ? input.end_time.trim() : (typeof input.endTime === 'string' ? input.endTime.trim() : '');
  if (!endTime || !isValidTime(endTime)) {
    errors.end_time = 'Valid end time (HH:MM) is required';
  }

  if (startTime && endTime && isValidTime(startTime) && isValidTime(endTime)) {
    if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
      errors.end_time = 'End time must be after start time';
    }
  }

  let periodOrder = 1;
  const rawOrder = input.period_order !== undefined ? input.period_order : input.periodOrder;
  if (rawOrder !== undefined && rawOrder !== null && rawOrder !== '') {
    const parsed = Number(rawOrder);
    if (!Number.isInteger(parsed) || parsed < 1) {
      errors.period_order = 'Period order must be a positive integer';
    } else {
      periodOrder = parsed;
    }
  } else {
    errors.period_order = 'Period order is required';
  }

  const isBreak = input.is_break !== undefined
    ? Boolean(input.is_break)
    : (input.isBreak !== undefined ? Boolean(input.isBreak) : periodType === 'BREAK');

  let daysOfWeek = STANDARD_SCHOOL_DAYS;
  const rawDays = input.days_of_week || input.daysOfWeek;
  if (Array.isArray(rawDays) && rawDays.length > 0) {
    const normalizedDays = rawDays.map((d) => String(d).trim().toUpperCase());
    const invalidDays = normalizedDays.filter((d) => !DAYS_OF_WEEK.includes(d));
    if (invalidDays.length > 0) {
      errors.days_of_week = `Invalid days: ${invalidDays.join(', ')}`;
    } else {
      daysOfWeek = normalizedDays;
    }
  }

  const isActive = input.is_active !== undefined
    ? Boolean(input.is_active)
    : (input.isActive !== undefined ? Boolean(input.isActive) : true);

  return {
    data: {
      academic_year_id: academicYearId,
      name,
      period_type: periodType,
      start_time: startTime,
      end_time: endTime,
      period_order: periodOrder,
      is_break: isBreak,
      days_of_week: daysOfWeek,
      is_active: isActive,
    },
    errors,
  };
}

function validateUpdatePeriodInput(input = {}) {
  const errors = {};
  const data = {};

  if (input.name !== undefined) {
    const name = String(input.name).trim();
    if (!name) {
      errors.name = 'Period name cannot be empty';
    } else if (name.length > 100) {
      errors.name = 'Period name cannot exceed 100 characters';
    } else {
      data.name = name;
    }
  }

  if (input.period_type !== undefined || input.periodType !== undefined) {
    const raw = String(input.period_type !== undefined ? input.period_type : input.periodType).trim().toUpperCase();
    if (!Object.values(PERIOD_TYPES).includes(raw)) {
      errors.period_type = `Invalid period type. Allowed: ${Object.values(PERIOD_TYPES).join(', ')}`;
    } else {
      data.period_type = raw;
    }
  }

  const startTime = input.start_time !== undefined ? input.start_time : input.startTime;
  const endTime = input.end_time !== undefined ? input.end_time : input.endTime;

  if (startTime !== undefined) {
    if (!isValidTime(startTime)) {
      errors.start_time = 'Valid start time (HH:MM) is required';
    } else {
      data.start_time = startTime.trim();
    }
  }

  if (endTime !== undefined) {
    if (!isValidTime(endTime)) {
      errors.end_time = 'Valid end time (HH:MM) is required';
    } else {
      data.end_time = endTime.trim();
    }
  }

  if (data.start_time && data.end_time) {
    if (timeToMinutes(data.end_time) <= timeToMinutes(data.start_time)) {
      errors.end_time = 'End time must be after start time';
    }
  }

  if (input.period_order !== undefined || input.periodOrder !== undefined) {
    const rawOrder = input.period_order !== undefined ? input.period_order : input.periodOrder;
    const parsed = Number(rawOrder);
    if (!Number.isInteger(parsed) || parsed < 1) {
      errors.period_order = 'Period order must be a positive integer';
    } else {
      data.period_order = parsed;
    }
  }

  if (input.is_break !== undefined || input.isBreak !== undefined) {
    data.is_break = Boolean(input.is_break !== undefined ? input.is_break : input.isBreak);
  }

  const rawDays = input.days_of_week || input.daysOfWeek;
  if (rawDays !== undefined) {
    if (!Array.isArray(rawDays) || rawDays.length === 0) {
      errors.days_of_week = 'days_of_week must be a non-empty array';
    } else {
      const normalizedDays = rawDays.map((d) => String(d).trim().toUpperCase());
      const invalidDays = normalizedDays.filter((d) => !DAYS_OF_WEEK.includes(d));
      if (invalidDays.length > 0) {
        errors.days_of_week = `Invalid days: ${invalidDays.join(', ')}`;
      } else {
        data.days_of_week = normalizedDays;
      }
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

function validatePeriodId(id) {
  if (!id || typeof id !== 'string' || !isValidUuid(id)) {
    return {
      isValid: false,
      error: 'Invalid or missing Period ID (must be a valid UUID)',
    };
  }
  return {
    isValid: true,
    error: null,
  };
}

function validateBulkReorderInput(input = {}) {
  const errors = {};
  const items = Array.isArray(input.items) ? input.items : (Array.isArray(input) ? input : []);

  if (items.length === 0) {
    errors.items = 'Items array is required for reordering';
    return { data: [], errors };
  }

  const validated = [];
  items.forEach((item, idx) => {
    if (!item.id || !isValidUuid(item.id)) {
      errors[`items[${idx}].id`] = 'Valid Period UUID is required';
    }
    const order = Number(item.period_order !== undefined ? item.period_order : item.periodOrder);
    if (!Number.isInteger(order) || order < 1) {
      errors[`items[${idx}].period_order`] = 'period_order must be a positive integer';
    }
    validated.push({
      id: item.id,
      period_order: order,
    });
  });

  return {
    data: validated,
    errors,
  };
}

module.exports = {
  validateCreatePeriodInput,
  validateUpdatePeriodInput,
  validatePeriodId,
  validateBulkReorderInput,
  timeToMinutes,
  isValidUuid,
};
