const test = require('node:test');
const assert = require('node:assert/strict');
const ConflictService = require('../src/modules/timetable/conflict/conflict.service');
const { CONFLICT_TYPES, CONFLICT_SEVERITY } = require('../src/modules/timetable/timetable.constants');

const conflictService = new ConflictService(null);

const baseTimetable = {
  id: 'tt-01',
  name: '2026/27 Term 1 Schedule',
  academic_year_name: '2026/2027',
  term: 'Semester 1',
  status: 'DRAFT',
  version: 1,
};

test('Conflict Engine detects Teacher Double-Booking (BLOCK)', () => {
  const result = conflictService.detectConflictsFromData({
    timetable: baseTimetable,
    entries: [
      {
        entry_id: 'e-1',
        teacher_id: 't-1',
        teacher_name: 'Mr. John',
        section_id: 'sec-1',
        section_name: '10-A',
        subject_id: 'sub-1',
        subject_name: 'Mathematics',
        period_id: 'p-1',
        period_name: 'Period 1',
        day_of_week: 'MONDAY',
      },
      {
        entry_id: 'e-2',
        teacher_id: 't-1',
        teacher_name: 'Mr. John',
        section_id: 'sec-2',
        section_name: '9-B',
        subject_id: 'sub-2',
        subject_name: 'Physics',
        period_id: 'p-1',
        period_name: 'Period 1',
        day_of_week: 'MONDAY',
      },
    ],
  });

  assert.equal(result.hasConflict, true);
  assert.equal(result.isPublishable, false);
  const teacherConflict = result.conflicts.find((c) => c.type === CONFLICT_TYPES.TEACHER);
  assert.ok(teacherConflict);
  assert.equal(teacherConflict.severity, CONFLICT_SEVERITY.BLOCK);
});

test('Conflict Engine detects Section Double-Booking (BLOCK)', () => {
  const result = conflictService.detectConflictsFromData({
    timetable: baseTimetable,
    entries: [
      {
        entry_id: 'e-1',
        teacher_id: 't-1',
        teacher_name: 'Mr. John',
        section_id: 'sec-1',
        section_name: '10-A',
        subject_id: 'sub-1',
        subject_name: 'Mathematics',
        period_id: 'p-1',
        period_name: 'Period 1',
        day_of_week: 'MONDAY',
      },
      {
        entry_id: 'e-2',
        teacher_id: 't-2',
        teacher_name: 'Ms. Sarah',
        section_id: 'sec-1',
        section_name: '10-A',
        subject_id: 'sub-3',
        subject_name: 'English',
        period_id: 'p-1',
        period_name: 'Period 1',
        day_of_week: 'MONDAY',
      },
    ],
  });

  assert.equal(result.hasConflict, true);
  const sectionConflict = result.conflicts.find((c) => c.type === CONFLICT_TYPES.SECTION);
  assert.ok(sectionConflict);
  assert.equal(sectionConflict.severity, CONFLICT_SEVERITY.BLOCK);
});

test('Conflict Engine detects Room Double-Booking (BLOCK)', () => {
  const result = conflictService.detectConflictsFromData({
    timetable: baseTimetable,
    entries: [
      {
        entry_id: 'e-1',
        teacher_id: 't-1',
        teacher_name: 'Mr. John',
        section_id: 'sec-1',
        section_name: '10-A',
        subject_id: 'sub-1',
        subject_name: 'Mathematics',
        room_id: 'r-101',
        room_name: 'Room 101',
        period_id: 'p-1',
        period_name: 'Period 1',
        day_of_week: 'MONDAY',
      },
      {
        entry_id: 'e-2',
        teacher_id: 't-2',
        teacher_name: 'Ms. Sarah',
        section_id: 'sec-2',
        section_name: '9-B',
        subject_id: 'sub-3',
        subject_name: 'English',
        room_id: 'r-101',
        room_name: 'Room 101',
        period_id: 'p-1',
        period_name: 'Period 1',
        day_of_week: 'MONDAY',
      },
    ],
  });

  assert.equal(result.hasConflict, true);
  const roomConflict = result.conflicts.find((c) => c.type === CONFLICT_TYPES.ROOM);
  assert.ok(roomConflict);
  assert.equal(roomConflict.severity, CONFLICT_SEVERITY.BLOCK);
});

test('Conflict Engine rejects scheduling during Break Periods (BLOCK)', () => {
  const result = conflictService.detectConflictsFromData({
    timetable: baseTimetable,
    entries: [
      {
        entry_id: 'e-1',
        teacher_id: 't-1',
        teacher_name: 'Mr. John',
        section_id: 'sec-1',
        section_name: '10-A',
        subject_id: 'sub-1',
        subject_name: 'Mathematics',
        period_id: 'p-break',
        period_name: 'Morning Break',
        is_break: true,
        day_of_week: 'MONDAY',
      },
    ],
  });

  assert.equal(result.hasConflict, true);
  const breakConflict = result.conflicts.find((c) => c.type === CONFLICT_TYPES.BREAK);
  assert.ok(breakConflict);
  assert.equal(breakConflict.severity, CONFLICT_SEVERITY.BLOCK);
});

