const test = require('node:test');
const assert = require('node:assert/strict');
const {
  validateLoginInput,
  validateRegisterInput,
} = require('../src/modules/auth/auth.validation');

test('validateRegisterInput rejects missing first name', () => {
  const result = validateRegisterInput({
    lastName: 'Doe',
    email: 'john@example.com',
    role: 'Teacher',
    password: 'password123',
    confirmPassword: 'password123',
  });

  assert.equal(result.errors.firstName, 'First name is required');
});

test('validateRegisterInput rejects missing last name', () => {
  const result = validateRegisterInput({
    firstName: 'John',
    email: 'john@example.com',
    role: 'Teacher',
    password: 'password123',
    confirmPassword: 'password123',
  });

  assert.equal(result.errors.lastName, 'Last name is required');
});

test('validateRegisterInput rejects invalid email', () => {
  const result = validateRegisterInput({
    firstName: 'John',
    lastName: 'Doe',
    email: 'invalid-email',
    role: 'Teacher',
    password: 'password123',
    confirmPassword: 'password123',
  });

  assert.equal(result.errors.email, 'A valid email address is required');
});

test('validateRegisterInput rejects missing role', () => {
  const result = validateRegisterInput({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    role: '',
    password: 'password123',
    confirmPassword: 'password123',
  });

  assert.equal(result.errors.role, 'Please select a user role');
});

test('validateRegisterInput rejects short password (< 8 chars)', () => {
  const result = validateRegisterInput({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    role: 'Teacher',
    password: 'short',
    confirmPassword: 'short',
  });

  assert.equal(result.errors.password, 'Password must be at least 8 characters');
});

test('validateRegisterInput rejects mismatching passwords', () => {
  const result = validateRegisterInput({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    role: 'Teacher',
    password: 'password123',
    confirmPassword: 'differentPassword123',
  });

  assert.equal(result.errors.confirmPassword, 'Passwords do not match');
});

test('validateRegisterInput accepts valid registration data', () => {
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
