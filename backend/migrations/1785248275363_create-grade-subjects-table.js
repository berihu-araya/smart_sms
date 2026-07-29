/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;


/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {


  pgm.createTable('grade_subjects', {

    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },


    grade_id: {
      type: 'uuid',
      notNull: true,
      references: 'grades(id)',
      onDelete: 'cascade',
    },


    subject_id: {
      type: 'uuid',
      notNull: true,
      references: 'subjects(id)',
      onDelete: 'cascade',
    },


    academic_year_id: {
      type: 'uuid',
      notNull: true,
      references: 'academic_years(id)',
      onDelete: 'cascade',
    },


    is_compulsory: {
      type: 'boolean',
      notNull: true,
      default: true,
    },


    weekly_periods: {
      type: 'integer',
    },


    total_marks: {
      type: 'numeric(5,2)',
    },


    pass_marks: {
      type: 'numeric(5,2)',
    },


    display_order: {
      type: 'integer',
      notNull: true,
      default: 0,
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
    'grade_subjects',
    'unique_grade_subject_year',
    {
      unique: [
        'academic_year_id',
        'grade_id',
        'subject_id',
      ],
    }
  );



  pgm.createIndex(
    'grade_subjects',
    [
      'grade_id'
    ]
  );


  pgm.createIndex(
    'grade_subjects',
    [
      'subject_id'
    ]
  );


  pgm.createIndex(
    'grade_subjects',
    [
      'academic_year_id'
    ]
  );


  pgm.createIndex(
    'grade_subjects',
    [
      'status'
    ]
  );


};



/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const down = (pgm) => {


  pgm.dropTable(
    'grade_subjects'
  );


};