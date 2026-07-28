/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;


/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {

  pgm.createTable('subject_groups', {

    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },

    group_name: {
      type: 'varchar(100)',
      notNull: true,
    },

    description: {
      type: 'text',
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


  pgm.createTable('subject_group_members', {

    subject_group_id: {
      type: 'uuid',
      notNull: true,
      references: 'subject_groups(id)',
      onDelete: 'cascade',
    },

    subject_id: {
      type: 'uuid',
      notNull: true,
      references: 'subjects(id)',
      onDelete: 'cascade',
    },

  });


  pgm.addConstraint(
    'subject_group_members',
    'subject_group_members_pk',
    {
      primaryKey: [
        'subject_group_id',
        'subject_id',
      ],
    }
  );


  pgm.createIndex(
    'subject_groups',
    'group_name',
    {
      name: 'subject_groups_name_active_idx',
      where: 'deleted_at IS NULL',
    }
  );


  pgm.createIndex(
    'subject_groups',
    'status'
  );


  pgm.createIndex(
    'subject_group_members',
    'subject_id'
  );

};


/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const down = (pgm) => {

  pgm.dropTable('subject_group_members');

  pgm.dropTable('subject_groups');

};