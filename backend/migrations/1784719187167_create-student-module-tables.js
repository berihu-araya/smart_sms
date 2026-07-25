/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
const shorthands = undefined;

const up = (pgm) => {
  pgm.createTable('parents', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    full_name: { type: 'varchar(150)', notNull: true },
    phone: { type: 'varchar(30)' },
    email: { type: 'varchar(255)' },
    occupation: { type: 'varchar(150)' },
    address: { type: 'text' },
    created_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
    deleted_at: { type: 'timestamp with time zone' },
  });

  pgm.createTable('sections', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    name: { type: 'varchar(100)', notNull: true },
    room_number: { type: 'varchar(50)' },
    created_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
    deleted_at: { type: 'timestamp with time zone' },
  });

  pgm.createTable('students', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: {
      type: 'uuid',
      references: 'users(id)',
      onDelete: 'set null',
    },
    parent_id: {
      type: 'uuid',
      references: 'parents(id)',
      onDelete: 'set null',
    },
    section_id: {
      type: 'uuid',
      references: 'sections(id)',
      onDelete: 'set null',
    },
    admission_number: { type: 'varchar(50)', notNull: true, unique: true },
    first_name: { type: 'varchar(100)', notNull: true },
    last_name: { type: 'varchar(100)', notNull: true },
    gender: { type: 'varchar(20)', notNull: true },
    date_of_birth: { type: 'date' },
    admission_date: { type: 'date', notNull: true },
    address: { type: 'text' },
    status: { type: 'varchar(20)', notNull: true, default: 'ACTIVE' },
    created_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
    deleted_at: { type: 'timestamp with time zone' },
  });

  pgm.createIndex('parents', 'email', { name: 'parents_email_active_idx', where: 'deleted_at IS NULL' });
  pgm.createIndex('sections', 'name', { name: 'sections_name_active_idx', where: 'deleted_at IS NULL' });
  pgm.createIndex('students', 'admission_number', { name: 'students_admission_number_active_idx', where: 'deleted_at IS NULL' });
  pgm.createIndex('students', 'section_id');
  pgm.createIndex('students', 'parent_id');
};

const down = (pgm) => {
  pgm.dropTable('students');
  pgm.dropTable('sections');
  pgm.dropTable('parents');
};

module.exports = {
  shorthands,
  up,
  down,
};
