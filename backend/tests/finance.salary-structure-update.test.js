const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const FinanceRepository = require('../src/modules/finance/finance.repository');

describe('Salary structure update', () => {
  it('updates the selected structure by ID instead of inserting by employee', async () => {
    const calls = [];
    const repository = new FinanceRepository({
      query: async (...args) => {
        calls.push(args);
        return { rows: [{ id: 'structure-1', base_salary: '15000' }] };
      },
    });

    const updated = await repository.updateSalaryStructure('structure-1', 'school-1', {
      base_salary: 15000,
      bank_name: 'CBE',
      bank_account_name: '',
      bank_account_number: '001234',
    });

    assert.equal(updated.id, 'structure-1');
    assert.match(calls[0][0], /^UPDATE salary_structures/);
    assert.match(calls[0][0], /WHERE id = \$17/);
    assert.match(calls[0][0], /school_id = \$18/);
    assert.doesNotMatch(calls[0][0], /INSERT INTO salary_structures/);
    assert.equal(calls[0][1][0], 15000);
    assert.equal(calls[0][1][16], 'structure-1');
    assert.equal(calls[0][1][17], 'school-1');
  });

  it('returns no record when the selected structure is not active or accessible', async () => {
    const repository = new FinanceRepository({
      query: async () => ({ rows: [] }),
    });

    const updated = await repository.updateSalaryStructure('missing', 'school-1', {
      base_salary: 15000,
    });

    assert.equal(updated, null);
  });
});
