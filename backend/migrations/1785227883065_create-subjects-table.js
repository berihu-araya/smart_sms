/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;


/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {

  pgm.createTable('subjects', {

    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },


    subject_code: {
      type: 'varchar(20)',
      notNull: true,
    },


    subject_name: {
      type: 'varchar(150)',
      notNull: true,
    },


    short_name: {
      type: 'varchar(30)',
    },


    description: {
      type: 'text',
    },


    credit_hours: {
      type: 'numeric(4,2)',
    },


    pass_mark: {
      type: 'numeric(5,2)',
    },


    max_mark: {
      type: 'numeric(5,2)',
    },


    is_elective: {
      type: 'boolean',
      notNull: true,
      default: false,
    },


    is_lab: {
      type: 'boolean',
      notNull: true,
      default: false,
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



  // Unique subject code
  pgm.addConstraint(
    'subjects',
    'subjects_subject_code_unique',
    {
      unique: ['subject_code'],
    }
  );


  // Unique subject name
  pgm.addConstraint(
    'subjects',
    'subjects_subject_name_unique',
    {
      unique: ['subject_name'],
    }
  );


  // Status validation
  pgm.addConstraint(
    'subjects',
    'subjects_status_check',
    {
      check: `
        status IN (
          'ACTIVE',
          'INACTIVE',
          'ARCHIVED'
        )
      `,
    }
  );


  // Marks validation
  pgm.addConstraint(
    'subjects',
    'subjects_marks_check',
    {
      check: `
        pass_mark IS NULL
        OR max_mark IS NULL
        OR pass_mark <= max_mark
      `,
    }
  );


  // Indexes

  pgm.createIndex(
    'subjects',
    'subject_name',
    {
      name: 'subjects_name_active_idx',
      where: 'deleted_at IS NULL',
    }
  );


  pgm.createIndex(
    'subjects',
    'subject_code',
    {
      name: 'subjects_code_active_idx',
      where: 'deleted_at IS NULL',
    }
  );


  pgm.createIndex(
    'subjects',
    'status',
    {
      name: 'subjects_status_active_idx',
      where: 'deleted_at IS NULL',
    }
  );

};



/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {

  pgm.dropTable('subjects');

};