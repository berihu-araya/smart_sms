const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { buildTeacherDashboardPayload } = require('../src/services/dashboard.service');

describe('Teacher dashboard payload', () => {
  test('orders timetable lessons by day, period, and start time', () => {
    const payload = buildTeacherDashboardPayload({
      todayTimetable: [
        { id: 'later', day_of_week: 'MONDAY', period_order: 2, start_time: '08:40', end_time: '09:20' },
        { id: 'first', day_of_week: 'MONDAY', period_order: 1, start_time: '08:00', end_time: '08:40' },
      ],
      weeklySchedule: [
        { id: 'sat', day_of_week: 'SATURDAY', period_order: 1 },
        { id: 'mon', day_of_week: 'MONDAY', period_order: 1 },
      ],
    });

    assert.deepEqual(payload.todayTimetable.map((item) => item.id), ['first', 'later']);
    assert.deepEqual(payload.weeklySchedule.map((item) => item.id), ['mon', 'sat']);
  });

  test('keeps term teaching assignments when the daily timetable is empty', () => {
    const payload = buildTeacherDashboardPayload({
      todayTimetable: [],
      weeklySchedule: [],
      teachingAssignments: [{
        id: 'assignment-1',
        grade_id: 'grade-8',
        grade_name: 'Grade 8',
        section_id: 'section-a',
        section_name: 'A',
        subject_id: 'math',
        subject_name: 'Mathematics',
        student_count: 32,
        status: 'ACTIVE',
      }],
    });

    assert.equal(payload.todayTimetable.length, 0);
    assert.equal(payload.teachingAssignments.length, 1);
    assert.equal(payload.teachingAssignments[0].subjectName, 'Mathematics');
    assert.equal(payload.stats.totalStudents, 32);
  });

  test('uses the database-provided day and distinct student total', () => {
    const payload = buildTeacherDashboardPayload({
      currentDayOfWeek: 'THURSDAY',
      currentDate: '2026-09-17',
      totalStudentCount: 32,
      teachingAssignments: [
        { id: 'math', student_count: 32 },
        { id: 'science', student_count: 32 },
      ],
    });

    assert.equal(payload.currentDayOfWeek, 'THURSDAY');
    assert.equal(payload.currentDate, '2026-09-17');
    assert.equal(payload.stats.totalStudents, 32);
  });
});