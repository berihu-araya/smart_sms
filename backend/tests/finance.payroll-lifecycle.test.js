const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const FinanceService = require('../src/modules/finance/finance.service');

function createDatabase(queryHandler) {
  return {
    connect: async () => ({
      query: queryHandler,
      release() {},
    }),
  };
}

describe('Payroll lifecycle', () => {
  it('creates a draft period before any calculations exist', async () => {
    const queries = [];
    const service = new FinanceService(
      {},
      createDatabase(async (sql, params) => {
        queries.push({ sql, params });
        if (sql.includes('SELECT id, status FROM payroll_runs')) return { rows: [] };
        if (sql.includes('SELECT COUNT(*) FROM payroll_runs')) return { rows: [{ count: '0' }] };
        if (sql.includes('INSERT INTO payroll_runs')) return { rows: [{ id: 'run-1' }] };
        return { rows: [] };
      })
    );

    const result = await service.createPayrollDraft('school-1', 'admin-1', {
      month: 10,
      year: 2026,
      remarks: 'October payroll',
    });

    assert.equal(result.status, 'DRAFT');
    assert.equal(result.totalStaffCount, 0);
    assert.match(queries.find(({ sql }) => sql.includes('INSERT INTO payroll_runs')).sql, /'DRAFT'/);
  });

  it('calculates a draft from the active salary structures and advances it', async () => {
    const update = [];
    const service = new FinanceService(
      {
        getSettings: async () => ({
          transport_tax_exemption_limit: 600,
          pension_employee_rate: 7,
          pension_employer_rate: 11,
          tax_brackets_json: undefined,
        }),
      },
      createDatabase(async (sql, params) => {
        if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return { rows: [] };
        if (sql.includes('SELECT * FROM payroll_runs')) {
          return { rows: [{ id: 'run-1', status: 'DRAFT', month: 10, year: 2026, batch_reference: 'PAY-RUN-202610-001' }] };
        }
        if (sql.includes('FROM salary_structures ss')) {
          return {
            rows: [{
              user_id: 'staff-1',
              base_salary: '3000',
              transport_allowance: '200',
              professional_allowance: '0',
              housing_allowance: '0',
              medical_allowance: '0',
              other_allowances: '0',
              pension_employee_percentage: '7',
              pension_employer_percentage: '11',
              bank_account_number: '1234',
            }],
          };
        }
        if (sql.includes('SELECT id FROM payslips')) return { rows: [] };
        if (sql.includes('INSERT INTO payslips')) return { rows: [{ id: 'payslip-1' }] };
        if (sql.includes('UPDATE payroll_runs')) {
          update.push({ sql, params });
          return { rows: [] };
        }
        return { rows: [] };
      })
    );

    const result = await service.calculatePayrollRun('school-1', 'run-1');

    assert.equal(result.status, 'CALCULATED');
    assert.equal(result.totalStaffCount, 1);
    assert.equal(result.totalGross, 3200);
    assert.equal(result.totalDeductions, 360);
    assert.equal(result.totalNet, 2840);
    assert.match(update[0].sql, /status = 'CALCULATED'/);
  });

  it('rejects skipping a lifecycle stage', async () => {
    const updates = [];
    const service = new FinanceService(
      {},
      createDatabase(async (sql) => {
        if (sql === 'BEGIN' || sql === 'ROLLBACK' || sql === 'COMMIT') return { rows: [] };
        if (sql.includes('SELECT * FROM payroll_runs')) return { rows: [{ id: 'run-1', status: 'CALCULATED' }] };
        updates.push(sql);
        return { rows: [] };
      })
    );

    await assert.rejects(
      service.transitionPayrollRun('school-1', 'admin-1', 'run-1', 'APPROVED'),
      { message: 'Cannot move payroll from CALCULATED to APPROVED', status: 409 }
    );
    assert.equal(updates.length, 0);
  });

  it('advances legacy PROCESSED payroll to REVIEWED', async () => {
    const updates = [];
    const service = new FinanceService(
      {},
      createDatabase(async (sql) => {
        if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return { rows: [] };
        if (sql.includes('SELECT * FROM payroll_runs')) return { rows: [{ id: 'run-1', status: 'PROCESSED' }] };
        updates.push(sql);
        return { rows: [] };
      })
    );

    const result = await service.transitionPayrollRun('school-1', 'admin-1', 'run-1', 'REVIEWED');

    assert.equal(result.previousStatus, 'PROCESSED');
    assert.equal(result.status, 'REVIEWED');
    assert.match(updates[0], /SET status = 'REVIEWED'/);
  });

  it('closes legacy DISBURSED payroll as DONE', async () => {
    const updates = [];
    const service = new FinanceService(
      {},
      createDatabase(async (sql) => {
        if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return { rows: [] };
        if (sql.includes('SELECT * FROM payroll_runs')) return { rows: [{ id: 'run-1', status: 'DISBURSED' }] };
        updates.push(sql);
        return { rows: [] };
      })
    );

    const result = await service.transitionPayrollRun('school-1', 'admin-1', 'run-1', 'DONE');

    assert.equal(result.previousStatus, 'DISBURSED');
    assert.equal(result.status, 'DONE');
    assert.match(updates[0], /SET status = 'DONE'/);
  });

  it('allows only the ordered review, approval, payment, and close transitions', async () => {
    let currentStatus = 'CALCULATED';
    const service = new FinanceService(
      {},
      createDatabase(async (sql) => {
        if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return { rows: [] };
        if (sql.includes('SELECT * FROM payroll_runs')) {
          return { rows: [{ id: 'run-1', status: currentStatus }] };
        }
        const matchedStatus = sql.match(/SET status = '(REVIEWED|APPROVED|PAID|DONE)'/);
        if (matchedStatus) currentStatus = matchedStatus[1];
        return { rows: [] };
      })
    );

    for (const status of ['REVIEWED', 'APPROVED', 'PAID', 'DONE']) {
      const result = await service.transitionPayrollRun('school-1', 'admin-1', 'run-1', status);
      assert.equal(result.status, status);
      assert.equal(currentStatus, status);
    }

    await assert.rejects(
      service.transitionPayrollRun('school-1', 'admin-1', 'run-1', 'PAID'),
      { message: 'Cannot move payroll from DONE to PAID', status: 409 }
    );
  });

  it('records payment only after approval and updates payslips to paid', async () => {
    const updates = [];
    const service = new FinanceService(
      {},
      createDatabase(async (sql, params) => {
        if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return { rows: [] };
        if (sql.includes('SELECT * FROM payroll_runs')) return { rows: [{ id: 'run-1', status: 'APPROVED' }] };
        updates.push({ sql, params });
        return { rows: [] };
      })
    );

    const result = await service.transitionPayrollRun('school-1', 'admin-1', 'run-1', 'PAID');

    assert.equal(result.status, 'PAID');
    assert.equal(updates.length, 2);
    assert.match(updates[0].sql, /SET status = 'PAID'/);
    assert.match(updates[1].sql, /UPDATE payslips/);
    assert.match(updates[1].sql, /status = 'PAID'/);
  });

  it('closes a paid period and records its close timestamp', async () => {
    const updates = [];
    const service = new FinanceService(
      {},
      createDatabase(async (sql) => {
        if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return { rows: [] };
        if (sql.includes('SELECT * FROM payroll_runs')) return { rows: [{ id: 'run-1', status: 'PAID' }] };
        updates.push(sql);
        return { rows: [] };
      })
    );

    const result = await service.transitionPayrollRun('school-1', 'admin-1', 'run-1', 'DONE');

    assert.equal(result.status, 'DONE');
    assert.match(updates[0], /status = 'DONE'/);
    assert.match(updates[0], /closed_at = CURRENT_TIMESTAMP/);
  });
});
