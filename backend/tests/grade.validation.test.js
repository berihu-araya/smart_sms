const test = require('node:test');
const assert = require('node:assert/strict');
const {
  validateCreateGradeInput,
  validateUpdateGradeInput,
} = require('../src/modules/grades/grade.validation');
const { getGradeSortValue } = require('../src/modules/grades/grade.repository');

test('validateCreateGradeInput rejects missing name', () => {
  const result = validateCreateGradeInput({});

  assert.equal(result.errors.name, 'Grade name is required');
});

test('validateCreateGradeInput rejects short name', () => {
  const result = validateCreateGradeInput({ name: 'A' });

  assert.equal(result.errors.name, 'Grade name must be at least 2 characters');
});

test('validateCreateGradeInput accepts valid input', () => {
  const result = validateCreateGradeInput({ name: 'Grade 10', description: 'Tenth grade level' });

  assert.equal(result.name, 'Grade 10');
  assert.equal(result.description, 'Tenth grade level');
  assert.deepEqual(result.errors, {});
});

test('validateCreateGradeInput trims whitespace', () => {
  const result = validateCreateGradeInput({ name: '  Grade 9  ', description: '  Ninth grade  ' });

  assert.equal(result.name, 'Grade 9');
  assert.equal(result.description, 'Ninth grade');
  assert.deepEqual(result.errors, {});
});

test('validateUpdateGradeInput preserves optional fields', () => {
  const result = validateUpdateGradeInput({
    name: '  Grade 11  ',
    description: '  Updated description  ',
  });

  assert.equal(result.name, 'Grade 11');
  assert.equal(result.description, 'Updated description');
  assert.deepEqual(result.errors, {});
});

test('validateUpdateGradeInput allows partial updates', () => {
  const result = validateUpdateGradeInput({ description: 'Just the description' });

  assert.equal(result.name, undefined);
  assert.equal(result.description, 'Just the description');
  assert.deepEqual(result.errors, {});
});

test('getGradeSortValue orders grades numerically ascending', () => {
  const sorted = ['Grade 10', 'Grade 2', 'KG', 'Grade 1', 'Grade 12']
    .slice()
    .sort((a, b) => getGradeSortValue(a) - getGradeSortValue(b));

  assert.deepEqual(sorted, ['KG', 'Grade 1', 'Grade 2', 'Grade 10', 'Grade 12']);
});
