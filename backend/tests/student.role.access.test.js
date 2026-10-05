const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { buildStudentDashboardPayload, buildDashboardPayload } = require('../src/services/dashboard.service');
const { attachStudentScope, requireStudentOwnParam, requireStudentScopeMatch } = require('../src/middlewares/student.scope');

describe('Student Role Access & Dashboard Payloads', () => {
  test('buildStudentDashboardPayload formats student profile, academic stats, and schedules', () => {
    const mockStudent = {
      id: 'student-123',
      admission_number: 'ADM-2026-001',
      first_name: 'Alex',
      last_name: 'Johnson',
      gender: 'MALE',
      roll_number: '12',
      date_of_birth: '2010-05-15',
      status: 'ACTIVE',
      grade_id: 'grade-10',
      grade_name: 'Grade 10',
      section_id: 'section-10a',
      section_name: '10-A',
      room_number: 'Room 204',
      school_name: 'Smart SMS High',
    };

    const mockSubjects = [
      { id: 'sub-1', subject_name: 'Mathematics', subject_code: 'MATH-10', credit_hours: 4 },
      { id: 'sub-2', subject_name: 'English', subject_code: 'ENG-10', credit_hours: 3 },
    ];

    const mockAttendance = {
      total: 20,
      present: 18,
      late: 1,
      absent: 1,
      excused: 0,
    };

    const mockAssignments = [
      { id: 'a-1', title: 'Algebra Homework', submission_status: 'NOT_SUBMITTED', max_marks: 50 },
      { id: 'a-2', title: 'Essay Writing', submission_status: 'SUBMITTED', max_marks: 100 },
    ];

    const mockExams = [
      { id: 'e-1', title: 'Midterm Exam', exam_type: 'MIDTERM', max_marks: 100, weight_percentage: 30 },
    ];

    const mockMarks = [
      { id: 'm-1', score: 85, max_marks: 100, percentage: 85, grade_letter: 'A' },
      { id: 'm-2', score: 90, max_marks: 100, percentage: 90, grade_letter: 'A' },
    ];

    const mockSchedule = [
      { id: 'sch-1', period_name: 'Period 1', period_type: 'LESSON', subject_name: 'Mathematics' },
      { id: 'sch-2', period_name: 'Period 2', period_type: 'LESSON', subject_name: 'English' },
      { id: 'sch-3', period_name: 'Break', period_type: 'BREAK', subject_name: null },
    ];

    const payload = buildStudentDashboardPayload({
      student: mockStudent,
      subjects: mockSubjects,
      attendance: mockAttendance,
      attendanceTrend: [{ label: 'Week 1', rate: 95 }],
      assignments: mockAssignments,
      exams: mockExams,
      marks: mockMarks,
      todaySchedule: mockSchedule,
    });

    assert.equal(payload.isStudent, true);
    assert.equal(payload.student.id, 'student-123');
    assert.equal(payload.student.name, 'Alex Johnson');
    assert.equal(payload.student.gradeName, 'Grade 10');
    assert.equal(payload.student.sectionName, '10-A');
    assert.equal(payload.student.roomNumber, 'Room 204');

    // Stats
    assert.equal(payload.stats.enrolledSubjectsCount, 2);
    assert.equal(payload.stats.attendanceRate, 95); // (18+1)/20 * 100 = 95%
    assert.equal(payload.stats.averageScore, 87.5); // (85+90)/2 = 87.5%
    assert.equal(payload.stats.pendingAssignmentsCount, 1);
    assert.equal(payload.stats.submittedAssignmentsCount, 1);
    assert.equal(payload.stats.upcomingExamsCount, 1);
    assert.equal(payload.stats.todayClassesCount, 2); // Excludes BREAK

    // Data structures
    assert.equal(payload.subjects.length, 2);
    assert.equal(payload.todaySchedule.length, 3);
    assert.equal(payload.assignments.length, 2);
    assert.equal(payload.upcomingExams.length, 1);
    assert.equal(payload.recentMarks.length, 2);
  });

  test('buildStudentDashboardPayload gracefully handles empty/unassigned student profile', () => {
    const emptyStudent = {
      id: null,
      first_name: 'New',
      last_name: 'Student',
      status: 'ACTIVE',
      grade_id: null,
      grade_name: null,
      section_id: null,
      section_name: null,
    };

    const payload = buildStudentDashboardPayload({
      student: emptyStudent,
      subjects: [],
      attendance: {},
      attendanceTrend: [],
      assignments: [],
      exams: [],
      marks: [],
      todaySchedule: [],
    });

    assert.equal(payload.isStudent, true);
    assert.equal(payload.student.name, 'New Student');
    assert.equal(payload.student.gradeName, null);
    assert.equal(payload.student.sectionName, null);
    assert.equal(payload.stats.enrolledSubjectsCount, 0);
    assert.equal(payload.stats.attendanceRate, 100);
    assert.equal(payload.stats.averageScore, 0);
    assert.equal(payload.stats.pendingAssignmentsCount, 0);
    assert.equal(payload.stats.todayClassesCount, 0);
    assert.equal(payload.subjects.length, 0);
    assert.equal(payload.todaySchedule.length, 0);
  });

  test('attachStudentScope ignores non-student roles and attaches student context for Student', async () => {
    // 1. Admin test
    const adminReq = { user: { sub: 'admin-1', role: 'School Admin' } };
    const res = {};
    let nextCalled = false;
    const next = () => { nextCalled = true; };

    await attachStudentScope(adminReq, res, next);
    assert.equal(nextCalled, true);
    assert.equal(adminReq.studentScope, undefined);
  });

  test('requireStudentOwnParam allows student own id and blocks other ids', () => {
    const studentReq = {
      user: { role: 'Student' },
      studentScope: { student_id: 'stu-1' },
      params: { studentId: 'stu-1' },
    };
    let nextCalled = false;
    const next = () => { nextCalled = true; };
    const res = {
      statusCode: 200,
      status(c) { this.statusCode = c; return this; },
      json(payload) { this.body = payload; return this; },
    };

    const guard = requireStudentOwnParam('studentId');
    guard(studentReq, res, next);
    assert.equal(nextCalled, true);

    // Foreign student id
    const intruderReq = {
      user: { role: 'Student' },
      studentScope: { student_id: 'stu-1' },
      params: { studentId: 'stu-2' },
    };
    let intruderNextCalled = false;
    const intruderRes = {
      statusCode: 200,
      status(c) { this.statusCode = c; return this; },
      json(payload) { this.body = payload; return this; },
    };
    guard(intruderReq, intruderRes, () => { intruderNextCalled = true; });
    assert.equal(intruderNextCalled, false);
    assert.equal(intruderRes.statusCode, 403);
    assert.match(intruderRes.body.message, /Students can only access their own records/);

    // Student requesting 'me'
    const meReq = {
      user: { role: 'Student' },
      studentScope: { student_id: 'stu-1' },
      params: { studentId: 'me' },
    };
    let meNextCalled = false;
    guard(meReq, res, () => { meNextCalled = true; });
    assert.equal(meNextCalled, true);
  });

  test('requireStudentScopeMatch validates section/grade scope match', () => {
    const validSectionReq = {
      user: { role: 'Student' },
      studentScope: { section_id: 'sec-10a' },
      params: { id: 'sec-10a' },
    };
    let nextCalled = false;
    const next = () => { nextCalled = true; };
    const res = {
      statusCode: 200,
      status(c) { this.statusCode = c; return this; },
      json(payload) { this.body = payload; return this; },
    };

    const sectionGuard = requireStudentScopeMatch('section_id', 'id');
    sectionGuard(validSectionReq, res, next);
    assert.equal(nextCalled, true);

    // Mismatched section
    const foreignSectionReq = {
      user: { role: 'Student' },
      studentScope: { section_id: 'sec-10a' },
      params: { id: 'sec-10b' },
    };
    let foreignNextCalled = false;
    const foreignRes = {
      statusCode: 200,
      status(c) { this.statusCode = c; return this; },
      json(payload) { this.body = payload; return this; },
    };
    sectionGuard(foreignSectionReq, foreignRes, () => { foreignNextCalled = true; });
    assert.equal(foreignNextCalled, false);
    assert.equal(foreignRes.statusCode, 403);
  });

  test('ResultService progressive grade calculation immediately evaluates partial assessments', async () => {
    const ResultService = require('../src/modules/results/result.service');

    const mockRepo = {
      getGradingScales: async () => [
        { grade_letter: 'A', min_score: 80, max_score: 100, grade_point: 4.0, description: 'Excellent' },
        { grade_letter: 'B', min_score: 70, max_score: 79.99, grade_point: 3.0, description: 'Very Good' },
        { grade_letter: 'C', min_score: 60, max_score: 69.99, grade_point: 2.0, description: 'Satisfactory' },
        { grade_letter: 'D', min_score: 50, max_score: 59.99, grade_point: 1.0, description: 'Pass' },
        { grade_letter: 'F', min_score: 0, max_score: 49.99, grade_point: 0.0, description: 'Fail' },
      ],
      getSectionStudents: async () => [
        { id: 's-1', admission_number: 'ADM-01', first_name: 'John', last_name: 'Doe', gender: 'MALE', section_name: '10A', grade_name: 'Grade 10' },
      ],
      getSectionSubjects: async () => [
        { id: 'sub-math', name: 'Mathematics', code: 'MATH101' },
      ],
      getSectionMarks: async () => [
        // Only 1 quiz of 20% weight entered so far, student scored 18/20 (90%)
        {
          student_id: 's-1',
          subject_id: 'sub-math',
          exam_id: 'e-q1',
          score: 18,
          is_absent: false,
          exam_title: 'Quiz 1',
          exam_type: 'QUIZ',
          weight_percentage: 20,
          max_marks: 20,
          term_or_semester: 'Semester 1',
          subject_name: 'Mathematics',
          subject_code: 'MATH101',
        },
      ],
    };

    const service = new ResultService(mockRepo);
    const result = await service.calculateSectionResults({ sectionId: 'sec-10a', term: 'Semester 1' });

    assert.equal(result.totalStudents, 1);
    assert.equal(result.completedStudentsCount, 1);
    const student = result.rankings[0];
    assert.equal(student.completedSubjectsCount, 1);
    // Student scored 18/20 in 20% weight assessment -> normalized score is 90%
    assert.equal(student.averageScore, 90);
    assert.equal(student.overallGrade, 'A');
    assert.match(student.status, /IN PROGRESS \(Passing/);

    const math = student.subjects['sub-math'];
    assert.equal(math.score, 90);
    assert.equal(math.grade, 'A');
    assert.equal(math.gradePoint, 4.0);
    assert.equal(math.assessedWeight, 20);
    assert.equal(math.isFullyAssessed, false);
    assert.match(math.remark, /20% assessed/);
  });

  test('ResultService getReportCard produces immediate progressive evaluations for student', async () => {
    const ResultService = require('../src/modules/results/result.service');

    const mockRepo = {
      getGradingScales: async () => [],
      getSectionSubjects: async () => [
        { id: 'sub-math', name: 'Mathematics', code: 'MATH101' },
        { id: 'sub-eng', name: 'English', code: 'ENG101' },
      ],
      getStudentReportCardData: async (studentId) => ({
        student: {
          id: studentId,
          first_name: 'Sarah',
          last_name: 'Connor',
          section_id: 'sec-10a',
          admission_number: 'ADM-99',
          grade_name: 'Grade 10',
          section_name: '10A',
        },
        school: { school_name: 'Smart Academy' },
        attendance: { total_days: 30, present_days: 29 },
        marks: [
          {
            subject_id: 'sub-math',
            subject_name: 'Mathematics',
            subject_code: 'MATH101',
            exam_id: 'e-1',
            exam_title: 'Midterm',
            exam_type: 'MIDTERM',
            score: 45,
            max_marks: 50,
            weight_percentage: 50,
            is_absent: false,
          },
        ],
      }),
      getSectionStudents: async () => [
        { id: 'stu-sarah', admission_number: 'ADM-99', first_name: 'Sarah', last_name: 'Connor', gender: 'FEMALE', section_name: '10A', grade_name: 'Grade 10' },
      ],
      getSectionMarks: async () => [
        {
          student_id: 'stu-sarah',
          subject_id: 'sub-math',
          score: 45,
          max_marks: 50,
          weight_percentage: 50,
          is_absent: false,
        },
      ],
    };

    const service = new ResultService(mockRepo);
    const reportCard = await service.getReportCard('stu-sarah', { term: 'Semester 1' });

    assert.equal(reportCard.student.first_name, 'Sarah');
    assert.equal(reportCard.subjects.length, 2);

    const math = reportCard.subjects.find((s) => s.subjectId === 'sub-math');
    const english = reportCard.subjects.find((s) => s.subjectId === 'sub-eng');

    // Math has 45/50 in 50% weight -> 90% normalized score, Grade A
    assert.equal(math.totalScore, 90);
    assert.equal(math.gradeLetter, 'A');
    assert.equal(math.gradePoint, 4.0);
    assert.match(math.remark, /50% evaluated/);

    // English has no marks entered yet
    assert.equal(english.totalScore, 0);
    assert.equal(english.gradeLetter, '—');
    assert.equal(english.remark, 'Not yet assessed');

    // Overall academic summary
    assert.equal(reportCard.academicSummary.completedSubjects, 1);
    assert.equal(reportCard.academicSummary.totalSubjects, 2);
    assert.equal(reportCard.academicSummary.averageScore, 90);
    assert.equal(reportCard.academicSummary.finalGradeLetter, 'A');
    assert.match(reportCard.academicSummary.promotionStatus, /IN PROGRESS \(Passing/);
  });
});