test('Conflict Engine detects Teacher Availability restriction (WARNING)', () => {
  const result = conflictService.detectConflictsFromData({
    timetable: baseTimetable,
    entries: [
      {
        entry_id: 'e-1',
        teacher_id: 't-1',
        teacher_name: 'Mr. John',
        section_id: 'sec-1',
        section_name: '10-A',
        subject_id: 'sub-1',
        subject_name: 'Mathematics',
        period_id: 'p-3',
        period_name: 'Period 3',
        day_of_week: 'MONDAY',
      },
    ],
    availabilities: [
      {
        teacher_id: 't-1',
        day_of_week: 'MONDAY',
        period_id: 'p-3',
        is_available: false,
        reason: 'Department Head Meeting',
      },
    ],
  });

  assert.equal(result.hasWarnings, true);
  const availConflict = result.conflicts.find((c) => c.type === CONFLICT_TYPES.AVAILABILITY);
  assert.ok(availConflict);
  assert.equal(availConflict.severity, CONFLICT_SEVERITY.WARNING);
  assert.match(availConflict.message, /Department Head Meeting/);
});

test('Conflict Engine detects Room Capacity and Room Type incompatibility (WARNING)', () => {
  const result = conflictService.detectConflictsFromData({
    timetable: baseTimetable,
    entries: [
      {
        entry_id: 'e-1',
        teacher_id: 't-1',
        teacher_name: 'Mr. John',
        section_id: 'sec-1',
        section_name: '10-A',
        section_capacity: 45,
        subject_id: 'sub-lab',
        subject_name: 'Chemistry',
        required_room_type: 'LAB',
        room_id: 'r-small',
        room_name: 'Small Classroom',
        room_type: 'NORMAL',
        room_capacity: 30,
        period_id: 'p-1',
        period_name: 'Period 1',
        day_of_week: 'TUESDAY',
      },
    ],
  });

  const capacityConflict = result.conflicts.find((c) => c.type === CONFLICT_TYPES.CAPACITY);
  assert.ok(capacityConflict);
  assert.match(capacityConflict.message, /exceeds/);

  const roomTypeConflict = result.conflicts.find((c) => c.type === CONFLICT_TYPES.ROOM_TYPE);
  assert.ok(roomTypeConflict);
  assert.match(roomTypeConflict.message, /requires a LAB room/);
});

test('Conflict Engine tracks Teacher Workload and Subject Requirements', () => {
  const result = conflictService.detectConflictsFromData({
    timetable: baseTimetable,
    entries: [
      {
        entry_id: 'e-1',
        teacher_id: 't-1',
        teacher_name: 'Mr. John',
        teacher_max_periods: 2,
        section_id: 'sec-1',
        section_name: '10-A',
        grade_id: 'g-10',
        subject_id: 'sub-math',
        subject_name: 'Mathematics',
        period_id: 'p-1',
        period_name: 'Period 1',
        day_of_week: 'MONDAY',
      },
      {
        entry_id: 'e-2',
        teacher_id: 't-1',
        teacher_name: 'Mr. John',
        teacher_max_periods: 2,
        section_id: 'sec-1',
        section_name: '10-A',
        grade_id: 'g-10',
        subject_id: 'sub-math',
        subject_name: 'Mathematics',
        period_id: 'p-2',
        period_name: 'Period 2',
        day_of_week: 'MONDAY',
      },
      {
        entry_id: 'e-3',
        teacher_id: 't-1',
        teacher_name: 'Mr. John',
        teacher_max_periods: 2,
        section_id: 'sec-1',
        section_name: '10-A',
        grade_id: 'g-10',
        subject_id: 'sub-math',
        subject_name: 'Mathematics',
        period_id: 'p-3',
        period_name: 'Period 3',
        day_of_week: 'MONDAY',
      },
    ],
    gradeSubjects: [
      {
        grade_id: 'g-10',
        grade_name: 'Grade 10',
        subject_id: 'sub-math',
        subject_name: 'Mathematics',
        subject_code: 'MTH-10',
        is_compulsory: true,
        required_weekly_periods: 5,
      },
    ],
    sections: [
      {
        section_id: 'sec-1',
        section_name: '10-A',
        grade_id: 'g-10',
        grade_name: 'Grade 10',
      },
    ],
  });

  // Workload: 3 scheduled vs 2 max
  const workloadWarning = result.conflicts.find((c) => c.type === CONFLICT_TYPES.WORKLOAD);
  assert.ok(workloadWarning);
  assert.match(workloadWarning.message, /3 \/ 2 periods/);

  // Requirements: 3 scheduled vs 5 required -> missing 2
  const reqWarning = result.conflicts.find((c) => c.type === CONFLICT_TYPES.REQUIREMENTS);
  assert.ok(reqWarning);
  assert.match(reqWarning.message, /missing 2 period\(s\)/);

  assert.equal(result.subjectCoverage[0].status, 'UNDER_ALLOCATED');
  assert.equal(result.subjectCoverage[0].difference, -2);
});
