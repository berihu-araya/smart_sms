/**
 * Migration: Create core timetable tables
 * 
 * - periods (bell schedule / periods configuration)
 * - teacher_availabilities (teacher slot availability matrix)
 * - timetables (master schedule containers, drafts, published versions)
 * - timetable_entries (individual scheduled lessons)
 * - timetable_substitutions (temporary teacher replacements)
 * 
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
const shorthands = undefined;

const up = (pgm) => {
  // 1. Periods table
  pgm.createTable('periods', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    academic_year_id: {
      type: 'uuid',
      notNull: true,
      references: 'academic_years(id)',
      onDelete: 'cascade',
    },
    name: {
      type: 'varchar(100)',
      notNull: true,
    },
    period_type: {
      type: 'varchar(50)',
      notNull: true,
      default: 'LESSON',
    },
    start_time: {
      type: 'time',
      notNull: true,
    },
    end_time: {
      type: 'time',
      notNull: true,
    },
    period_order: {
      type: 'integer',
      notNull: true,
    },
    is_break: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
    days_of_week: {
      type: 'varchar(20)[]',
      notNull: true,
      default: pgm.func("ARRAY['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY']::varchar(20)[]"),
    },
    is_active: {
      type: 'boolean',
      notNull: true,
      default: true,
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

  pgm.addConstraint('periods', 'periods_time_check', {
    check: 'end_time > start_time',
  });

  pgm.addConstraint('periods', 'periods_type_check', {
    check: "period_type IN ('LESSON', 'BREAK', 'ASSEMBLY', 'HOMEROOM')",
  });

  pgm.addConstraint('periods', 'periods_order_unique_per_year', {
    unique: ['academic_year_id', 'period_order'],
    where: 'deleted_at IS NULL',
  });

  pgm.createIndex('periods', ['academic_year_id', 'period_order'], {
    name: 'periods_year_order_idx',
    where: 'deleted_at IS NULL',
  });
  pgm.createIndex('periods', 'is_active');

  // 2. Teacher Availabilities table
  pgm.createTable('teacher_availabilities', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    teacher_id: {
      type: 'uuid',
      notNull: true,
      references: 'teachers(id)',
      onDelete: 'cascade',
    },
    academic_year_id: {
      type: 'uuid',
      notNull: true,
      references: 'academic_years(id)',
      onDelete: 'cascade',
    },
    day_of_week: {
      type: 'varchar(20)',
      notNull: true,
    },
    period_id: {
      type: 'uuid',
      notNull: true,
      references: 'periods(id)',
      onDelete: 'cascade',
    },
    is_available: {
      type: 'boolean',
      notNull: true,
      default: true,
    },
    reason: {
      type: 'text',
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

  pgm.addConstraint('teacher_availabilities', 'teacher_availabilities_day_check', {
    check: "day_of_week IN ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY')",
  });

  pgm.addConstraint('teacher_availabilities', 'teacher_availabilities_slot_unique', {
    unique: ['teacher_id', 'academic_year_id', 'day_of_week', 'period_id'],
    where: 'deleted_at IS NULL',
  });

  pgm.createIndex('teacher_availabilities', ['teacher_id', 'academic_year_id']);
  pgm.createIndex('teacher_availabilities', 'period_id');

  // 3. Timetables table
  pgm.createTable('timetables', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    academic_year_id: {
      type: 'uuid',
      notNull: true,
      references: 'academic_years(id)',
      onDelete: 'cascade',
    },
    term: {
      type: 'varchar(50)',
      notNull: true,
    },
    name: {
      type: 'varchar(150)',
      notNull: true,
    },
    status: {
      type: 'varchar(20)',
      notNull: true,
      default: 'DRAFT',
    },
    version: {
      type: 'integer',
      notNull: true,
      default: 1,
    },
    is_active: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
    published_at: {
      type: 'timestamp with time zone',
    },
    published_by: {
      type: 'uuid',
      references: 'users(id)',
      onDelete: 'set null',
    },
    archived_at: {
      type: 'timestamp with time zone',
    },
    created_by: {
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

  pgm.addConstraint('timetables', 'timetables_status_check', {
    check: "status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')",
  });

  pgm.addConstraint('timetables', 'timetables_version_check', {
    check: 'version > 0',
  });

  pgm.createIndex('timetables', ['academic_year_id', 'term', 'status']);
  pgm.createIndex('timetables', 'is_active');

  // 4. Timetable Entries table
  pgm.createTable('timetable_entries', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    timetable_id: {
      type: 'uuid',
      notNull: true,
      references: 'timetables(id)',
      onDelete: 'cascade',
    },
    section_id: {
      type: 'uuid',
      notNull: true,
      references: 'sections(id)',
      onDelete: 'cascade',
    },
    subject_id: {
      type: 'uuid',
      notNull: true,
      references: 'subjects(id)',
      onDelete: 'cascade',
    },
    teacher_id: {
      type: 'uuid',
      notNull: true,
      references: 'teachers(id)',
      onDelete: 'cascade',
    },
    room_id: {
      type: 'uuid',
      references: 'rooms(id)',
      onDelete: 'set null',
    },
    period_id: {
      type: 'uuid',
      notNull: true,
      references: 'periods(id)',
      onDelete: 'cascade',
    },
    day_of_week: {
      type: 'varchar(20)',
      notNull: true,
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

  pgm.addConstraint('timetable_entries', 'timetable_entries_day_check', {
    check: "day_of_week IN ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY')",
  });

  // Critical composite indexes for rapid conflict detection and filtering
  pgm.createIndex('timetable_entries', ['timetable_id', 'teacher_id', 'day_of_week', 'period_id'], {
    name: 'timetable_entries_teacher_slot_idx',
    where: 'deleted_at IS NULL',
  });

  pgm.createIndex('timetable_entries', ['timetable_id', 'section_id', 'day_of_week', 'period_id'], {
    name: 'timetable_entries_section_slot_idx',
    where: 'deleted_at IS NULL',
  });

  pgm.createIndex('timetable_entries', ['timetable_id', 'room_id', 'day_of_week', 'period_id'], {
    name: 'timetable_entries_room_slot_idx',
    where: 'deleted_at IS NULL',
  });

  pgm.createIndex('timetable_entries', ['timetable_id', 'section_id'], {
    name: 'timetable_entries_section_idx',
    where: 'deleted_at IS NULL',
  });

  pgm.createIndex('timetable_entries', ['timetable_id', 'teacher_id'], {
    name: 'timetable_entries_teacher_idx',
    where: 'deleted_at IS NULL',
  });

  // 5. Timetable Substitutions table
  pgm.createTable('timetable_substitutions', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    timetable_entry_id: {
      type: 'uuid',
      notNull: true,
      references: 'timetable_entries(id)',
      onDelete: 'cascade',
    },
    date: {
      type: 'date',
      notNull: true,
    },
    original_teacher_id: {
      type: 'uuid',
      notNull: true,
      references: 'teachers(id)',
      onDelete: 'cascade',
    },
    substitute_teacher_id: {
      type: 'uuid',
      notNull: true,
      references: 'teachers(id)',
      onDelete: 'cascade',
    },
    replacement_room_id: {
      type: 'uuid',
      references: 'rooms(id)',
      onDelete: 'set null',
    },
    reason: {
      type: 'text',
    },
    status: {
      type: 'varchar(20)',
      notNull: true,
      default: 'APPROVED',
    },
    approved_by: {
      type: 'uuid',
      references: 'users(id)',
      onDelete: 'set null',
    },
    created_by: {
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

  pgm.addConstraint('timetable_substitutions', 'timetable_substitutions_status_check', {
    check: "status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')",
  });

  pgm.addConstraint('timetable_substitutions', 'timetable_substitutions_slot_unique', {
    unique: ['timetable_entry_id', 'date'],
    where: 'deleted_at IS NULL',
  });

  pgm.createIndex('timetable_substitutions', ['date', 'status']);
  pgm.createIndex('timetable_substitutions', 'substitute_teacher_id');
  pgm.createIndex('timetable_substitutions', 'original_teacher_id');
};

const down = (pgm) => {
  pgm.dropTable('timetable_substitutions');
  pgm.dropTable('timetable_entries');
  pgm.dropTable('timetables');
  pgm.dropTable('teacher_availabilities');
  pgm.dropTable('periods');
};

module.exports = {
  shorthands,
  up,
  down,
};
