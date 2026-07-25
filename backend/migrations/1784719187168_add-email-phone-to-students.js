/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
const shorthands = undefined;

const up = (pgm) => {
  pgm.addColumns('students', {
    email: { type: 'varchar(255)' },
    phone: { type: 'varchar(30)' },
  });

  pgm.createIndex('students', 'email', { name: 'students_email_active_idx', where: 'deleted_at IS NULL' });
};

const down = (pgm) => {
  pgm.dropIndex('students', 'email', { name: 'students_email_active_idx' });
  pgm.dropColumns('students', ['email', 'phone']);
};

module.exports = {
  shorthands,
  up,
  down,
};

