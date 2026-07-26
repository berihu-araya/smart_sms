const test = require('node:test');
const assert = require('node:assert/strict');
const {
  validateCreateSectionInput,
  validateUpdateSectionInput,
} = require('../src/modules/sections/section.validation');

test('validateCreateSectionInput rejects missing name', () => {
  const result = validateCreateSectionInput({});

  assert.equal(result.errors.name, 'Section name is required');
});

test('validateCreateSectionInput accepts valid input', () => {
  const result = validateCreateSectionInput({
    name: 'Section A',
    roomNumber: '201',
    capacity: 40,
  });

  assert.equal(result.name, 'Section A');
  assert.equal(result.roomNumber, '201');
  assert.equal(result.capacity, 40);
  assert.deepEqual(result.errors, {});
});

test('validateCreateSectionInput trims whitespace', () => {
  const result = validateCreateSectionInput({ name: '  Grade 10A  ' });

  assert.equal(result.name, 'Grade 10A');
  assert.deepEqual(result.errors, {});
});

test('validateCreateSectionInput rejects invalid capacity', () => {
  const result = validateCreateSectionInput({ name: 'Section B', capacity: -1 });

  assert.equal(result.errors.capacity, 'Capacity must be a positive number');
});

test('validateCreateSectionInput rejects zero capacity', () => {
  const result = validateCreateSectionInput({ name: 'Section C', capacity: 0 });

  assert.equal(result.errors.capacity, 'Capacity must be a positive number');
});

test('validateCreateSectionInput accepts null capacity', () => {
  const result = validateCreateSectionInput({ name: 'Section D', capacity: null });

  assert.equal(result.name, 'Section D');
  assert.equal(result.capacity, null);
  assert.deepEqual(result.errors, {});
});

test('validateUpdateSectionInput allows partial updates', () => {
  const result = validateUpdateSectionInput({ roomNumber: 'Lab-2' });

  assert.equal(result.roomNumber, 'Lab-2');
  assert.equal(result.name, undefined);
  assert.deepEqual(result.errors, {});
});

test('validateUpdateSectionInput validates gradeId if provided', () => {
  const result = validateUpdateSectionInput({ name: 'Updated Section', gradeId: 'invalid-uuid' });

  assert.equal(result.errors.gradeId, 'Grade id must be a valid UUID');
});
