/**
 * Adds review and close audit fields and normalizes legacy payroll statuses.
 */

const shorthands = undefined;

const up = async (pgm) => {
  pgm.addColumns('payroll_runs', {
    reviewed_by: {
      type: 'uuid',
      references: 'users(id)',
      onDelete: 'set null',
    },
    reviewed_at: {
      type: 'timestamp with time zone',
    },
    closed_at: {
      type: 'timestamp with time zone',
    },
  });

  pgm.sql(`
    UPDATE payroll_runs
    SET status = CASE status
      WHEN 'PROCESSED' THEN 'CALCULATED'
      WHEN 'DISBURSED' THEN 'PAID'
      ELSE status
    END
    WHERE status IN ('PROCESSED', 'DISBURSED')
  `);
  pgm.addConstraint('payroll_runs', 'payroll_runs_status_check', {
    check: "status IN ('DRAFT', 'CALCULATED', 'REVIEWED', 'APPROVED', 'PAID', 'DONE')",
  });
};

const down = async (pgm) => {
  pgm.dropConstraint('payroll_runs', 'payroll_runs_status_check', { ifExists: true });
  pgm.sql(`
    UPDATE payroll_runs
    SET status = CASE
      WHEN status IN ('CALCULATED', 'REVIEWED', 'APPROVED') THEN 'PROCESSED'
      WHEN status IN ('PAID', 'DONE') THEN 'DISBURSED'
      ELSE status
    END
    WHERE status IN ('CALCULATED', 'REVIEWED', 'APPROVED', 'PAID', 'DONE')
  `);
  pgm.dropColumns('payroll_runs', ['reviewed_by', 'reviewed_at', 'closed_at'], { ifExists: true });
};

module.exports = {
  shorthands,
  up,
  down,
};
