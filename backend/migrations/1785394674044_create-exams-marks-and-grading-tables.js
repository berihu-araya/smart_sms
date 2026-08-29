/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

exports.up = (pgm) => {
  // 1. Grading scales table
  pgm.createTable('grading_scales', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    grade_letter: {
      type: 'varchar(10)',
      notNull: true,
    },
    min_score: {
      type: 'numeric(5,2)',
      notNull: true,
    },
    max_score: {
      type: 'numeric(5,2)',
      notNull: true,
    },
    grade_point: {
      type: 'numeric(4,2)',
      notNull: true,
      default: 0.0,
    },
    description: {
      type: 'varchar(100)',
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

  // Seed standard grading scale
  pgm.sql(`
    INSERT INTO grading_scales (grade_letter, min_score, max_score, grade_point, description) VALUES
    ('A+', 90.00, 100.00, 4.00, 'Excellent / Superior'),
    ('A',  85.00, 89.99,  4.00, 'Very Good / Outstanding'),
    ('A-', 80.00, 84.99,  3.75, 'Good / High Distinction'),
    ('B+', 75.00, 79.99,  3.50, 'Above Average'),
    ('B',  70.00, 74.99,  3.00, 'Average / Satisfactory'),
    ('C+', 65.00, 69.99,  2.50, 'Competent'),
    ('C',  50.00, 64.99,  2.00, 'Pass'),
    ('D',  40.00, 49.99,  1.00, 'Conditional Pass / Low'),
    ('F',  0.00,  39.99,  0.00, 'Fail / Unsatisfactory')
    ON CONFLICT DO NOTHING;
  `);

  // 2. Exams table
  pgm.createTable('exams', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    academic_year_id: {
      type: 'uuid',
      references: 'academic_years(id)',
      onDelete: 'set null',
    },
    grade_id: {
      type: 'uuid',
      references: 'grades(id)',
      onDelete: 'set null',
    },
    subject_id: {
      type: 'uuid',
      references: 'subjects(id)',
      onDelete: 'set null',
    },
    title: {
      type: 'varchar(150)',
      notNull: true,
    },
    term_or_semester: {
      type: 'varchar(50)',
      default: 'Semester 1',
    },
    exam_type: {
      type: 'varchar(50)',
      notNull: true,
      default: 'FINAL',
      check: "exam_type IN ('MIDTERM', 'FINAL', 'QUIZ', 'ASSIGNMENT', 'PROJECT', 'TEST')",
    },
    weight_percentage: {
      type: 'numeric(5,2)',
      notNull: true,
      default: 100.0,
    },
    max_marks: {
      type: 'numeric(5,2)',
      notNull: true,
      default: 100.0,
    },
    exam_date: {
      type: 'date',
    },
    is_published: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
    description: {
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

  pgm.createIndex('exams', ['academic_year_id']);
  pgm.createIndex('exams', ['grade_id']);
  pgm.createIndex('exams', ['subject_id']);
  pgm.createIndex('exams', ['is_published']);

  // 3. Marks table
  pgm.createTable('marks', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    exam_id: {
      type: 'uuid',
      notNull: true,
      references: 'exams(id)',
      onDelete: 'cascade',
    },
    student_id: {
      type: 'uuid',
      notNull: true,
      references: 'students(id)',
      onDelete: 'cascade',
    },
    subject_id: {
      type: 'uuid',
      notNull: true,
      references: 'subjects(id)',
      onDelete: 'cascade',
    },
    section_id: {
      type: 'uuid',
      references: 'sections(id)',
      onDelete: 'set null',
    },
    teacher_id: {
      type: 'uuid',
      references: 'teachers(id)',
      onDelete: 'set null',
    },
    score: {
      type: 'numeric(5,2)',
      notNull: true,
      default: 0.0,
    },
    is_absent: {
      type: 'boolean',
      notNull: true,
      default: false,
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

  pgm.addConstraint('marks', 'marks_exam_student_subject_unique', {
    unique: ['exam_id', 'student_id', 'subject_id'],
  });

  pgm.createIndex('marks', ['exam_id']);
  pgm.createIndex('marks', ['student_id']);
  pgm.createIndex('marks', ['subject_id']);
  pgm.createIndex('marks', ['section_id']);
};

exports.down = (pgm) => {
  pgm.dropTable('marks');
  pgm.dropTable('exams');
  pgm.dropTable('grading_scales');
};
