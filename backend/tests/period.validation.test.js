const test = require('node:test');
const assert = require('node:assert/strict');
const {
  validateCreatePeriodInput,
  validateUpdatePeriodInput,
  validatePeriodId,
  validateBulkReorderInput,
  timeToMinutes,
} = require('../src/modules/timetable/periods/period.validation');

const validUuid = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

test('timeToMinutes converts HH:MM string accurately', () => {
  assert.equal(timeToMinutes('08:00'), 480);
  assert.equal(timeToMinutes('08:45'), 525);
  assert.equal(timeToMinutes('14:30'), 870);
});

test('validateCreatePeriodInput rejects missing required fields', () => {
  const result = validateCreatePeriodInput({});
  assert.ok(result.errors.academic_year_id);
  assert.ok(result.errors.name);
  assert.ok(result.errors.start_time);
  assert.ok(result.errors.end_time);
  assert.ok(result.errors.period_order);
});

test('validateCreatePeriodInput rejects end_time before start_time', () => {
  const result = validateCreatePeriodInput({
    academic_year_id: validUuid,
    name: 'Period 1',
    start_time: '09:00',
    end_time: '08:30',
    period_order: 1,
  });
  assert.equal(result.errors.end_time, 'End time must be after start time');
});

test('validateCreatePeriodInput accepts valid lesson period', () => {
  const result = validateCreatePeriodInput({
    academic_year_id: validUuid,
    name: 'Period 1',
    period_type: 'LESSON',
    start_time: '08:00',
    end_time: '08:45',
    period_order: 1,
  });

  assert.equal(result.data.academic_year_id, validUuid);
  assert.equal(result.data.name, 'Period 1');
  assert.equal(result.data.period_type, 'LESSON');
  assert.equal(result.data.start_time, '08:00');
  assert.equal(result.data.end_time, '08:45');
  assert.equal(result.data.period_order, 1);
  assert.equal(result.data.is_break, false);
  assert.deepEqual(result.data.days_of_week, ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']);
  assert.deepEqual(result.errors, {});
});

test('validateCreatePeriodInput sets is_break automatically for BREAK period type', () => {
  const result = validateCreatePeriodInput({
    academic_year_id: validUuid,
    name: 'Morning Break',
    period_type: 'BREAK',
    start_time: '09:30',
    end_time: '10:00',
    period_order: 3,
  });

  assert.equal(result.data.period_type, 'BREAK');
  assert.equal(result.data.is_break, true);
});

test('validateBulkReorderInput validates item list', () => {
  const result = validateBulkReorderInput({
    items: [
      { id: validUuid, period_order: 1 },
      { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', period_order: 2 },
    ],
  });

  assert.equal(result.data.length, 2);
  assert.deepEqual(result.errors, {});
});
