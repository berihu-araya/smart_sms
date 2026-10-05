/**
 * Migration: enhance-payroll-calculation-engine
 * Adds professional allowance, configurable transport exemption, configurable tax brackets, and custom earnings/deductions.
 */

const shorthands = undefined;

const up = async (pgm) => {
  // 1. Add fields to finance_settings
  pgm.addColumns('finance_settings', {
    transport_tax_exemption_limit: {
      type: 'numeric(10, 2)',
      notNull: true,
      default: 600.00,
    },
    pension_employee_rate: {
      type: 'numeric(5, 2)',
      notNull: true,
      default: 7.00,
    },
    pension_employer_rate: {
      type: 'numeric(5, 2)',
      notNull: true,
      default: 11.00,
    },
    tax_brackets_json: {
      type: 'jsonb',
      notNull: true,
      default: JSON.stringify([
        { min: 0, max: 2000, rate: 0.00, offset: 0.00 },
        { min: 2001, max: 4000, rate: 0.15, offset: 300.00 },
        { min: 4001, max: 7000, rate: 0.20, offset: 500.00 },
        { min: 7001, max: 10000, rate: 0.25, offset: 850.00 },
        { min: 10001, max: 14000, rate: 0.30, offset: 1350.00 },
        { min: 14001, max: null, rate: 0.35, offset: 2050.00 },
      ]),
    },
  });

  // 2. Add columns to salary_structures
  pgm.addColumns('salary_structures', {
    professional_allowance: {
      type: 'numeric(10, 2)',
      notNull: true,
      default: 0.00,
    },
    custom_earnings: {
      type: 'jsonb',
      notNull: true,
      default: '[]',
    },
    custom_deductions: {
      type: 'jsonb',
      notNull: true,
      default: '[]',
    },
  });

  // 3. Add columns to payslips
  pgm.addColumns('payslips', {
    professional_allowance: {
      type: 'numeric(12, 2)',
      notNull: true,
      default: 0.00,
    },
    transport_exemption: {
      type: 'numeric(12, 2)',
      notNull: true,
      default: 0.00,
    },
    taxable_income: {
      type: 'numeric(12, 2)',
      notNull: true,
      default: 0.00,
    },
  });
};

const down = async (pgm) => {
  pgm.dropColumns('payslips', ['professional_allowance', 'transport_exemption', 'taxable_income'], { ifExists: true });
  pgm.dropColumns('salary_structures', ['professional_allowance', 'custom_earnings', 'custom_deductions'], { ifExists: true });
  pgm.dropColumns('finance_settings', ['transport_tax_exemption_limit', 'pension_employee_rate', 'pension_employer_rate', 'tax_brackets_json'], { ifExists: true });
};

module.exports = {
  shorthands,
  up,
  down,
};
