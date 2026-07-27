const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  validateCreateAcademicYearInput,
  validateUpdateAcademicYearInput,
  validateAcademicYearId,
} = require('../src/modules/academic-years/academic-year.validation');

describe('Academic Year Validation', () => {
  describe('validateCreateAcademicYearInput', () => {
    it('should return errors for empty input', () => {
      const result = validateCreateAcademicYearInput({});
      assert.ok(result.errors.name);
      assert.ok(result.errors.startDate);
      assert.ok(result.errors.endDate);
    });

    it('should return error for short name', () => {
      const result = validateCreateAcademicYearInput({
        name: 'AB',
        startDate: '2024-09-01',
        endDate: '2025-06-30',
      });
      assert.ok(result.errors.name);
    });

    it('should pass for valid input', () => {
      const result = validateCreateAcademicYearInput({
        name: '2024/2025 Academic Year',
        startDate: '2024-09-01',
        endDate: '2025-06-30',
        description: 'Full academic year',
      });
      assert.strictEqual(Object.keys(result.errors).length, 0);
      assert.strictEqual(result.name, '2024/2025 Academic Year');
      assert.strictEqual(result.startDate, '2024-09-01');
      assert.strictEqual(result.endDate, '2025-06-30');
      assert.strictEqual(result.description, 'Full academic year');
    });

    it('should trim whitespace from name', () => {
      const result = validateCreateAcademicYearInput({
        name: '  2024/2025  ',
        startDate: '2024-09-01',
        endDate: '2025-06-30',
      });
      assert.strictEqual(result.name, '2024/2025');
    });

    it('should set description to null when not provided', () => {
      const result = validateCreateAcademicYearInput({
        name: '2024/2025',
        startDate: '2024-09-01',
        endDate: '2025-06-30',
      });
      assert.strictEqual(result.description, null);
    });

    it('should return error for invalid dates', () => {
      const result = validateCreateAcademicYearInput({
        name: '2024/2025',
        startDate: 'invalid-date',
        endDate: '2025-06-30',
      });
      assert.ok(result.errors.startDate);
    });

    it('should return error when end date is before start date', () => {
      const result = validateCreateAcademicYearInput({
        name: '2024/2025',
        startDate: '2025-09-01',
        endDate: '2024-06-30',
      });
      assert.ok(result.errors.endDate);
      assert.strictEqual(result.errors.endDate, 'End date must be after start date');
    });
  });

  describe('validateUpdateAcademicYearInput', () => {
    it('should return empty errors for empty input (partial update)', () => {
      const result = validateUpdateAcademicYearInput({});
      assert.strictEqual(Object.keys(result.errors).length, 0);
    });

    it('should validate name when provided', () => {
      const result = validateUpdateAcademicYearInput({ name: '' });
      assert.ok(result.errors.name);
    });

    it('should validate dates when provided', () => {
      const result = validateUpdateAcademicYearInput({
        startDate: 'invalid',
        endDate: '2025-06-30',
      });
      assert.ok(result.errors.startDate);
    });

    it('should pass for valid partial update', () => {
      const result = validateUpdateAcademicYearInput({
        name: '2025/2026 Academic Year',
      });
      assert.strictEqual(Object.keys(result.errors).length, 0);
      assert.strictEqual(result.name, '2025/2026 Academic Year');
    });

    it('should validate end date after start date when both provided', () => {
      const result = validateUpdateAcademicYearInput({
        startDate: '2025-09-01',
        endDate: '2024-06-30',
      });
      assert.ok(result.errors.endDate);
    });
  });

  describe('validateAcademicYearId', () => {
    it('should return error for missing id', () => {
      const result = validateAcademicYearId();
      assert.ok(result.errors.id);
    });

    it('should return error for empty id', () => {
      const result = validateAcademicYearId('');
      assert.ok(result.errors.id);
    });

    it('should pass for valid id', () => {
      const result = validateAcademicYearId('550e8400-e29b-41d4-a716-446655440000');
      assert.strictEqual(Object.keys(result.errors).length, 0);
      assert.strictEqual(result.id, '550e8400-e29b-41d4-a716-446655440000');
    });

    it('should trim whitespace from id', () => {
      const result = validateAcademicYearId('  some-id  ');
      assert.strictEqual(result.id, 'some-id');
    });
  });
});

