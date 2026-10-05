const up = (pgm) => {
  pgm.createTable('notifications', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    school_id: { type: 'uuid', references: 'schools(id)', onDelete: 'cascade' },
    grade_id: { type: 'uuid', references: 'grades(id)', onDelete: 'cascade' },
    section_id: { type: 'uuid', references: 'sections(id)', onDelete: 'cascade' },
    audience: { type: 'varchar(30)', notNull: true, default: 'ALL' },
    title: { type: 'varchar(180)', notNull: true },
    body: { type: 'text', notNull: true },
    published_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
    created_by: { type: 'uuid', references: 'users(id)', onDelete: 'set null' },
    created_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
    deleted_at: { type: 'timestamp with time zone' },
  });

  pgm.createIndex('notifications', ['school_id', 'audience', 'published_at'], {
    name: 'notifications_visibility_idx',
    where: 'deleted_at IS NULL',
  });
};

const down = (pgm) => pgm.dropTable('notifications');

module.exports = { up, down };