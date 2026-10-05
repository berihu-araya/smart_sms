const up = (pgm) => {
  pgm.createTable('account_registrations', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    school_id: { type: 'uuid', references: 'schools(id)', onDelete: 'cascade' },
    first_name: { type: 'varchar(100)', notNull: true },
    last_name: { type: 'varchar(100)', notNull: true },
    email: { type: 'varchar(255)', notNull: true },
    phone: { type: 'varchar(30)' },
    role_name: { type: 'varchar(100)', notNull: true },
    status: { type: 'varchar(30)', notNull: true, default: 'PRE_REGISTERED' },
    user_id: { type: 'uuid', references: 'users(id)', onDelete: 'set null' },
    registered_by: { type: 'uuid', references: 'users(id)', onDelete: 'set null' },
    created_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
    deleted_at: { type: 'timestamp with time zone' },
  });

  pgm.createIndex('account_registrations', ['school_id', 'email', 'role_name'], {
    name: 'account_registrations_lookup_idx',
    where: "deleted_at IS NULL AND status = 'PRE_REGISTERED'",
  });
};

const down = (pgm) => {
  pgm.dropTable('account_registrations');
};

module.exports = { up, down };