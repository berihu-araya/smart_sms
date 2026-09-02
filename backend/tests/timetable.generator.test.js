const test = require('node:test');
const assert = require('node:assert/strict');
const TimetableGeneratorService = require('../src/modules/timetable/generator/generator.service');

test('TimetableGeneratorService rejects when timetable not found', async () => {
  const mockDb = {
    query: async () => ({ rows: [] }),
  };

  const service = new TimetableGeneratorService(mockDb);

  await assert.rejects(
    service.generateSchedule('00000000-0000-0000-0000-000000000000'),
    /Timetable not found/
  );
});

test('TimetableGeneratorService rejects when no active lesson periods exist', async () => {
  const mockDb = {
    query: async (sql) => {
      if (sql.includes('FROM timetables')) {
        return { rows: [{ id: 'tt-1', academic_year_id: 'ay-1' }] };
      }
      if (sql.includes('FROM periods')) {
        return { rows: [] };
      }
      return { rows: [] };
    },
  };

  const service = new TimetableGeneratorService(mockDb);

  await assert.rejects(
    service.generateSchedule('00000000-0000-0000-0000-000000000001'),
    /No active lesson periods found/
  );
});

test('TimetableGeneratorService successfully generates conflict-free schedule', async () => {
  const insertedEntries = [];

  const mockDb = {
    query: async (sql) => {
      if (sql.includes('FROM timetables')) {
        return { rows: [{ id: 'tt-1', academic_year_id: 'ay-1' }] };
      }
      if (sql.includes('FROM periods')) {
        return {
          rows: [
            { id: 'p-1', name: 'Period 1', period_order: 1, is_break: false },
            { id: 'p-2', name: 'Period 2', period_order: 2, is_break: false },
            { id: 'p-3', name: 'Period 3', period_order: 3, is_break: false },
            { id: 'p-4', name: 'Period 4', period_order: 4, is_break: false },
          ],
        };
      }
      if (sql.includes('FROM sections')) {
        return {
          rows: [
            { id: 'sec-1', name: '10-A', grade_id: 'g-10', grade_name: 'Grade 10', default_room_id: 'rm-1' },
            { id: 'sec-2', name: '10-B', grade_id: 'g-10', grade_name: 'Grade 10', default_room_id: 'rm-2' },
          ],
        };
      }
      if (sql.includes('FROM grade_subjects')) {
        return {
          rows: [
            { grade_id: 'g-10', subject_id: 'sub-math', weekly_periods: 3, subject_name: 'Math', required_room_type: 'CLASSROOM' },
            { grade_id: 'g-10', subject_id: 'sub-phy', weekly_periods: 2, subject_name: 'Physics', required_room_type: 'SCIENCE_LAB' },
          ],
        };
      }
      if (sql.includes('FROM teacher_subjects')) {
        return {
          rows: [
            { teacher_id: 't-math', subject_id: 'sub-math', section_id: 'sec-1', teacher_name: 'Mr. Math', max_weekly_periods: 30 },
            { teacher_id: 't-math', subject_id: 'sub-math', section_id: 'sec-2', teacher_name: 'Mr. Math', max_weekly_periods: 30 },
            { teacher_id: 't-phy', subject_id: 'sub-phy', section_id: 'sec-1', teacher_name: 'Dr. Physics', max_weekly_periods: 30 },
            { teacher_id: 't-phy', subject_id: 'sub-phy', section_id: 'sec-2', teacher_name: 'Dr. Physics', max_weekly_periods: 30 },
          ],
        };
      }
      if (sql.includes('FROM teachers')) {
        return {
          rows: [
            { id: 't-math', teacher_name: 'Mr. Math', max_weekly_periods: 30 },
            { id: 't-phy', teacher_name: 'Dr. Physics', max_weekly_periods: 30 },
          ],
        };
      }
      if (sql.includes('FROM teacher_availabilities')) {
        return { rows: [] };
      }
      if (sql.includes('FROM rooms')) {
        return {
          rows: [
            { id: 'rm-1', name: 'Room 101', room_type: 'CLASSROOM', capacity: 40 },
            { id: 'rm-2', name: 'Room 102', room_type: 'CLASSROOM', capacity: 40 },
            { id: 'rm-lab', name: 'Physics Lab', room_type: 'SCIENCE_LAB', capacity: 35 },
          ],
        };
      }
      return { rows: [] };
    },
    connect: async () => ({
      query: async (sql, values) => {
        if (sql.includes('INSERT INTO timetable_entries')) {
          insertedEntries.push(values);
        }
      },
      release: () => {},
    }),
  };

  const service = new TimetableGeneratorService(mockDb);

  const result = await service.generateSchedule('tt-1', {
    clearExisting: true,
  });

  // Total required: 2 sections * (3 Math + 2 Physics) = 10 lessons
  assert.equal(result.totalLessonsRequired, 10);
  assert.equal(result.totalLessonsPlaced, 10);
  assert.equal(result.coveragePercentage, 100);
  assert.equal(result.totalEntriesCreated, 10);
  assert.equal(result.unscheduledCount, 0);

  // Validate no two entries have same (teacher_id, day, period) or (section_id, day, period) or (room_id, day, period)
  const teacherSlots = new Set();
  const sectionSlots = new Set();
  const roomSlots = new Set();

  for (const entry of insertedEntries) {
    const [, sectionId, , teacherId, roomId, day, periodId] = entry;

    const tKey = `${teacherId}_${day}_${periodId}`;
    const sKey = `${sectionId}_${day}_${periodId}`;
    const rKey = `${roomId}_${day}_${periodId}`;

    assert.ok(!teacherSlots.has(tKey), `Teacher double booked: ${tKey}`);
    assert.ok(!sectionSlots.has(sKey), `Section double booked: ${sKey}`);
    assert.ok(!roomSlots.has(rKey), `Room double booked: ${rKey}`);

    teacherSlots.add(tKey);
    sectionSlots.add(sKey);
    roomSlots.add(rKey);
  }
});
