const test = require('node:test');
const assert = require('node:assert/strict');
const {
  validateCreateStudentInput,
  validateUpdateStudentInput,
} = require('../src/modules/students/student.validation');

test('validateCreateStudentInput rejects missing student identity fields', () => {
  const result = validateCreateStudentInput({});

  assert.equal(result.errors.admissionNumber, undefined);
  assert.equal(result.errors.firstName, 'First name is required');
  assert.equal(result.errors.lastName, 'Last name is required');
});

test('validateUpdateStudentInput trims and keeps status', () => {
  const result = validateUpdateStudentInput({
    firstName: '  Alice  ',
    lastName: '  Johnson ',
    status: 'ACTIVE',
  });

  assert.equal(result.first_name, 'Alice');
  assert.equal(result.last_name, 'Johnson');
  assert.equal(result.status, 'ACTIVE');
  assert.deepEqual(result.errors, {});
});
