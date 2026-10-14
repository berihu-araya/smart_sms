/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // 1. Add Odoo sync columns to users table (covers all staff types)
  pgm.addColumns('users', {
    odoo_employee_id: {
      type: 'integer',
      notNull: false,
      comment: 'Corresponding hr.employee ID in Odoo ERP',
    },
    odoo_synced_at: {
      type: 'timestamptz',
      notNull: false,
      comment: 'Last successful sync timestamp with Odoo ERP',
    },
  });

  // 2. Add Odoo sync columns to teachers table
  pgm.addColumns('teachers', {
    odoo_employee_id: {
      type: 'integer',
      notNull: false,
      comment: 'Corresponding hr.employee ID in Odoo ERP',
    },
    odoo_synced_at: {
      type: 'timestamptz',
      notNull: false,
      comment: 'Last successful sync timestamp with Odoo ERP',
    },
  });

  // 3. Add Odoo sync columns to payroll_runs table
  pgm.addColumns('payroll_runs', {
    odoo_entry_id: {
      type: 'integer',
      notNull: false,
      comment: 'Corresponding account.move ID in Odoo ERP for General Ledger entry',
    },
    odoo_entry_number: {
      type: 'varchar(100)',
      notNull: false,
      comment: 'Official journal entry reference name in Odoo ERP (e.g. MISC/2026/00001)',
    },
    odoo_synced_at: {
      type: 'timestamptz',
      notNull: false,
      comment: 'Last successful sync timestamp with Odoo ERP',
    },
  });

  // Create indexes for fast lookup and reconciliation
  pgm.createIndex('users', 'odoo_employee_id');
  pgm.createIndex('teachers', 'odoo_employee_id');
  pgm.createIndex('payroll_runs', 'odoo_entry_id');
};

exports.down = (pgm) => {
  pgm.dropIndex('payroll_runs', 'odoo_entry_id');
  pgm.dropIndex('teachers', 'odoo_employee_id');
  pgm.dropIndex('users', 'odoo_employee_id');

  pgm.dropColumns('payroll_runs', ['odoo_entry_id', 'odoo_entry_number', 'odoo_synced_at']);
  pgm.dropColumns('teachers', ['odoo_employee_id', 'odoo_synced_at']);
  pgm.dropColumns('users', ['odoo_employee_id', 'odoo_synced_at']);
};
