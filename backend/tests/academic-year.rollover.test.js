const { describe, it } = require('node:test');
const assert = require('node:assert');
const AcademicYearRolloverService = require('../src/modules/academic-years/academic-year.rollover.service');

describe('Academic Year Rollover Service', () => {
  describe('Input Validation & Boundary Checks', () => {
    const service = new AcademicYearRolloverService({});

    it('getRolloverPreview rejects missing source or target ID', async () => {
      await assert.rejects(
        async () => {
          await service.getRolloverPreview({ sourceAcademicYearId: 'id-1' });
        },
        {
          name: 'Error',
          message: 'Both sourceAcademicYearId and targetAcademicYearId are required',
        }
      );

      await assert.rejects(
        async () => {
          await service.getRolloverPreview({ targetAcademicYearId: 'id-2' });
        },
        {
          name: 'Error',
          message: 'Both sourceAcademicYearId and targetAcademicYearId are required',
        }
      );
    });

    it('getRolloverPreview rejects identical source and target year IDs', async () => {
      await assert.rejects(
        async () => {
          await service.getRolloverPreview({
            sourceAcademicYearId: '00000000-0000-0000-0000-000000000001',
            targetAcademicYearId: '00000000-0000-0000-0000-000000000001',
          });
        },
        {
          name: 'Error',
          message: 'Source and target academic years cannot be the same',
        }
      );
    });

    it('executeRollover rejects missing source or target ID', async () => {
      await assert.rejects(
        async () => {
          await service.executeRollover({ sourceAcademicYearId: 'id-1' });
        },
        {
          name: 'Error',
          message: 'Both sourceAcademicYearId and targetAcademicYearId are required',
        }
      );
    });

    it('executeRollover rejects identical source and target year IDs', async () => {
      await assert.rejects(
        async () => {
          await service.executeRollover({
            sourceAcademicYearId: '00000000-0000-0000-0000-000000000001',
            targetAcademicYearId: '00000000-0000-0000-0000-000000000001',
          });
        },
        {
          name: 'Error',
          message: 'Source and target academic years cannot be the same',
        }
      );
    });
  });

  describe('Rollover Preview with Mocked Database', () => {
    it('returns preview statistics correctly', async () => {
      const mockDatabase = {
        query: async (sql, params) => {
          if (sql.includes('FROM academic_years') && params[0] === 'source-id') {
            return {
              rows: [{ id: 'source-id', name: '2026/27', start_date: '2026-09-01', end_date: '2027-06-30' }],
            };
          }
          if (sql.includes('FROM academic_years') && params[0] === 'target-id') {
            return {
              rows: [{ id: 'target-id', name: '2027/28', start_date: '2027-09-01', end_date: '2028-06-30' }],
            };
          }
          if (sql.includes('FROM grade_subjects') && params[0] === 'source-id') {
            return { rows: [{ count: 15 }] };
          }
          if (sql.includes('FROM grade_subjects') && params[0] === 'target-id') {
            return { rows: [{ count: 0 }] };
          }
          if (sql.includes('FROM teacher_subjects') && params[0] === 'source-id') {
            return { rows: [{ count: 7 }] };
          }
          if (sql.includes('FROM teacher_subjects') && params[0] === 'target-id') {
            return { rows: [{ count: 0 }] };
          }
          if (sql.includes('FROM class_teachers') && params[0] === 'source-id') {
            return { rows: [{ count: 2 }] };
          }
          if (sql.includes('FROM class_teachers') && params[0] === 'target-id') {
            return { rows: [{ count: 0 }] };
          }
          return { rows: [] };
        },
      };

      const service = new AcademicYearRolloverService(mockDatabase);
      const preview = await service.getRolloverPreview({
        sourceAcademicYearId: 'source-id',
        targetAcademicYearId: 'target-id',
      });

      assert.strictEqual(preview.sourceYear.name, '2026/27');
      assert.strictEqual(preview.targetYear.name, '2027/28');
      assert.strictEqual(preview.summary.sourceGradeSubjectsCount, 15);
      assert.strictEqual(preview.summary.targetExistingGradeSubjectsCount, 0);
      assert.strictEqual(preview.summary.sourceTeacherSubjectsCount, 7);
      assert.strictEqual(preview.summary.targetExistingTeacherSubjectsCount, 0);
      assert.strictEqual(preview.summary.sourceClassTeachersCount, 2);
      assert.strictEqual(preview.summary.targetExistingClassTeachersCount, 0);
    });
  });

  describe('Transactional Execution with Mocked Client', () => {
    it('executes rollover transaction and returns counts of cloned entities', async () => {
      const executedQueries = [];
      const mockClient = {
        query: async (sql, params) => {
          executedQueries.push({ sql, params });
          if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
            return { rows: [] };
          }
          if (sql.includes('FROM academic_years') && params[0] === 'source-id') {
            return {
              rows: [{ id: 'source-id', name: '2026/27', start_date: '2026-09-01', end_date: '2027-06-30' }],
            };
          }
          if (sql.includes('FROM academic_years') && params[0] === 'target-id') {
            return {
              rows: [{ id: 'target-id', name: '2027/28', start_date: '2027-09-01', end_date: '2028-06-30' }],
            };
          }
          if (sql.includes('INSERT INTO grade_subjects')) {
            return { rowCount: 15 };
          }
          if (sql.includes('INSERT INTO teacher_subjects')) {
            return { rowCount: 7 };
          }
          if (sql.includes('FROM class_teachers ct') && params[0] === 'source-id') {
            return {
              rows: [
                { section_id: 'sec-1', teacher_id: 'teach-1' },
                { section_id: 'sec-2', teacher_id: 'teach-2' },
              ],
            };
          }
          if (sql.includes('SELECT 1 FROM class_teachers') && params[0] === 'target-id') {
            return { rows: [] }; // no existing
          }
          if (sql.includes('INSERT INTO class_teachers')) {
            return { rowCount: 1 };
          }
          return { rows: [], rowCount: 1 };
        },
        release: () => {},
      };

      const mockDatabase = {
        connect: async () => mockClient,
      };

      const service = new AcademicYearRolloverService(mockDatabase);
      const result = await service.executeRollover({
        sourceAcademicYearId: 'source-id',
        targetAcademicYearId: 'target-id',
        cloneGradeSubjects: true,
        cloneTeacherAssignments: true,
        cloneClassTeachers: true,
        activateTargetYear: true,
        closeSourceYear: true,
      });

      assert.strictEqual(result.stats.clonedGradeSubjects, 15);
      assert.strictEqual(result.stats.clonedTeacherAssignments, 7);
      assert.strictEqual(result.stats.clonedClassTeachers, 2);
      assert.strictEqual(result.targetActivated, true);
      assert.strictEqual(result.sourceClosed, true);

      // Verify BEGIN and COMMIT were invoked
      const hasBegin = executedQueries.some((q) => q.sql === 'BEGIN');
      const hasCommit = executedQueries.some((q) => q.sql === 'COMMIT');
      assert.ok(hasBegin, 'BEGIN must be called');
      assert.ok(hasCommit, 'COMMIT must be called');
    });

    it('rolls back transaction on error and rethrows', async () => {
      let rolledBack = false;
      const mockClient = {
        query: async (sql) => {
          if (sql === 'BEGIN') return { rows: [] };
          if (sql === 'ROLLBACK') {
            rolledBack = true;
            return { rows: [] };
          }
          throw new Error('Database failure during rollover');
        },
        release: () => {},
      };

      const mockDatabase = {
        connect: async () => mockClient,
      };

      const service = new AcademicYearRolloverService(mockDatabase);
      await assert.rejects(
        async () => {
          await service.executeRollover({
            sourceAcademicYearId: 'source-id',
            targetAcademicYearId: 'target-id',
          });
        },
        {
          name: 'Error',
          message: 'Database failure during rollover',
        }
      );

      assert.strictEqual(rolledBack, true, 'ROLLBACK must be executed upon error');
    });
  });
});
