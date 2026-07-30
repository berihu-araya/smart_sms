/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

export const up = (pgm) => {
  pgm.createTable('teacher_subjects', {
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

    subject_id: {
      type: 'uuid',
      notNull: true,
      references: 'subjects(id)',
      onDelete: 'cascade',
    },

    grade_id: {
      type: 'uuid',
      notNull: true,
      references: 'grades(id)',
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
      notNull: true,
      references: 'academic_years(id)',
      onDelete: 'cascade',
    },

    start_date: {
      type: 'date',
    },

    end_date: {
      type: 'date',
    },

    status: {
      type: 'varchar(20)',
      notNull: true,
      default: 'ACTIVE',
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
    'teacher_subjects',
    'teacher_subject_unique_assignment',
    {
      unique: [
        'teacher_id',
        'subject_id',
        'grade_id',
        'section_id',
        'academic_year_id',
      ],
    }
  );

  pgm.addConstraint(
    'teacher_subjects',
    'teacher_subject_dates_check',
    {
      check:
        'end_date IS NULL OR start_date IS NULL OR end_date >= start_date',
    }
  );

  pgm.createIndex('teacher_subjects', ['teacher_id']);
  pgm.createIndex('teacher_subjects', ['subject_id']);
  pgm.createIndex('teacher_subjects', ['grade_id']);
  pgm.createIndex('teacher_subjects', ['section_id']);
  pgm.createIndex('teacher_subjects', ['academic_year_id']);

  pgm.createIndex('teacher_subjects', ['status'], {
    where: 'deleted_at IS NULL',
    name: 'teacher_subjects_status_active_idx',
  });
};

export const down = (pgm) => {
  pgm.dropTable('teacher_subjects');
};