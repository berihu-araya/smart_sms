/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
const shorthands = undefined;

const up = (pgm) => {
  pgm.createTable('teachers', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: {
      type: 'uuid',
      references: 'users(id)',
      onDelete: 'set null',
    },
    employee_number: { type: 'varchar(50)', notNull: true, unique: true },
    first_name: { type: 'varchar(100)', notNull: true },
    last_name: { type: 'varchar(100)', notNull: true },
    gender: { type: 'varchar(20)', notNull: true },
    date_of_birth: { type: 'date' },
    phone: { type: 'varchar(30)' },
    email: { type: 'varchar(255)' },
    address: { type: 'text' },
    qualification: { type: 'varchar(255)' },
    designation: { type: 'varchar(150)' },
    department: { type: 'varchar(150)' },
    joining_date: { type: 'date' },
    status: { type: 'varchar(20)', notNull: true, default: 'ACTIVE' },
    created_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
    deleted_at: { type: 'timestamp with time zone' },
  });

  pgm.createIndex('teachers', 'employee_number', { name: 'teachers_employee_number_active_idx', where: 'deleted_at IS NULL' });
  pgm.createIndex('teachers', 'email', { name: 'teachers_email_active_idx', where: 'deleted_at IS NULL' });
};

const down = (pgm) => {
  pgm.dropTable('teachers');
};

module.exports = {
  shorthands,
  up,
  down,
};

