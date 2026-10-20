/**
 * Migration: Create Student Enrollment and Academic Progression History Table
 * Tracks multi-year student transitions, end-of-year promotion snapshots, and transcripts.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('student_academic_history', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    school_id: {
      type: 'uuid',
      references: 'schools(id)',
      onDelete: 'cascade',
    },
    student_id: {
      type: 'uuid',
      notNull: true,
      references: 'students(id)',
      onDelete: 'cascade',
    },
    academic_year_id: {
      type: 'uuid',
      notNull: true,
      references: 'academic_years(id)',
      onDelete: 'cascade',
    },
    grade_id: {
      type: 'uuid',
      references: 'grades(id)',
      onDelete: 'set null',
    },
    section_id: {
      type: 'uuid',
      references: 'sections(id)',
      onDelete: 'set null',
    },
    roll_number: {
      type: 'varchar(50)',
    },
    final_average: {
      type: 'numeric(5, 2)',
    },
    final_grade_letter: {
      type: 'varchar(10)',
    },
    promotion_status: {
      type: 'varchar(50)',
      notNull: true,
      default: 'PROMOTED', // 'PROMOTED', 'RETAINED', 'GRADUATED', 'TRANSFERRED', 'WITHDRAWN'
    },
    promoted_to_academic_year_id: {
      type: 'uuid',
      references: 'academic_years(id)',
      onDelete: 'set null',
    },
    promoted_to_grade_id: {
      type: 'uuid',
      references: 'grades(id)',
      onDelete: 'set null',
    },
    promoted_to_section_id: {
      type: 'uuid',
      references: 'sections(id)',
      onDelete: 'set null',
    },
    promoted_by: {
      type: 'uuid',
      references: 'users(id)',
      onDelete: 'set null',
    },
    promoted_at: {
      type: 'timestamp with time zone',
      default: pgm.func('current_timestamp'),
    },
    remarks: {
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
  });

  // Exactly one enrollment history snapshot per student per academic year
  pgm.createIndex('student_academic_history', ['student_id', 'academic_year_id'], {
    name: 'idx_student_academic_history_student_year_unique',
    unique: true,
  });

  pgm.createIndex('student_academic_history', 'student_id', {
    name: 'idx_student_academic_history_student_id',
  });

  pgm.createIndex('student_academic_history', 'academic_year_id', {
    name: 'idx_student_academic_history_academic_year_id',
  });

  pgm.createIndex('student_academic_history', ['grade_id', 'section_id'], {
    name: 'idx_student_academic_history_grade_section',
  });
};

exports.down = (pgm) => {
  pgm.dropTable('student_academic_history');
};
