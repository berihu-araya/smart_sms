/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('attendance', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    student_id: {
      type: 'uuid',
      notNull: true,
      references: 'students(id)',
      onDelete: 'cascade',
    },
    section_id: {
      type: 'uuid',
      notNull: true,
      references: 'sections(id)',
      onDelete: 'cascade',
    },
    academic_year_id: {
      type: 'uuid',
      references: 'academic_years(id)',
      onDelete: 'set null',
    },
    date: {
      type: 'date',
      notNull: true,
    },
    status: {
      type: 'varchar(20)',
      notNull: true,
      default: 'PRESENT',
      check: "status IN ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED')",
    },
    remark: {
      type: 'text',
    },
    recorded_by: {
      type: 'uuid',
      references: 'users(id)',
      onDelete: 'set null',
    },
    created_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    updated_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    deleted_at: {
      type: 'timestamp with time zone',
    },
  });

  pgm.addConstraint(
    'attendance',
    'attendance_student_date_unique',
    {
      unique: ['student_id', 'date'],
    }
  );

  pgm.createIndex('attendance', ['section_id', 'date']);
  pgm.createIndex('attendance', ['student_id', 'date']);
  pgm.createIndex('attendance', ['date']);
  pgm.createIndex('attendance', ['status']);
};

exports.down = (pgm) => {
  pgm.dropTable('attendance');
};
