const test = require('node:test');
const assert = require('node:assert/strict');
const {
  validateLoginInput,
  validateRegisterInput,
} = require('../src/modules/auth/auth.validation');

test('validateRegisterInput accepts valid registration with fullName', () => {
  const result = validateRegisterInput({
    fullName: 'Jane Doe Smith',
    email: 'jane.smith@school.com',
    phone: '+251911223344',
    role: 'Teacher',
    password: 'securePassword123',
    confirmPassword: 'securePassword123',
  });

  assert.equal(Object.keys(result.errors).length, 0);
  assert.equal(result.firstName, 'Jane');
  assert.equal(result.lastName, 'Doe Smith');
  assert.equal(result.fullName, 'Jane Doe Smith');
  assert.equal(result.email, 'jane.smith@school.com');
  assert.equal(result.role, 'Teacher');
});

test('validateRegisterInput rejects empty fullName', () => {
  const result = validateRegisterInput({
    fullName: '',
    email: 'john@example.com',
    role: 'Teacher',
    password: 'password123',
    confirmPassword: 'password123',
  });

  assert.ok(result.errors.firstName || result.errors.fullName);
});

test('validateRegisterInput rejects invalid email', () => {
  const result = validateRegisterInput({
    fullName: 'John Doe',
    email: 'invalid-email',
    role: 'Teacher',
    password: 'password123',
    confirmPassword: 'password123',
  });

  assert.equal(result.errors.email, 'A valid email address is required');
});

test('validateRegisterInput rejects missing role', () => {
  const result = validateRegisterInput({
    fullName: 'John Doe',
    email: 'john@example.com',
    role: '',
    password: 'password123',
    confirmPassword: 'password123',
  });

  assert.equal(result.errors.role, 'Please select a user role');
});

test('validateRegisterInput rejects short password (< 8 chars)', () => {
  const result = validateRegisterInput({
    fullName: 'John Doe',
    email: 'john@example.com',
    role: 'Teacher',
    password: 'short',
    confirmPassword: 'short',
  });

  assert.equal(result.errors.password, 'Password must be at least 8 characters');
});

test('validateRegisterInput rejects mismatching passwords', () => {
  const result = validateRegisterInput({
    fullName: 'John Doe',
    email: 'john@example.com',
    role: 'Teacher',
    password: 'password123',
    confirmPassword: 'differentPassword123',
  });

  assert.equal(result.errors.confirmPassword, 'Passwords do not match');
});

test('validateRegisterInput accepts valid registration with firstName and lastName', () => {
  const result = validateRegisterInput({
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@school.com',
    phone: '+251911223344',
    role: 'Student',
    password: 'securePassword123',
    confirmPassword: 'securePassword123',
  });

  assert.equal(Object.keys(result.errors).length, 0);
  assert.equal(result.firstName, 'Jane');
  assert.equal(result.lastName, 'Smith');
  assert.equal(result.email, 'jane.smith@school.com');
  assert.equal(result.role, 'Student');
});
