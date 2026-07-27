/**
 * Migration: Create academic_years table
 * 
 * Stores school academic years with start/end dates and activation status.
 */
exports.up = (pgm) => {
  pgm.createTable('academic_years', {
    id: {
      type: 'uuid',
      default: pgm.func('gen_random_uuid()'),
      primaryKey: true,
    },
    name: {
      type: 'varchar(100)',
      notNull: true,
    },
    start_date: {
      type: 'date',
      notNull: true,
    },
    end_date: {
      type: 'date',
      notNull: true,
    },
    is_active: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
    description: {
      type: 'text',
    },
    status: {
      type: 'varchar(20)',
      notNull: true,
      default: 'ACTIVE',
      check: "status IN ('ACTIVE', 'INACTIVE')",
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
    deleted_at: {
      type: 'timestamp',
    },
  });

  // Add index for active year lookups
  pgm.createIndex('academic_years', 'is_active');
  pgm.createIndex('academic_years', 'deleted_at');
};

exports.down = (pgm) => {
  pgm.dropTable('academic_years');
};

