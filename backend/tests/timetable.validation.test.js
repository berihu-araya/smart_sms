const test = require('node:test');
const assert = require('node:assert/strict');
const {
  validateCreateTimetableInput,
  validateUpdateTimetableInput,
  validateCreateEntryInput,
  validateUpdateEntryInput,
  validateTimetableId,
  validateEntryId,
} = require('../src/modules/timetable/timetable.validation');

const validUuid1 = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const validUuid2 = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
const validUuid3 = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';
const validUuid4 = 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44';
const validUuid5 = 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55';

test('validateCreateTimetableInput rejects missing academic_year_id or term', () => {
  const result = validateCreateTimetableInput({});
  assert.ok(result.errors.academic_year_id);
  assert.ok(result.errors.term);
  assert.ok(result.errors.name);
});

test('validateCreateTimetableInput accepts valid timetable draft', () => {
  const result = validateCreateTimetableInput({
    academic_year_id: validUuid1,
    term: 'Semester 1',
    name: '2026/27 Term 1 Master Schedule',
  });

  assert.equal(result.data.academic_year_id, validUuid1);
  assert.equal(result.data.term, 'Semester 1');
  assert.equal(result.data.name, '2026/27 Term 1 Master Schedule');
  assert.equal(result.data.status, 'DRAFT');
  assert.deepEqual(result.errors, {});
});

test('validateCreateEntryInput rejects missing relations', () => {
  const result = validateCreateEntryInput({});
  assert.ok(result.errors.timetable_id);
  assert.ok(result.errors.section_id);
  assert.ok(result.errors.subject_id);
  assert.ok(result.errors.teacher_id);
  assert.ok(result.errors.period_id);
  assert.ok(result.errors.day_of_week);
});

test('validateCreateEntryInput accepts valid entry', () => {
  const result = validateCreateEntryInput({
    timetable_id: validUuid1,
    section_id: validUuid2,
    subject_id: validUuid3,
    teacher_id: validUuid4,
    period_id: validUuid5,
    day_of_week: 'MONDAY',
  });

  assert.equal(result.data.timetable_id, validUuid1);
  assert.equal(result.data.section_id, validUuid2);
  assert.equal(result.data.subject_id, validUuid3);
  assert.equal(result.data.teacher_id, validUuid4);
  assert.equal(result.data.period_id, validUuid5);
  assert.equal(result.data.day_of_week, 'MONDAY');
  assert.equal(result.data.room_id, null);
  assert.deepEqual(result.errors, {});
});

test('validateCreateEntryInput rejects invalid day of week', () => {
  const result = validateCreateEntryInput({
    timetable_id: validUuid1,
    section_id: validUuid2,
    subject_id: validUuid3,
    teacher_id: validUuid4,
    period_id: validUuid5,
    day_of_week: 'FUNDAY',
  });

  assert.ok(result.errors.day_of_week);
});
