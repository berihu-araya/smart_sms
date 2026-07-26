/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
const shorthands = undefined;

const up = (pgm) => {
  pgm.createTable('grades', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    name: { type: 'varchar(100)', notNull: true },
    description: { type: 'text' },
    created_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
    deleted_at: { type: 'timestamp with time zone' },
  });

  pgm.createIndex('grades', 'name', { name: 'grades_name_active_idx', where: 'deleted_at IS NULL' });
};

const down = (pgm) => {
  pgm.dropTable('grades');
};

module.exports = {
  shorthands,
  up,
  down,
};

