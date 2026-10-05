const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const FinanceService = require('../src/modules/finance/finance.service');

describe('Payroll bank CSV export', () => {
  it('exports the requested payroll columns and payslip values', async () => {
    const service = new FinanceService({
      getPayrollRunById: async () => ({
        batch_reference: 'PAY-RUN-202610-001',
        payslips: [
          {
            first_name: 'Ada',
            last_name: 'O"Neil',
            base_salary: '10000',
            total_allowances: '1200',
            gross_salary: '11200',
            taxable_income: '10600',
            tax_deduction: '1800',
            pension_employee_deduction: '700',
            total_deductions: '2500',
            net_salary: '8700',
            bank_account_number: '001234567890',
            status: 'PAID',
          },
        ],
      }),
    });

    const result = await service.generateBankExportCsv('school-1', 'run-1');

    assert.equal(
      result.csvContent.split('\n')[0],
      '"Employee","Base Salary","Allowances","Gross Salary","Taxable Income","PAYE Tax","Pension (7%)","Total Deductions","Net Payment","Bank Account","Status"'
    );
    assert.equal(
      result.csvContent.split('\n')[1],
      '"Ada O""Neil",10000.00,1200.00,11200.00,10600.00,1800.00,700.00,2500.00,8700.00,"001234567890","PAID"'
    );
  });

  it('reports an error when the payroll run does not exist', async () => {
    const service = new FinanceService({
      getPayrollRunById: async () => null,
    });

    await assert.rejects(
      service.generateBankExportCsv('school-1', 'missing-run'),
      { message: 'Payroll run not found' }
    );
  });
});
