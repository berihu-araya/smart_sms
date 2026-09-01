/**
 * Migration: Create class_teachers table
 * 
 * Stores class teacher assignments with one teacher per section for the current academic year.
 * - Tracks which teacher is the homeroom/class teacher of a section
 * - Enforces one teacher per section constraint per academic year
 * - Supports historical tracking with start/end dates
 */
const shorthands = undefined;

const up = (pgm) => {
  // Create class_teachers table
  pgm.createTable('class_teachers', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    teacher_id: {
      type: 'uuid',
      notNull: true,
      references: 'teachers(id)',
      onDelete: 'restrict',
    },
    section_id: {
      type: 'uuid',
      notNull: true,
      references: 'sections(id)',
      onDelete: 'cascade',
    },
    academic_year_id: {
      type: 'uuid',
      notNull: true,
      references: 'academic_years(id)',
      onDelete: 'cascade',
    },
    start_date: {
      type: 'date',
      notNull: true,
    },
    end_date: {
      type: 'date',
    },
    status: {
      type: 'varchar(20)',
      notNull: true,
      default: 'ACTIVE',
      check: "status IN ('ACTIVE', 'INACTIVE')",
    },
    notes: {
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

  // Unique constraint: one active class teacher per section per academic year
  pgm.addConstraint(
    'class_teachers',
    'class_teacher_unique_per_section_academic_year',
    {
      unique: ['section_id', 'academic_year_id'],
      where: "status = 'ACTIVE' AND deleted_at IS NULL",
    }
  );

  // Unique constraint: teacher can't be class teacher of multiple sections in same academic year
  pgm.addConstraint(
    'class_teachers',
    'class_teacher_unique_per_teacher_academic_year',
    {
      unique: ['teacher_id', 'academic_year_id'],
      where: "status = 'ACTIVE' AND deleted_at IS NULL",
    }
  );

  // Check dates constraint
  pgm.addConstraint(
    'class_teachers',
    'class_teacher_dates_check',
    {
      check: 'end_date IS NULL OR start_date IS NULL OR end_date >= start_date',
    }
  );

  // Create indexes
  pgm.createIndex('class_teachers', ['teacher_id']);
  pgm.createIndex('class_teachers', ['section_id']);
  pgm.createIndex('class_teachers', ['academic_year_id']);
  pgm.createIndex('class_teachers', ['status'], {
    where: 'deleted_at IS NULL',
    name: 'class_teachers_status_active_idx',
  });
  pgm.createIndex('class_teachers', ['teacher_id', 'academic_year_id'], {
    where: "status = 'ACTIVE' AND deleted_at IS NULL",
    name: 'class_teacher_teacher_academic_year_unique_idx',
  });
  pgm.createIndex('class_teachers', ['section_id', 'academic_year_id'], {
    where: "status = 'ACTIVE' AND deleted_at IS NULL",
    name: 'class_teacher_section_academic_year_unique_idx',
  });
};

const down = (pgm) => {
  pgm.dropTable('class_teachers');
};

module.exports = {
  shorthands,
  up,
  down,
};
