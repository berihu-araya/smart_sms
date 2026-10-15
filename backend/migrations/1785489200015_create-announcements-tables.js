/**
 * Migration: Create Announcements and Announcement Acknowledgements Tables
 *
 * Provides the data layer for the School Communication Hub - Announcements Module:
 * - announcements: institutional circulars, bulletins, urgent alerts, role/grade targeting
 * - announcement_acknowledgements: audit trail of user read/acknowledgement confirmations
 *
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
const shorthands = undefined;

const up = async (pgm) => {
  // 1. Create announcements table
  pgm.createTable('announcements', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    school_id: {
      type: 'uuid',
      notNull: true,
      references: 'schools(id)',
      onDelete: 'CASCADE',
    },
    title: {
      type: 'varchar(255)',
      notNull: true,
    },
    content: {
      type: 'text',
      notNull: true,
    },
    category: {
      type: 'varchar(50)',
      notNull: true,
      default: 'GENERAL',
    },
    priority: {
      type: 'varchar(30)',
      notNull: true,
      default: 'NORMAL', // 'NORMAL', 'IMPORTANT', 'URGENT'
    },
    audience: {
      type: 'varchar(50)',
      notNull: true,
      default: 'ALL', // 'ALL', 'TEACHERS', 'PARENTS', 'STUDENTS', 'STAFF'
    },
    grade_id: {
      type: 'uuid',
      references: 'grades(id)',
      onDelete: 'SET NULL',
    },
    section_id: {
      type: 'uuid',
      references: 'sections(id)',
      onDelete: 'SET NULL',
    },
    attachment_url: {
      type: 'text',
    },
    attachment_name: {
      type: 'varchar(255)',
    },
    is_pinned: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
    requires_acknowledgement: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
    status: {
      type: 'varchar(20)',
      notNull: true,
      default: 'PUBLISHED', // 'DRAFT', 'PUBLISHED', 'ARCHIVED'
    },
    published_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
    expires_at: {
      type: 'timestamp with time zone',
    },
    created_by: {
      type: 'uuid',
      references: 'users(id)',
      onDelete: 'SET NULL',
    },
    created_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
    updated_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
    deleted_at: {
      type: 'timestamp with time zone',
    },
  });

  // 2. Create announcement_acknowledgements table
  pgm.createTable('announcement_acknowledgements', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    announcement_id: {
      type: 'uuid',
      notNull: true,
      references: 'announcements(id)',
      onDelete: 'CASCADE',
    },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users(id)',
      onDelete: 'CASCADE',
    },
    acknowledged_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });

  // Add unique constraint to ensure a user acknowledges an announcement only once
  pgm.addConstraint('announcement_acknowledgements', 'uq_announcement_user_ack', {
    unique: ['announcement_id', 'user_id'],
  });

  // 3. Create high-performance indexes
  pgm.createIndex('announcements', ['school_id', 'audience', 'status', 'published_at'], {
    name: 'idx_announcements_visibility',
    where: 'deleted_at IS NULL',
  });

  pgm.createIndex('announcements', ['school_id', 'is_pinned'], {
    name: 'idx_announcements_pinned',
    where: 'deleted_at IS NULL',
  });

  pgm.createIndex('announcements', ['grade_id', 'section_id'], {
    name: 'idx_announcements_grade_section',
    where: 'deleted_at IS NULL',
  });

  pgm.createIndex('announcements', ['created_by'], {
    name: 'idx_announcements_created_by',
  });

  pgm.createIndex('announcement_acknowledgements', ['announcement_id'], {
    name: 'idx_acks_announcement_id',
  });

  pgm.createIndex('announcement_acknowledgements', ['user_id'], {
    name: 'idx_acks_user_id',
  });
};

const down = async (pgm) => {
  pgm.dropTable('announcement_acknowledgements');
  pgm.dropTable('announcements');
};

module.exports = {
  shorthands,
  up,
  down,
};
