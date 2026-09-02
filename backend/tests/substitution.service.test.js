const test = require('node:test');
const assert = require('node:assert/strict');
const {
  validateCreateSubstitutionInput,
  validateUpdateSubstitutionStatusInput,
} = require('../src/modules/timetable/substitutions/substitution.validation');
const { SubstitutionService } = require('../src/modules/timetable/substitutions/substitution.service');

const VALID_ENTRY_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const VALID_TEACHER_ID = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';

test('validateCreateSubstitutionInput validates required fields and date format', () => {
  const { data, errors } = validateCreateSubstitutionInput({
    timetable_entry_id: VALID_ENTRY_ID,
    substitute_teacher_id: VALID_TEACHER_ID,
    substitution_date: '2026-09-07',
    reason: 'Medical appointment',
  });

  assert.equal(Object.keys(errors).length, 0);
  assert.equal(data.substitution_date, '2026-09-07');
  assert.equal(data.reason, 'Medical appointment');
});

test('validateCreateSubstitutionInput rejects invalid date format', () => {
  const { errors } = validateCreateSubstitutionInput({
    timetable_entry_id: VALID_ENTRY_ID,
    substitute_teacher_id: VALID_TEACHER_ID,
    substitution_date: '07-09-2026',
  });

  assert.ok(errors.substitution_date);
});

test('validateUpdateSubstitutionStatusInput validates status transition', () => {
  const valid = validateUpdateSubstitutionStatusInput({ status: 'APPROVED' });
  assert.equal(Object.keys(valid.errors).length, 0);
  assert.equal(valid.data.status, 'APPROVED');

  const invalid = validateUpdateSubstitutionStatusInput({ status: 'INVALID_STATUS' });
  assert.ok(invalid.errors.status);
});

test('SubstitutionService rejects when substitute teacher equals original teacher', async () => {
  const mockRepo = {
    findEntryDetails: async () => ({
      id: 'e-1',
      teacher_id: 't-original',
      day_of_week: 'MONDAY',
      period_id: 'p-1',
      is_break: false,
    }),
  };

  const service = new SubstitutionService(mockRepo);

  await assert.rejects(
    service.createSubstitution({
      timetable_entry_id: VALID_ENTRY_ID,
      substitute_teacher_id: 't-original',
      substitution_date: '2026-09-07',
    }),
    /cannot be the same/
  );
});

test('SubstitutionService rejects when date does not match day of week', async () => {
  const mockRepo = {
    findEntryDetails: async () => ({
      id: 'e-1',
      teacher_id: 't-original',
      day_of_week: 'FRIDAY',
      period_id: 'p-1',
      is_break: false,
    }),
  };

  const service = new SubstitutionService(mockRepo);

  // 2026-09-07 is Monday, not Friday
  await assert.rejects(
    service.createSubstitution({
      timetable_entry_id: VALID_ENTRY_ID,
      substitute_teacher_id: VALID_TEACHER_ID,
      substitution_date: '2026-09-07',
    }),
    /does not match entry schedule day/
  );
});

test('SubstitutionService detects substitute teacher schedule clash', async () => {
  const mockRepo = {
    findEntryDetails: async () => ({
      id: 'e-1',
      timetable_id: 'tt-1',
      teacher_id: 't-original',
      day_of_week: 'MONDAY',
      period_id: 'p-1',
      period_name: 'Period 1',
      is_break: false,
    }),
    checkTeacherBusyOnSlot: async () => ({
      isBusy: true,
      type: 'REGULAR_LESSON',
      details: { subject_name: 'Physics' },
    }),
  };

  const service = new SubstitutionService(mockRepo);

  await assert.rejects(
    service.createSubstitution({
      timetable_entry_id: VALID_ENTRY_ID,
      substitute_teacher_id: VALID_TEACHER_ID,
      substitution_date: '2026-09-07',
    }),
    /already occupied/
  );
});
