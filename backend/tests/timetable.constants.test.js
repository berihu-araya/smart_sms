const test = require('node:test');
const assert = require('node:assert/strict');
const {
  TIMETABLE_STATUSES,
  PERIOD_TYPES,
  ROOM_TYPES,
  DAYS_OF_WEEK,
  SUBSTITUTION_STATUSES,
  CONFLICT_TYPES,
  CONFLICT_SEVERITY,
} = require('../src/modules/timetable/timetable.constants');

test('Timetable constants has expected statuses', () => {
  assert.equal(TIMETABLE_STATUSES.DRAFT, 'DRAFT');
  assert.equal(TIMETABLE_STATUSES.PUBLISHED, 'PUBLISHED');
  assert.equal(TIMETABLE_STATUSES.ARCHIVED, 'ARCHIVED');
});

test('Period types contains required types', () => {
  assert.equal(PERIOD_TYPES.LESSON, 'LESSON');
  assert.equal(PERIOD_TYPES.BREAK, 'BREAK');
  assert.equal(PERIOD_TYPES.ASSEMBLY, 'ASSEMBLY');
  assert.equal(PERIOD_TYPES.HOMEROOM, 'HOMEROOM');
});

test('Room types contains standard facility types', () => {
  assert.equal(ROOM_TYPES.NORMAL, 'NORMAL');
  assert.equal(ROOM_TYPES.LAB, 'LAB');
  assert.equal(ROOM_TYPES.COMPUTER_LAB, 'COMPUTER_LAB');
  assert.equal(ROOM_TYPES.LIBRARY, 'LIBRARY');
  assert.equal(ROOM_TYPES.GYM, 'GYM');
  assert.equal(ROOM_TYPES.AUDITORIUM, 'AUDITORIUM');
  assert.equal(ROOM_TYPES.OTHER, 'OTHER');
});

test('Days of week contains all 7 days in order', () => {
  assert.deepEqual(DAYS_OF_WEEK, [
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
    'SUNDAY',
  ]);
});

test('Substitution statuses contains lifecycle stages', () => {
  assert.equal(SUBSTITUTION_STATUSES.PENDING, 'PENDING');
  assert.equal(SUBSTITUTION_STATUSES.APPROVED, 'APPROVED');
  assert.equal(SUBSTITUTION_STATUSES.REJECTED, 'REJECTED');
  assert.equal(SUBSTITUTION_STATUSES.CANCELLED, 'CANCELLED');
});

test('Conflict types covers all critical constraints', () => {
  assert.equal(CONFLICT_TYPES.TEACHER, 'TEACHER');
  assert.equal(CONFLICT_TYPES.SECTION, 'SECTION');
  assert.equal(CONFLICT_TYPES.ROOM, 'ROOM');
  assert.equal(CONFLICT_TYPES.AVAILABILITY, 'AVAILABILITY');
  assert.equal(CONFLICT_TYPES.SUBJECT_ASSIGNMENT, 'SUBJECT_ASSIGNMENT');
  assert.equal(CONFLICT_TYPES.CAPACITY, 'CAPACITY');
  assert.equal(CONFLICT_TYPES.ROOM_TYPE, 'ROOM_TYPE');
});
