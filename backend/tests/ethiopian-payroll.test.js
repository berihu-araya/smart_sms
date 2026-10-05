const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  calculateProgressivePAYE,
  calculateEmployeeSalary,
  DEFAULT_TAX_BRACKETS,
  DEFAULT_TRANSPORT_EXEMPTION,
} = require('../src/modules/finance/payroll-calculator');

describe('Ethiopian Payroll Calculation Engine Tests', () => {
  describe('1. Progressive PAYE Tax Bracket & Boundary Tests', () => {
    it('should charge 0% tax for taxable income up to 2,000 ETB', () => {
      assert.equal(calculateProgressivePAYE(0), 0.00);
      assert.equal(calculateProgressivePAYE(1000), 0.00);
      assert.equal(calculateProgressivePAYE(2000), 0.00);
    });

    it('should calculate 15% tax with 300 offset for 2,001 - 4,000 ETB bracket', () => {
      // 2001 * 0.15 - 300 = 0.15
      assert.equal(calculateProgressivePAYE(2001), 0.15);
      // 3000 * 0.15 - 300 = 150.00
      assert.equal(calculateProgressivePAYE(3000), 150.00);
      // 4000 * 0.15 - 300 = 300.00
      assert.equal(calculateProgressivePAYE(4000), 300.00);
    });

    it('should calculate 20% tax with 500 offset for 4,001 - 7,000 ETB bracket', () => {
      // 4001 * 0.20 - 500 = 300.20
      assert.equal(calculateProgressivePAYE(4001), 300.20);
      // 5500 * 0.20 - 500 = 600.00
      assert.equal(calculateProgressivePAYE(5500), 600.00);
      // 7000 * 0.20 - 500 = 900.00
      assert.equal(calculateProgressivePAYE(7000), 900.00);
    });

    it('should calculate 25% tax with 850 offset for 7,001 - 10,000 ETB bracket', () => {
      // 7001 * 0.25 - 850 = 900.25
      assert.equal(calculateProgressivePAYE(7001), 900.25);
      // 8500 * 0.25 - 850 = 1275.00
      assert.equal(calculateProgressivePAYE(8500), 1275.00);
      // 10000 * 0.25 - 850 = 1650.00
      assert.equal(calculateProgressivePAYE(10000), 1650.00);
    });

    it('should calculate 30% tax with 1350 offset for 10,001 - 14,000 ETB bracket', () => {
      // 10001 * 0.30 - 1350 = 1650.30
      assert.equal(calculateProgressivePAYE(10001), 1650.30);
      // 12000 * 0.30 - 1350 = 2250.00
      assert.equal(calculateProgressivePAYE(12000), 2250.00);
      // 14000 * 0.30 - 1350 = 2850.00
      assert.equal(calculateProgressivePAYE(14000), 2850.00);
    });

    it('should calculate 35% tax with 2050 offset for taxable income above 14,000 ETB', () => {
      // 14001 * 0.35 - 2050 = 2850.35
      assert.equal(calculateProgressivePAYE(14001), 2850.35);
      // 20000 * 0.35 - 2050 = 4950.00
      assert.equal(calculateProgressivePAYE(20000), 4950.00);
      // 45729 * 0.35 - 2050 = 13955.15
      assert.equal(calculateProgressivePAYE(45729), 13955.15);
    });
  });

  describe('2. Transport Allowance Exemption Logic', () => {
    it('should exempt transport allowance completely if under or equal to 600 ETB', () => {
      const result1 = calculateEmployeeSalary({ basicSalary: 10000, transportAllowance: 500 });
      assert.equal(result1.transportExemption, 500.00);
      assert.equal(result1.taxableTransport, 0.00);
      assert.equal(result1.taxableIncome, 10000.00);

      const result2 = calculateEmployeeSalary({ basicSalary: 10000, transportAllowance: 600 });
      assert.equal(result2.transportExemption, 600.00);
      assert.equal(result2.taxableTransport, 0.00);
      assert.equal(result2.taxableIncome, 10000.00);
    });

    it('should exempt 600 ETB and tax the remainder for transport allowance above 600 ETB', () => {
      const result = calculateEmployeeSalary({ basicSalary: 10000, transportAllowance: 3860 });
      assert.equal(result.transportExemption, 600.00);
      assert.equal(result.taxableTransport, 3260.00);
      assert.equal(result.taxableIncome, 13260.00);
    });

    it('should support configurable transport exemption limits', () => {
      const result = calculateEmployeeSalary({
        basicSalary: 10000,
        transportAllowance: 3860,
        transportExemptionLimit: 1000.00,
      });
      assert.equal(result.transportExemption, 1000.00);
      assert.equal(result.taxableTransport, 2860.00);
      assert.equal(result.taxableIncome, 12860.00);
    });
  });

  describe('3. Mandatory Real Ethiopian Payroll Test Case (Section 7)', () => {
    /**
     * Test case specified in requirements:
     * Basic Salary:              38,609.00 ETB
     * Transport Allowance:        3,860.00 ETB
     * Professional Allowance:     3,860.00 ETB
     * Gross Salary:              46,329.00 ETB
     * Transport exemption:          600.00 ETB
     * Taxable Income:            45,729.00 ETB
     * PAYE Tax:                  13,955.15 ETB
     * Employee Pension (7%):      2,702.63 ETB
     * Employer Pension (11%):     4,246.99 ETB (does not reduce net salary)
     * Expected Net Salary:       29,671.22 ETB
     */
    it('should accurately calculate the mandatory real-world test case to the exact cent', () => {
      const calc = calculateEmployeeSalary({
        basicSalary: 38609.00,
        transportAllowance: 3860.00,
        professionalAllowance: 3860.00,
      });

      assert.equal(calc.basicSalary, 38609.00);
      assert.equal(calc.transportAllowance, 3860.00);
      assert.equal(calc.professionalAllowance, 3860.00);
      assert.equal(calc.transportExemption, 600.00);
      assert.equal(calc.taxableTransport, 3260.00);

      // Gross Salary: 38,609 + 3,860 + 3,860 = 46,329.00 ETB
      assert.equal(calc.grossSalary, 46329.00);

      // Taxable Income: 46,329 - 600 = 45,729.00 ETB
      assert.equal(calc.taxableIncome, 45729.00);

      // Progressive PAYE: 13,955.15 ETB
      assert.equal(calc.payeTax, 13955.15);

      // Employee Pension (7% of 38,609): 2,702.63 ETB
      assert.equal(calc.pensionEmployee, 2702.63);

      // Employer Pension (11% of 38,609): 4,246.99 ETB
      assert.equal(calc.pensionEmployer, 4246.99);

      // Net Salary: 46,329 - 13,955.15 - 2,702.63 = 29,671.22 ETB
      assert.equal(calc.netSalary, 29671.22);
    });
  });

  describe('4. Pension & Configurable Deductions', () => {
    it('should calculate pension strictly on the pensionable base (basic + pensionable allowances)', () => {
      const calc = calculateEmployeeSalary({
        basicSalary: 20000,
        transportAllowance: 1000,
        customEarnings: [
          { name: 'Acting Allowance', amount: 5000, is_pensionable: true, is_taxable: true, included_in_gross: true },
        ],
      });

      // Pensionable base = 20000 + 5000 = 25000
      assert.equal(calc.pensionableBase, 25000.00);
      assert.equal(calc.pensionEmployee, 1750.00); // 7% of 25000
      assert.equal(calc.pensionEmployer, 2750.00); // 11% of 25000
    });

    it('should support non-taxable custom allowances and custom deductions', () => {
      const calc = calculateEmployeeSalary({
        basicSalary: 10000,
        customEarnings: [
          { name: 'Hardship Allowance (Tax Exempt)', amount: 2000, is_taxable: false, included_in_gross: true },
        ],
        customDeductions: [
          { name: 'Staff Credit Union', amount: 500 },
        ],
      });

      // Gross = 10000 + 2000 = 12000
      assert.equal(calc.grossSalary, 12000.00);
      // Taxable = 10000 (Hardship allowance is exempt)
      assert.equal(calc.taxableIncome, 10000.00);
      // PAYE on 10000 = 1650.00
      assert.equal(calc.payeTax, 1650.00);
      // Employee Pension = 7% of 10000 = 700.00
      assert.equal(calc.pensionEmployee, 700.00);
      // Other deductions = 500.00
      assert.equal(calc.otherDeductions, 500.00);
      // Total deductions = 1650 + 700 + 500 = 2850.00
      assert.equal(calc.totalDeductions, 2850.00);
      // Net Salary = 12000 - 2850 = 9150.00
      assert.equal(calc.netSalary, 9150.00);
    });
  });
});
