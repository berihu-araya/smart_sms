const { DAYS_OF_WEEK } = require('../timetable.constants');

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUuid(id) {
  return typeof id === 'string' && UUID_REGEX.test(id.trim());
}

function validateBatchAvailabilityInput(input = {}) {
  const errors = {};

  const teacherId = input.teacher_id || input.teacherId;
  if (!teacherId || !isValidUuid(teacherId)) {
    errors.teacher_id = 'Valid Teacher ID is required';
  }

  const academicYearId = input.academic_year_id || input.academicYearId;
  if (!academicYearId || !isValidUuid(academicYearId)) {
    errors.academic_year_id = 'Valid Academic Year ID is required';
  }

  const slots = Array.isArray(input.slots) ? input.slots : [];
  if (slots.length === 0) {
    errors.slots = 'Slots array cannot be empty';
  }

  const validatedSlots = [];
  slots.forEach((slot, idx) => {
    const day = String(slot.day_of_week || slot.dayOfWeek || '').trim().toUpperCase();
    if (!DAYS_OF_WEEK.includes(day)) {
      errors[`slots[${idx}].day_of_week`] = `Invalid day of week: ${day}`;
    }

    const periodId = slot.period_id || slot.periodId;
    if (!periodId || !isValidUuid(periodId)) {
      errors[`slots[${idx}].period_id`] = 'Valid Period ID is required';
    }

    const isAvailable = slot.is_available !== undefined
      ? Boolean(slot.is_available)
      : (slot.isAvailable !== undefined ? Boolean(slot.isAvailable) : true);

    const reason = typeof slot.reason === 'string' ? slot.reason.trim() : null;

    validatedSlots.push({
      day_of_week: day,
      period_id: periodId,
      is_available: isAvailable,
      reason,
    });
  });

  return {
    data: {
      teacher_id: teacherId,
      academic_year_id: academicYearId,
      slots: validatedSlots,
    },
    errors,
  };
}

module.exports = {
  validateBatchAvailabilityInput,
  isValidUuid,
};
