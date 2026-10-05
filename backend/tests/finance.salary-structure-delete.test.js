const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const FinanceRepository = require('../src/modules/finance/finance.repository');

describe('Salary structure deletion', () => {
  it('soft-deletes only the requested active school structure', async () => {
    const calls = [];
    const repository = new FinanceRepository({
      query: async (...args) => {
        calls.push(args);
        return { rows: [{ id: 'structure-1' }] };
      },
    });

    const deleted = await repository.deleteSalaryStructure('structure-1', 'school-1');

    assert.equal(deleted, true);
    assert.match(calls[0][0], /UPDATE salary_structures/);
    assert.match(calls[0][0], /deleted_at = CURRENT_TIMESTAMP/);
    assert.match(calls[0][0], /school_id = \$2/);
    assert.match(calls[0][0], /deleted_at IS NULL/);
    assert.deepEqual(calls[0][1], ['structure-1', 'school-1']);
  });

  it('returns false when no active structure matches', async () => {
    const repository = new FinanceRepository({
      query: async () => ({ rows: [] }),
    });

    assert.equal(await repository.deleteSalaryStructure('missing', 'school-1'), false);
  });
});
