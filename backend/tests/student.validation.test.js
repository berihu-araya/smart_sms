const test = require('node:test');
const assert = require('node:assert/strict');
const {
  validateCreateStudentInput,
  validateUpdateStudentInput,
} = require('../src/modules/students/student.validation');

test('validateCreateStudentInput rejects missing required fields', () => {
  const result = validateCreateStudentInput({});

  assert.equal(result.errors.admissionNumber, 'Admission number is required');
  assert.equal(result.errors.firstName, 'First name is required');
  assert.equal(result.errors.lastName, 'Last name is required');
});

test('validateUpdateStudentInput trims and keeps status', () => {
  const result = validateUpdateStudentInput({
    firstName: '  Alice  ',
    lastName: '  Johnson ',
    status: 'ACTIVE',
  });

  assert.equal(result.firstName, 'Alice');
  assert.equal(result.lastName, 'Johnson');
  assert.equal(result.status, 'ACTIVE');
  assert.deepEqual(result.errors, {});
});
