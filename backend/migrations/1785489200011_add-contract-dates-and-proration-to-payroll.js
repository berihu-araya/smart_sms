/**
 * Migration: add-contract-dates-and-proration-to-payroll
 * Adds contract start date, contract end date, contract type, and proration tracking columns.
 */

const shorthands = undefined;

const up = async (pgm) => {
  // 1. Add contract fields to salary_structures
  pgm.addColumns('salary_structures', {
    contract_type: {
      type: 'varchar(30)',
      notNull: true,
      default: 'PERMANENT',
    },
    contract_start_date: {
      type: 'date',
      notNull: true,
      default: pgm.func('current_date'),
    },
    contract_end_date: {
      type: 'date',
    },
    employment_type: {
      type: 'varchar(50)',
      default: 'FULL_TIME',
    },
  });

  // Backfill contract_start_date from effective_from
  pgm.sql(`
    UPDATE salary_structures
    SET contract_start_date = COALESCE(effective_from, CURRENT_DATE)
    WHERE contract_start_date IS NULL OR contract_start_date = CURRENT_DATE
  `);

  // 2. Add contract and proration tracking fields to payslips
  pgm.addColumns('payslips', {
    contract_type: {
      type: 'varchar(30)',
      default: 'PERMANENT',
    },
    contract_start_date: {
      type: 'date',
    },
    contract_end_date: {
      type: 'date',
    },
    worked_days: {
      type: 'integer',
      notNull: true,
      default: 30,
    },
    total_days_in_month: {
      type: 'integer',
      notNull: true,
      default: 30,
    },
    proration_factor: {
      type: 'numeric(6, 4)',
      notNull: true,
      default: 1.0000,
    },
    is_prorated: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
    unprorated_base_salary: {
      type: 'numeric(12, 2)',
      notNull: true,
      default: 0.00,
    },
    unprorated_gross_salary: {
      type: 'numeric(12, 2)',
      notNull: true,
      default: 0.00,
    },
  });
};

const down = async (pgm) => {
  pgm.dropColumns('payslips', [
    'contract_type',
    'contract_start_date',
    'contract_end_date',
    'worked_days',
    'total_days_in_month',
    'proration_factor',
    'is_prorated',
    'unprorated_base_salary',
    'unprorated_gross_salary',
  ], { ifExists: true });

  pgm.dropColumns('salary_structures', [
    'contract_type',
    'contract_start_date',
    'contract_end_date',
    'employment_type',
  ], { ifExists: true });
};

module.exports = {
  shorthands,
  up,
  down,
};
