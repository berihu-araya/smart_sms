const test = require('node:test');
const assert = require('node:assert/strict');
const {
  validateCreateGradeSubjectInput,
  validateUpdateGradeSubjectInput,
  validateBulkGradeSubjectInput,
  validateCloneGradeSubjectInput,
  validateGradeSubjectId,
} = require('../src/modules/grades/subjects/grade-subject.validation');
const {
  GradeSubjectService,
  GradeSubjectValidationError,
  GradeSubjectConflictError,
  GradeSubjectNotFoundError,
} = require('../src/modules/grades/subjects/grade-subject.service');

const validUuid1 = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const validUuid2 = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
const validUuid3 = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';
const validUuid4 = 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44';

test('validateCreateGradeSubjectInput rejects missing UUIDs', () => {
  const result = validateCreateGradeSubjectInput({});
  assert.ok(result.errors.grade_id);
  assert.ok(result.errors.subject_id);
  assert.ok(result.errors.academic_year_id);
});

test('validateCreateGradeSubjectInput accepts valid payload and sets defaults', () => {
  const result = validateCreateGradeSubjectInput({
    grade_id: validUuid1,
    subject_id: validUuid2,
    academic_year_id: validUuid3,
    weekly_periods: 5,
    total_marks: 100,
    pass_marks: 40,
  });

  assert.equal(result.grade_id, validUuid1);
  assert.equal(result.subject_id, validUuid2);
  assert.equal(result.academic_year_id, validUuid3);
  assert.equal(result.is_compulsory, true);
  assert.equal(result.weekly_periods, 5);
  assert.equal(result.total_marks, 100);
  assert.equal(result.pass_marks, 40);
  assert.deepEqual(result.errors, {});
});

test('validateCreateGradeSubjectInput rejects pass_marks > total_marks', () => {
  const result = validateCreateGradeSubjectInput({
    grade_id: validUuid1,
    subject_id: validUuid2,
    academic_year_id: validUuid3,
    total_marks: 50,
    pass_marks: 60,
  });

  assert.equal(result.errors.pass_marks, 'Pass marks cannot exceed total marks');
});

test('validateBulkGradeSubjectInput validates subject array correctly', () => {
  const result = validateBulkGradeSubjectInput({
    grade_id: validUuid1,
    academic_year_id: validUuid2,
    subjects: [
      {
        subject_id: validUuid3,
        is_compulsory: true,
        weekly_periods: 4,
        total_marks: 100,
        pass_marks: 50,
      },
      {
        subject_id: validUuid4,
        is_compulsory: false,
        weekly_periods: 3,
        total_marks: 100,
        pass_marks: 40,
      },
    ],
  });

  assert.equal(result.grade_id, validUuid1);
  assert.equal(result.academic_year_id, validUuid2);
  assert.equal(result.subjects.length, 2);
  assert.deepEqual(result.errors, {});
});

test('validateBulkGradeSubjectInput rejects duplicate subjects in payload', () => {
  const result = validateBulkGradeSubjectInput({
    grade_id: validUuid1,
    academic_year_id: validUuid2,
    subjects: [
      { subject_id: validUuid3 },
      { subject_id: validUuid3 },
    ],
  });

  assert.ok(result.errors['subjects[1].subject_id']);
});

test('validateCloneGradeSubjectInput rejects identical source and target', () => {
  const result = validateCloneGradeSubjectInput({
    source_grade_id: validUuid1,
    source_academic_year_id: validUuid2,
    target_grade_id: validUuid1,
    target_academic_year_id: validUuid2,
  });

  assert.equal(result.errors.target_grade_id, 'Source and target cannot be identical');
});

test('GradeSubjectService.bulkAssignSubjects executes successfully', async () => {
  const mockRepo = {
    gradeExists: async () => true,
    academicYearExists: async () => true,
    subjectExists: async () => true,
    bulkUpsert: async ({ grade_id, academic_year_id, subjects }) => subjects.map((s, idx) => ({ id: `gs-${idx}`, ...s })),
  };

  const service = new GradeSubjectService(mockRepo);
  const result = await service.bulkAssignSubjects({
    grade_id: validUuid1,
    academic_year_id: validUuid2,
    subjects: [
      { subject_id: validUuid3, is_compulsory: true },
      { subject_id: validUuid4, is_compulsory: false },
    ],
  });

  assert.equal(result.assignedCount, 2);
  assert.equal(result.items.length, 2);
});

test('GradeSubjectService.cloneGradeSubjects clones mapped curriculum', async () => {
  const mockRepo = {
    gradeExists: async () => true,
    academicYearExists: async () => true,
    cloneAssignments: async () => ({ clonedCount: 5, items: Array(5).fill({}) }),
  };

  const service = new GradeSubjectService(mockRepo);
  const result = await service.cloneGradeSubjects({
    source_grade_id: validUuid1,
    source_academic_year_id: validUuid2,
    target_grade_id: validUuid3,
    target_academic_year_id: validUuid4,
  });

  assert.equal(result.clonedCount, 5);
});
