const test = require('node:test');
const assert = require('node:assert/strict');
const {
  validateCreateTeacherInput,
  validateUpdateTeacherInput,
} = require('../src/modules/teachers/teacher.validation');

test('validateCreateTeacherInput rejects missing employee number', () => {
  const result = validateCreateTeacherInput({ firstName: 'John', lastName: 'Doe', gender: 'MALE' });

  assert.equal(result.errors.employeeNumber, 'Employee number is required');
});

test('validateCreateTeacherInput rejects missing first name', () => {
  const result = validateCreateTeacherInput({ employeeNumber: 'TCH001', lastName: 'Doe', gender: 'MALE' });

  assert.equal(result.errors.firstName, 'First name is required');
});

test('validateCreateTeacherInput rejects missing last name', () => {
  const result = validateCreateTeacherInput({ employeeNumber: 'TCH001', firstName: 'John', gender: 'MALE' });

  assert.equal(result.errors.lastName, 'Last name is required');
});

test('validateCreateTeacherInput rejects invalid gender', () => {
  const result = validateCreateTeacherInput({ employeeNumber: 'TCH001', firstName: 'John', lastName: 'Doe', gender: 'INVALID' });

  assert.equal(result.errors.gender, 'A valid gender is required');
});

test('validateCreateTeacherInput rejects invalid email', () => {
  const result = validateCreateTeacherInput({ employeeNumber: 'TCH001', firstName: 'John', lastName: 'Doe', gender: 'MALE', email: 'not-an-email' });

  assert.equal(result.errors.email, 'A valid email address is required (e.g., example@domain.com)');
});

test('validateCreateTeacherInput accepts valid input', () => {
  const result = validateCreateTeacherInput({
    employeeNumber: 'TCH001',
    firstName: 'John',
    lastName: 'Doe',
    gender: 'MALE',
    email: 'john.doe@school.com',
    phone: '+1234567890',
    qualification: 'M.Sc. Mathematics',
    designation: 'Senior Teacher',
    department: 'Mathematics',
  });

  assert.equal(result.employeeNumber, 'TCH001');
  assert.equal(result.firstName, 'John');
  assert.equal(result.lastName, 'Doe');
  assert.equal(result.gender, 'MALE');
  assert.equal(result.email, 'john.doe@school.com');
  assert.equal(result.phone, '+1234567890');
  assert.equal(result.qualification, 'M.Sc. Mathematics');
  assert.equal(result.designation, 'Senior Teacher');
  assert.equal(result.department, 'Mathematics');
  assert.deepEqual(result.errors, {});
});

test('validateCreateTeacherInput trims whitespace', () => {
  const result = validateCreateTeacherInput({
    employeeNumber: '  TCH002  ',
    firstName: '  Jane  ',
    lastName: '  Smith  ',
    gender: '  female  ',
  });

  assert.equal(result.employeeNumber, 'TCH002');
  assert.equal(result.firstName, 'Jane');
  assert.equal(result.lastName, 'Smith');
  assert.equal(result.gender, 'FEMALE');
  assert.deepEqual(result.errors, {});
});

test('validateUpdateTeacherInput allows partial updates', () => {
  const result = validateUpdateTeacherInput({ department: 'Science' });

  assert.equal(result.department, 'Science');
  assert.equal(result.firstName, undefined);
  assert.equal(result.lastName, undefined);
  assert.deepEqual(result.errors, {});
});

