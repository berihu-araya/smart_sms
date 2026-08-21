const test = require('node:test');
const assert = require('node:assert/strict');
const {
  validateCreateStudentInput,
} = require('../src/modules/students/student.validation');

test('validateCreateStudentInput parses nested parent information for auto-registration', () => {
  const result = validateCreateStudentInput({
    admissionNumber: 'STU-2026-999',
    firstName: 'Nahom',
    lastName: 'Mesfin',
    gender: 'MALE',
    admissionDate: '2026-08-20',
    parent: {
      fullName: 'Mesfin Bekele',
      phone: '+251 91 999 8888',
      email: 'mesfin@example.com',
      occupation: 'Civil Servant',
      address: 'Arada, Addis Ababa',
      relationship: 'FATHER',
    },
  });

  assert.equal(result.admissionNumber, 'STU-2026-999');
  assert.equal(result.firstName, 'Nahom');
  assert.equal(result.lastName, 'Mesfin');
  assert.ok(result.parent);
  assert.equal(result.parent.fullName, 'Mesfin Bekele');
  assert.equal(result.parent.phone, '+251 91 999 8888');
  assert.equal(result.parent.relationship, 'FATHER');
  assert.deepEqual(result.errors, {});
});

test('validateCreateStudentInput parses flat parent fields', () => {
  const result = validateCreateStudentInput({
    admissionNumber: 'STU-2026-888',
    firstName: 'Selam',
    lastName: 'Tadesse',
    gender: 'FEMALE',
    admissionDate: '2026-08-20',
    parentFullName: 'Tadesse Lemma',
    parentPhone: '+251 92 111 2222',
    parentRelationship: 'FATHER',
  });

  assert.ok(result.parent);
  assert.equal(result.parent.fullName, 'Tadesse Lemma');
  assert.equal(result.parent.phone, '+251 92 111 2222');
  assert.deepEqual(result.errors, {});
});
