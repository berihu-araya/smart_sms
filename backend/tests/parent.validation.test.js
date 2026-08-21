const test = require('node:test');
const assert = require('node:assert/strict');
const {
  validateCreateParentInput,
  validateUpdateParentInput,
  validateParentId,
} = require('../src/modules/parents/parent.validation');

test('validateCreateParentInput rejects empty full name', () => {
  const result = validateCreateParentInput({});
  assert.equal(result.errors.fullName, 'Full name is required');
});

test('validateCreateParentInput accepts valid parent payload', () => {
  const result = validateCreateParentInput({
    fullName: '  Tewodros Kassahun  ',
    phone: '+251 91 123 4567',
    email: 'teddy@example.com',
    occupation: 'Musician',
    address: 'Bole, Addis Ababa',
    relationship: 'Father',
  });

  assert.equal(result.fullName, 'Tewodros Kassahun');
  assert.equal(result.phone, '+251 91 123 4567');
  assert.equal(result.email, 'teddy@example.com');
  assert.equal(result.relationship, 'FATHER');
  assert.deepEqual(result.errors, {});
});

test('validateParentId validates UUID properly', () => {
  const invalid = validateParentId('not-a-uuid');
  assert.equal(invalid.errors.id, 'Parent ID must be a valid UUID');

  const valid = validateParentId('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
  assert.deepEqual(valid.errors, {});
});
