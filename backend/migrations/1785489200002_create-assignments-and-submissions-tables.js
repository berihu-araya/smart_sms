/**
 * Migration: Create Assignments and Assignment Submissions tables
 *
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

exports.up = async (pgm) => {
  // 1. Assignments table
  pgm.createTable('assignments', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    school_id: {
      type: 'uuid',
      references: 'schools(id)',
      onDelete: 'restrict',
    },
    academic_year_id: {
      type: 'uuid',
      references: 'academic_years(id)',
      onDelete: 'set null',
    },
    grade_id: {
      type: 'uuid',
      notNull: true,
      references: 'grades(id)',
      onDelete: 'cascade',
    },
    section_id: {
      type: 'uuid',
      references: 'sections(id)',
      onDelete: 'set null',
    },
    subject_id: {
      type: 'uuid',
      notNull: true,
      references: 'subjects(id)',
      onDelete: 'cascade',
    },
    teacher_id: {
      type: 'uuid',
      references: 'teachers(id)',
      onDelete: 'set null',
    },
    created_by: {
      type: 'uuid',
      references: 'users(id)',
      onDelete: 'set null',
    },
    title: {
      type: 'varchar(255)',
      notNull: true,
    },
    description: {
      type: 'text',
    },
    attachment_urls: {
      type: 'jsonb',
      default: '[]',
    },
    max_marks: {
      type: 'numeric(5,2)',
      notNull: true,
      default: 100.0,
    },
    pass_marks: {
      type: 'numeric(5,2)',
      default: 50.0,
    },
    assigned_date: {
      type: 'date',
      notNull: true,
      default: pgm.func('CURRENT_DATE'),
    },
    due_date: {
      type: 'timestamp with time zone',
      notNull: true,
    },
    allow_late_submissions: {
      type: 'boolean',
      notNull: true,
      default: true,
    },
    submission_type: {
      type: 'varchar(50)',
      notNull: true,
      default: 'ONLINE_TEXT_AND_FILE',
    },
    status: {
      type: 'varchar(30)',
      notNull: true,
      default: 'PUBLISHED',
      check: "status IN ('DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED')",
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

  pgm.createIndex('assignments', ['school_id']);
  pgm.createIndex('assignments', ['academic_year_id']);
  pgm.createIndex('assignments', ['grade_id']);
  pgm.createIndex('assignments', ['section_id']);
  pgm.createIndex('assignments', ['subject_id']);
  pgm.createIndex('assignments', ['teacher_id']);
  pgm.createIndex('assignments', ['status']);
  pgm.createIndex('assignments', ['due_date']);

  // 2. Assignment Submissions table
  pgm.createTable('assignment_submissions', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    school_id: {
      type: 'uuid',
      references: 'schools(id)',
      onDelete: 'restrict',
    },
    assignment_id: {
      type: 'uuid',
      notNull: true,
      references: 'assignments(id)',
      onDelete: 'cascade',
    },
    student_id: {
      type: 'uuid',
      notNull: true,
      references: 'students(id)',
      onDelete: 'cascade',
    },
    submission_text: {
      type: 'text',
    },
    attachment_urls: {
      type: 'jsonb',
      default: '[]',
    },
    submitted_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    status: {
      type: 'varchar(30)',
      notNull: true,
      default: 'SUBMITTED',
      check: "status IN ('DRAFT', 'SUBMITTED', 'LATE', 'GRADED', 'RESUBMIT_REQUESTED')",
    },
    obtained_marks: {
      type: 'numeric(5,2)',
    },
    feedback: {
      type: 'text',
    },
    graded_by: {
      type: 'uuid',
      references: 'teachers(id)',
      onDelete: 'set null',
    },
    graded_at: {
      type: 'timestamp with time zone',
    },
    resubmission_count: {
      type: 'integer',
      notNull: true,
      default: 0,
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

  pgm.createIndex('assignment_submissions', ['school_id']);
  pgm.createIndex('assignment_submissions', ['assignment_id']);
  pgm.createIndex('assignment_submissions', ['student_id']);
  pgm.createIndex('assignment_submissions', ['status']);
  
  // Unique constraint per assignment and student
  pgm.addConstraint('assignment_submissions', 'assignment_submissions_unique_student_assignment', {
    unique: ['assignment_id', 'student_id'],
  });
};

exports.down = async (pgm) => {
  pgm.dropTable('assignment_submissions');
  pgm.dropTable('assignments');
};
