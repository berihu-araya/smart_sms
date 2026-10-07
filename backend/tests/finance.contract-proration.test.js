const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  getDaysInMonth,
  calculateContractProration,
  calculateEmployeeSalary,
} = require('../src/modules/finance/payroll-calculator');

describe('Contract Date Proration & Ethiopian Payroll Engine', () => {
  describe('1. Calendar & Date Helpers', () => {
    it('correctly calculates days in months including February leap years', () => {
      assert.equal(getDaysInMonth(2026, 1), 31); // Jan
      assert.equal(getDaysInMonth(2026, 2), 28); // Feb 2026 (non-leap)
      assert.equal(getDaysInMonth(2024, 2), 29); // Feb 2024 (leap year)
      assert.equal(getDaysInMonth(2026, 4), 30); // Apr
      assert.equal(getDaysInMonth(2026, 10), 31); // Oct
    });
  });

  describe('2. Contract Date Eligibility & Worked Days Proration', () => {
    it('handles full month when contract started before the month began', () => {
      const proration = calculateContractProration('2026-01-01', null, 2026, 10);
      assert.equal(proration.isEligible, true);
      assert.equal(proration.isProrated, false);
      assert.equal(proration.workedDays, 31);
      assert.equal(proration.totalDays, 31);
      assert.equal(proration.prorationFactor, 1.0);
    });

    it('prorates mid-month hire from contract start date (e.g. joined Oct 15 in a 31-day month)', () => {
      // Oct 15 to Oct 31 inclusive = 17 days
      const proration = calculateContractProration('2026-10-15', null, 2026, 10);
      assert.equal(proration.isEligible, true);
      assert.equal(proration.isProrated, true);
      assert.equal(proration.workedDays, 17);
      assert.equal(proration.totalDays, 31);
      assert.equal(proration.prorationFactor, 0.5484); // 17 / 31 rounded to 4 decimals
    });

    it('prorates mid-month contract termination / end date (e.g. ended Oct 10 in a 31-day month)', () => {
      // Oct 1 to Oct 10 inclusive = 10 days
      const proration = calculateContractProration('2025-01-01', '2026-10-10', 2026, 10);
      assert.equal(proration.isEligible, true);
      assert.equal(proration.isProrated, true);
      assert.equal(proration.workedDays, 10);
      assert.equal(proration.totalDays, 31);
      assert.equal(proration.prorationFactor, 0.3226); // 10 / 31 rounded to 4 decimals
    });

    it('prorates when both contract start and end fall within the same month (e.g. Oct 5 to Oct 20)', () => {
      // Oct 5 to Oct 20 inclusive = 16 days
      const proration = calculateContractProration('2026-10-05', '2026-10-20', 2026, 10);
      assert.equal(proration.isEligible, true);
      assert.equal(proration.isProrated, true);
      assert.equal(proration.workedDays, 16);
      assert.equal(proration.totalDays, 31);
      assert.equal(proration.prorationFactor, 0.5161); // 16 / 31
    });

    it('excludes contracts that start after the payroll month ends', () => {
      // Starts Nov 1 for an October payroll run
      const proration = calculateContractProration('2026-11-01', null, 2026, 10);
      assert.equal(proration.isEligible, false);
      assert.equal(proration.workedDays, 0);
      assert.equal(proration.prorationFactor, 0.0);
    });

    it('excludes contracts that ended before the payroll month begins', () => {
      // Ended Sep 30 for an October payroll run
      const proration = calculateContractProration('2025-01-01', '2026-09-30', 2026, 10);
      assert.equal(proration.isEligible, false);
      assert.equal(proration.workedDays, 0);
      assert.equal(proration.prorationFactor, 0.0);
    });
  });

  describe('3. Prorated Compensation, Deductions & Taxes', () => {
    it('accurately calculates prorated base salary, allowances, and statutory taxes for mid-month hire', () => {
      // Employee has standard salary: Base 30,000 ETB, Transport 2,000 ETB, Housing 4,000 ETB
      // Joined on Oct 16th (16 days worked out of 31 days in October -> factor = 16/31 = 0.5161)
      const factor = 16 / 31;
      const calc = calculateEmployeeSalary({
        basicSalary: 30000,
        transportAllowance: 2000,
        housingAllowance: 4000,
        workedDays: 16,
        totalDaysInMonth: 31,
        prorationFactor: factor,
        isProrated: true,
      });

      assert.equal(calc.isProrated, true);
      assert.equal(calc.workedDays, 16);
      assert.equal(calc.totalDaysInMonth, 31);
      assert.equal(calc.unproratedBaseSalary, 30000.00);

      // Prorated Basic: 30,000 * (16/31) = 15,483.87 ETB
      assert.equal(calc.basicSalary, 15483.87);

      // Prorated Transport: 2,000 * (16/31) = 1,032.26 ETB
      assert.equal(calc.transportAllowance, 1032.26);

      // Prorated Housing: 4,000 * (16/31) = 2,064.52 ETB
      assert.equal(calc.housingAllowance, 2064.52);

      // Prorated Transport Exemption: 600 * (16/31) = 309.68 ETB
      assert.equal(calc.transportExemption, 309.68);
      // Taxable Transport: 1032.26 - 309.68 = 722.58 ETB
      assert.equal(calc.taxableTransport, 722.58);

      // Total Allowances: 1032.26 + 2064.52 = 3096.78 ETB
      assert.equal(calc.totalAllowances, 3096.78);

      // Gross Salary: 15483.87 + 3096.78 = 18580.65 ETB
      assert.equal(calc.grossSalary, 18580.65);

      // Taxable Income: 15483.87 + 722.58 + 2064.52 = 18270.97 ETB
      assert.equal(calc.taxableIncome, 18270.97);

      // Employee Pension (7% of 15483.87) = 1083.87 ETB
      assert.equal(calc.pensionEmployee, 1083.87);

      // Employer Pension (11% of 15483.87) = 1703.23 ETB
      assert.equal(calc.pensionEmployer, 1703.23);

      // PAYE Tax on 18270.97 ETB (> 14000 bracket: 18270.97 * 0.35 - 2050) = 4344.84 ETB
      assert.equal(calc.payeTax, 4344.84);

      // Total Deductions: 1083.87 + 4344.84 = 5428.71 ETB
      assert.equal(calc.totalDeductions, 5428.71);

      // Net Salary: 18580.65 - 5428.71 = 13151.94 ETB
      assert.equal(calc.netSalary, 13151.94);
    });

    it('handles exact 50% month proration cleanly', () => {
      const calc = calculateEmployeeSalary({
        basicSalary: 20000,
        transportAllowance: 1000,
        workedDays: 15,
        totalDaysInMonth: 30,
        prorationFactor: 0.5,
        isProrated: true,
      });

      assert.equal(calc.basicSalary, 10000.00);
      assert.equal(calc.transportAllowance, 500.00);
      assert.equal(calc.transportExemption, 300.00); // 600 * 0.5
      assert.equal(calc.taxableTransport, 200.00);
      assert.equal(calc.taxableIncome, 10200.00); // 10000 + 200
      // PAYE on 10200: (10200 * 0.30 - 1350) = 1710.00
      assert.equal(calc.payeTax, 1710.00);
      assert.equal(calc.pensionEmployee, 700.00); // 7% of 10000
      assert.equal(calc.netSalary, 10500 - 1710 - 700); // 8090.00
    });
  });
});
