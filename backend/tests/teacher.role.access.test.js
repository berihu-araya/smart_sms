const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  attachTeacherScope,
  requireTeacherOwnSubject,
  requireTeacherSectionAccess,
  requireTeacherClassTeacher,
} = require('../src/middlewares/teacher.scope');
const AuthorizationService = require('../src/services/authorization.service');
const MarkService = require('../src/modules/marks/mark.service');

describe('Teacher Role Assignment-Based Permission & Access Model', () => {
  describe('Teacher Scope Middleware Permissions Logic', () => {
    test('Subject Teacher scope permits editing only assigned subjects and viewing assigned sections', () => {
      const subjectAssignments = [
        { subject_id: 'sub-math', section_id: 'sec-10a', grade_id: 'g-10' },
        { subject_id: 'sub-math', section_id: 'sec-10b', grade_id: 'g-10' },
      ];
      const classTeacherAssignments = [];

      const assignedSubjectIds = ['sub-math'];
      const assignedSectionIds = ['sec-10a', 'sec-10b'];
      const homeroomSectionIds = [];
      const allAccessibleSectionIds = ['sec-10a', 'sec-10b'];

      const teacherScope = {
        teacher_id: 'teacher-1',
        isSubjectTeacher: true,
        isClassTeacher: false,
        isHybrid: false,
        assigned_subject_ids: assignedSubjectIds,
        assigned_section_ids: assignedSectionIds,
        homeroom_section_ids: homeroomSectionIds,
        all_accessible_section_ids: allAccessibleSectionIds,
        canEditMarks: (subjectId, sectionId) => {
          return subjectAssignments.some(
            (a) => a.subject_id === subjectId && (!sectionId || a.section_id === sectionId)
          );
        },
        canViewMarks: (subjectId, sectionId) => {
          if (sectionId && homeroomSectionIds.includes(sectionId)) return true;
          return subjectAssignments.some(
            (a) => a.subject_id === subjectId && (!sectionId || a.section_id === sectionId)
          );
        },
        canAccessStudent: (studentSectionId) => {
          return allAccessibleSectionIds.includes(studentSectionId);
        },
        canAccessSection: (sectionId) => {
          return allAccessibleSectionIds.includes(sectionId);
        },
        canCalculateSectionRank: (sectionId) => {
          return homeroomSectionIds.includes(sectionId);
        },
      };

      // 1. Can edit marks for own assigned subject in 10-A
      assert.equal(teacherScope.canEditMarks('sub-math', 'sec-10a'), true);
      assert.equal(teacherScope.canEditMarks('sub-math', 'sec-10b'), true);

      // 2. Cannot edit marks for unassigned subject (e.g. Physics) or unassigned section (e.g. 11-A)
      assert.equal(teacherScope.canEditMarks('sub-physics', 'sec-10a'), false);
      assert.equal(teacherScope.canEditMarks('sub-math', 'sec-11a'), false);

      // 3. Can view marks for assigned subject
      assert.equal(teacherScope.canViewMarks('sub-math', 'sec-10a'), true);
      // Cannot view marks for other subjects
      assert.equal(teacherScope.canViewMarks('sub-physics', 'sec-10a'), false);

      // 4. Student access scoped to assigned sections
      assert.equal(teacherScope.canAccessStudent('sec-10a'), true);
      assert.equal(teacherScope.canAccessStudent('sec-10b'), true);
      assert.equal(teacherScope.canAccessStudent('sec-11a'), false);

      // 5. Cannot calculate section ranks (not a class teacher)
      assert.equal(teacherScope.canCalculateSectionRank('sec-10a'), false);
    });

    test('Class Teacher scope permits read-only viewing of all subjects in homeroom section and ranking calculation', () => {
      const subjectAssignments = [];
      const classTeacherAssignments = [{ section_id: 'sec-10a', grade_id: 'g-10' }];

      const assignedSubjectIds = [];
      const assignedSectionIds = [];
      const homeroomSectionIds = ['sec-10a'];
      const allAccessibleSectionIds = ['sec-10a'];

      const teacherScope = {
        teacher_id: 'teacher-2',
        isSubjectTeacher: false,
        isClassTeacher: true,
        isHybrid: false,
        assigned_subject_ids: assignedSubjectIds,
        assigned_section_ids: assignedSectionIds,
        homeroom_section_ids: homeroomSectionIds,
        all_accessible_section_ids: allAccessibleSectionIds,
        canEditMarks: (subjectId, sectionId) => {
          return subjectAssignments.some(
            (a) => a.subject_id === subjectId && (!sectionId || a.section_id === sectionId)
          );
        },
        canViewMarks: (subjectId, sectionId) => {
          if (sectionId && homeroomSectionIds.includes(sectionId)) return true;
          return subjectAssignments.some(
            (a) => a.subject_id === subjectId && (!sectionId || a.section_id === sectionId)
          );
        },
        canAccessStudent: (studentSectionId) => {
          return allAccessibleSectionIds.includes(studentSectionId);
        },
        canAccessSection: (sectionId) => {
          return allAccessibleSectionIds.includes(sectionId);
        },
        canCalculateSectionRank: (sectionId) => {
          return homeroomSectionIds.includes(sectionId);
        },
      };

      // 1. Cannot edit marks for subjects (since not assigned as subject teacher)
      assert.equal(teacherScope.canEditMarks('sub-math', 'sec-10a'), false);
      assert.equal(teacherScope.canEditMarks('sub-physics', 'sec-10a'), false);

      // 2. Can view marks for ANY subject in homeroom section 10-A
      assert.equal(teacherScope.canViewMarks('sub-math', 'sec-10a'), true);
      assert.equal(teacherScope.canViewMarks('sub-physics', 'sec-10a'), true);
      assert.equal(teacherScope.canViewMarks('sub-history', 'sec-10a'), true);

      // Cannot view marks in non-homeroom section 10-B
      assert.equal(teacherScope.canViewMarks('sub-math', 'sec-10b'), false);

      // 3. Can access all students in homeroom section
      assert.equal(teacherScope.canAccessStudent('sec-10a'), true);
      assert.equal(teacherScope.canAccessStudent('sec-10b'), false);

      // 4. Can calculate section rank for homeroom section 10-A
      assert.equal(teacherScope.canCalculateSectionRank('sec-10a'), true);
      assert.equal(teacherScope.canCalculateSectionRank('sec-10b'), false);
    });

    test('Hybrid Teacher scope combines full edit for own subjects and read-only for homeroom other subjects', () => {
      // Teaches Physics in 10-A, 10-B, and 11-A; Class Teacher for 10-A
      const subjectAssignments = [
        { subject_id: 'sub-physics', section_id: 'sec-10a', grade_id: 'g-10' },
        { subject_id: 'sub-physics', section_id: 'sec-10b', grade_id: 'g-10' },
        { subject_id: 'sub-physics', section_id: 'sec-11a', grade_id: 'g-11' },
      ];
      const classTeacherAssignments = [{ section_id: 'sec-10a', grade_id: 'g-10' }];

      const assignedSubjectIds = ['sub-physics'];
      const assignedSectionIds = ['sec-10a', 'sec-10b', 'sec-11a'];
      const homeroomSectionIds = ['sec-10a'];
      const allAccessibleSectionIds = ['sec-10a', 'sec-10b', 'sec-11a'];

      const teacherScope = {
        teacher_id: 'teacher-3',
        isSubjectTeacher: true,
        isClassTeacher: true,
        isHybrid: true,
        assigned_subject_ids: assignedSubjectIds,
        assigned_section_ids: assignedSectionIds,
        homeroom_section_ids: homeroomSectionIds,
        all_accessible_section_ids: allAccessibleSectionIds,
        canEditMarks: (subjectId, sectionId) => {
          return subjectAssignments.some(
            (a) => a.subject_id === subjectId && (!sectionId || a.section_id === sectionId)
          );
        },
        canViewMarks: (subjectId, sectionId) => {
          if (sectionId && homeroomSectionIds.includes(sectionId)) return true;
          return subjectAssignments.some(
            (a) => a.subject_id === subjectId && (!sectionId || a.section_id === sectionId)
          );
        },
        canAccessStudent: (studentSectionId) => {
          return allAccessibleSectionIds.includes(studentSectionId);
        },
        canAccessSection: (sectionId) => {
          return allAccessibleSectionIds.includes(sectionId);
        },
        canCalculateSectionRank: (sectionId) => {
          return homeroomSectionIds.includes(sectionId);
        },
      };

      // 1. Edit permissions:
      // Can edit Physics in 10-A, 10-B, 11-A
      assert.equal(teacherScope.canEditMarks('sub-physics', 'sec-10a'), true);
      assert.equal(teacherScope.canEditMarks('sub-physics', 'sec-10b'), true);
      assert.equal(teacherScope.canEditMarks('sub-physics', 'sec-11a'), true);
      // CANNOT edit Math in homeroom 10-A (read-only homeroom subject)
      assert.equal(teacherScope.canEditMarks('sub-math', 'sec-10a'), false);

      // 2. View permissions:
      // Can view Physics in 10-A, 10-B, 11-A
      assert.equal(teacherScope.canViewMarks('sub-physics', 'sec-10a'), true);
      assert.equal(teacherScope.canViewMarks('sub-physics', 'sec-10b'), true);
      assert.equal(teacherScope.canViewMarks('sub-physics', 'sec-11a'), true);
      // Can view Math in 10-A (homeroom)
      assert.equal(teacherScope.canViewMarks('sub-math', 'sec-10a'), true);
      // CANNOT view Math in 10-B (not homeroom, not own subject)
      assert.equal(teacherScope.canViewMarks('sub-math', 'sec-10b'), false);

      // 3. Section rankings:
      // Can calculate rank for homeroom 10-A
      assert.equal(teacherScope.canCalculateSectionRank('sec-10a'), true);
      // Cannot calculate rank for 10-B or 11-A
      assert.equal(teacherScope.canCalculateSectionRank('sec-10b'), false);
      assert.equal(teacherScope.canCalculateSectionRank('sec-11a'), false);
    });
  });

  describe('Route Guards', () => {
    test('requireTeacherOwnSubject allows assigned subject teacher and blocks non-assigned teacher', () => {
      const guard = requireTeacherOwnSubject('subjectId', 'sectionId');

      // 1. Assigned teacher
      const validReq = {
        user: { role: 'Teacher' },
        params: { subjectId: 'sub-math', sectionId: 'sec-10a' },
        teacherScope: {
          canEditMarks: (sub, sec) => sub === 'sub-math' && sec === 'sec-10a',
        },
      };
      let validNext = false;
      guard(validReq, {}, () => { validNext = true; });
      assert.equal(validNext, true);

      // 2. Unassigned teacher
      const invalidReq = {
        user: { role: 'Teacher' },
        params: { subjectId: 'sub-chem', sectionId: 'sec-10a' },
        teacherScope: {
          canEditMarks: (sub, sec) => sub === 'sub-math' && sec === 'sec-10a',
        },
      };
      let invalidNext = false;
      const res = {
        statusCode: 200,
        status(c) { this.statusCode = c; return this; },
        json(payload) { this.body = payload; return this; },
      };
      guard(invalidReq, res, () => { invalidNext = true; });
      assert.equal(invalidNext, false);
      assert.equal(res.statusCode, 403);
      assert.match(res.body.message, /Only the assigned subject teacher can perform this action/);
    });

    test('requireTeacherClassTeacher allows Class Teacher and blocks non-Class Teacher', () => {
      const guard = requireTeacherClassTeacher('sectionId');

      // 1. Class teacher
      const validReq = {
        user: { role: 'Teacher' },
        params: { sectionId: 'sec-10a' },
        teacherScope: {
          canCalculateSectionRank: (sec) => sec === 'sec-10a',
        },
      };
      let validNext = false;
      guard(validReq, {}, () => { validNext = true; });
      assert.equal(validNext, true);

      // 2. Subject teacher attempting to manage section ranks
      const invalidReq = {
        user: { role: 'Teacher' },
        params: { sectionId: 'sec-10b' },
        teacherScope: {
          canCalculateSectionRank: (sec) => sec === 'sec-10a',
        },
      };
      let invalidNext = false;
      const res = {
        statusCode: 200,
        status(c) { this.statusCode = c; return this; },
        json(payload) { this.body = payload; return this; },
      };
      guard(invalidReq, res, () => { invalidNext = true; });
      assert.equal(invalidNext, false);
      assert.equal(res.statusCode, 403);
      assert.match(res.body.message, /Only the assigned Class Teacher can calculate rankings/);
    });
  });

  describe('MarkService Read-Only Flagging for Class Teachers', () => {
    test('getMarksSheet returns isReadOnly: false for Subject Teacher and isReadOnly: true for Class Teacher viewing other subjects', async () => {
      const mockRepo = {
        getMarksSheet: async () => [
          { id: 'stu-1', name: 'Alice Smith', roll_number: '1', score: 88, status: 'Graded' },
        ],
        isTeacherAssignedToMarksScope: async () => true,
        isClassTeacherOfSection: async () => true,
      };

      const mockExamRepo = {
        findById: async (id) => ({
          id,
          title: 'Midterm Exam',
          exam_type: 'MIDTERM',
          max_marks: 100,
          weight_percentage: 40,
        }),
      };

      const markService = new MarkService(mockRepo, mockExamRepo);

      // Case A: Subject Teacher (editable)
      const editableSheet = await markService.getMarksSheet({
        examId: 'exam-1',
        subjectId: 'sub-history',
        sectionId: 'sec-10a',
        teacherId: 'teacher-1',
        isReadOnly: false,
      });
      assert.equal(editableSheet.isReadOnly, false);
      assert.equal(editableSheet.students.length, 1);
      assert.equal(editableSheet.students[0].score, 88);

      // Case B: Class Teacher (read-only)
      const readOnlySheet = await markService.getMarksSheet({
        examId: 'exam-1',
        subjectId: 'sub-history',
        sectionId: 'sec-10a',
        teacherId: 'teacher-2',
        isReadOnly: true,
      });
      assert.equal(readOnlySheet.isReadOnly, true);
    });
  });

  describe('AuthorizationService Fine-Grained Teacher Checks', () => {
    test('canTeacherViewSubject queries both teacher_subjects and class_teachers + grade_subjects', async () => {
      const mockDb = {
        query: async (query, params) => {
          const [userId, subjectId] = params;
          if (userId === 'teacher-u1' && subjectId === 'sub-math') {
            return { rows: [{ subject_id: 'sub-math' }] };
          }
          return { rows: [] };
        },
      };

      const authService = new AuthorizationService(mockDb);
      const canViewMath = await authService.canTeacherViewSubject('teacher-u1', 'sub-math');
      assert.equal(canViewMath, true);

      const canViewArt = await authService.canTeacherViewSubject('teacher-u1', 'sub-art');
      assert.equal(canViewArt, false);
    });

    test('canTeacherGradeStudent strictly requires assigned subject teacher', async () => {
      const mockDb = {
        query: async (query, params) => {
          const [teacherUserId, studentId, subjectId] = params;
          if (teacherUserId === 'teacher-u1' && studentId === 'stu-1' && subjectId === 'sub-math') {
            return { rows: [{ '?column?': 1 }] };
          }
          return { rows: [] };
        },
      };

      const authService = new AuthorizationService(mockDb);
      const canGradeMath = await authService.canTeacherGradeStudent('teacher-u1', 'stu-1', 'sub-math');
      assert.equal(canGradeMath, true);

      const canGradePhysics = await authService.canTeacherGradeStudent('teacher-u1', 'stu-1', 'sub-physics');
      assert.equal(canGradePhysics, false);
    });
  });

  describe('Scoping Integration for Student, Subject, Assignment, and Result Services', () => {
    test('StudentService passes sectionIds filter to restrict teacher student list', async () => {
      const { StudentService } = require('../src/modules/students/student.service');
      let capturedOptions = null;
      const mockRepo = {
        findAll: async (options) => {
          capturedOptions = options;
          return { items: [{ id: 'stu-1', name: 'John Doe', section_id: 'sec-10a' }], total: 1 };
        },
      };

      const service = new StudentService(mockRepo);
      const result = await service.listStudents({
        sectionIds: ['sec-10a', 'sec-10b'],
      });

      assert.deepEqual(capturedOptions.sectionIds, ['sec-10a', 'sec-10b']);
      assert.equal(result.items.length, 1);
    });

    test('SubjectService passes subjectIds filter to restrict teacher subject list', async () => {
      const { SubjectService } = require('../src/modules/subject/subject.service');
      let capturedOptions = null;
      const mockRepo = {
        findAll: async (options) => {
          capturedOptions = options;
          return { items: [{ id: 'sub-math', subject_name: 'Mathematics' }], total: 1 };
        },
      };

      const service = new SubjectService(mockRepo);
      const result = await service.listSubjects({
        subjectIds: ['sub-math', 'sub-physics'],
      });

      assert.deepEqual(capturedOptions.subjectIds, ['sub-math', 'sub-physics']);
      assert.equal(result.items.length, 1);
    });

    test('Assignment creation enforces that only assigned subject teacher can create assignments for that section', () => {
      const teacherScope = {
        teacher_id: 'teacher-1',
        canEditMarks: (subId, secId) => subId === 'sub-math' && secId === 'sec-10a',
      };

      // Allowed for assigned subject and section
      assert.equal(teacherScope.canEditMarks('sub-math', 'sec-10a'), true);
      // Denied for unassigned subject or unassigned section
      assert.equal(teacherScope.canEditMarks('sub-english', 'sec-10a'), false);
      assert.equal(teacherScope.canEditMarks('sub-math', 'sec-10b'), false);
    });

    test('Result calculation grants Class Teacher full rankings and restricts Subject Teacher to own subject', () => {
      const classTeacherScope = {
        teacher_id: 'teacher-1',
        homeroom_section_ids: ['sec-10a'],
        canCalculateSectionRank: (secId) => secId === 'sec-10a',
      };

      const subjectTeacherScope = {
        teacher_id: 'teacher-2',
        homeroom_section_ids: [],
        canCalculateSectionRank: () => false,
      };

      assert.equal(classTeacherScope.canCalculateSectionRank('sec-10a'), true);
      assert.equal(classTeacherScope.canCalculateSectionRank('sec-10b'), false);
      assert.equal(subjectTeacherScope.canCalculateSectionRank('sec-10a'), false);
    });

    test('SectionService passes sectionIds filter to restrict teacher sections list', async () => {
      const { SectionService } = require('../src/modules/sections/section.service');
      let capturedOptions = null;
      const mockRepo = {
        findAll: async (options) => {
          capturedOptions = options;
          return { items: [{ id: 'sec-10a', name: 'Section A' }], total: 1 };
        },
      };

      const service = new SectionService(mockRepo);
      const result = await service.listSections({
        sectionIds: ['sec-10a', 'sec-10b'],
      });

      assert.deepEqual(capturedOptions.sectionIds, ['sec-10a', 'sec-10b']);
      assert.equal(result.items.length, 1);
    });

    test('GradeService passes gradeIds filter to restrict teacher grades list', async () => {
      const { GradeService } = require('../src/modules/grades/grade.service');
      let capturedOptions = null;
      const mockRepo = {
        findAll: async (options) => {
          capturedOptions = options;
          return { items: [{ id: 'g-10', name: 'Grade 10' }], total: 1 };
        },
      };

      const service = new GradeService(mockRepo);
      const result = await service.listGrades({
        gradeIds: ['g-10', 'g-11'],
      });

      assert.deepEqual(capturedOptions.gradeIds, ['g-10', 'g-11']);
      assert.equal(result.items.length, 1);
    });

    test('ExamService passes teacherScope filter to restrict teacher exams list', async () => {
      const ExamService = require('../src/modules/exams/exam.service');
      let capturedOptions = null;
      const mockRepo = {
        findAll: async (options) => {
          capturedOptions = options;
          return [{ id: 'exam-1', title: 'Grade 10 Midterm' }];
        },
      };

      const mockTeacherScope = {
        teacher_id: 'teacher-1',
        homeroom_grade_ids: ['g-10'],
        all_accessible_grade_ids: ['g-10'],
      };

      const service = new ExamService(mockRepo);
      const result = await service.listExams({
        teacherScope: mockTeacherScope,
      });

      assert.deepEqual(capturedOptions.teacherScope, mockTeacherScope);
      assert.equal(result.length, 1);
    });

    test('GradeSubject validation accepts optional teacher_id and section_id', () => {
      const { validateCreateGradeSubjectInput } = require('../src/modules/grades/subjects/grade-subject.validation');
      const validUuid1 = '550e8400-e29b-41d4-a716-446655440001';
      const validUuid2 = '550e8400-e29b-41d4-a716-446655440002';
      const validUuid3 = '550e8400-e29b-41d4-a716-446655440003';
      const validTeacherId = '550e8400-e29b-41d4-a716-446655440004';
      const validSectionId = '550e8400-e29b-41d4-a716-446655440005';

      const res = validateCreateGradeSubjectInput({
        grade_id: validUuid1,
        subject_id: validUuid2,
        academic_year_id: validUuid3,
        teacher_id: validTeacherId,
        section_id: validSectionId,
        is_compulsory: true,
        weekly_periods: 4,
      });

      assert.equal(Object.keys(res.errors).length, 0);
      assert.equal(res.teacher_id, validTeacherId);
      assert.equal(res.section_id, validSectionId);
    });
  });
});

