/**
 * Migration: Enhance Notifications System
 *
 * Adds rich metadata to `notifications` (type, priority, action links, channels, metadata)
 * and creates `user_notifications` to track per-user read/unread and archive states.
 *
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
const shorthands = undefined;

const up = async (pgm) => {
  // 1. Add rich metadata columns to notifications table
  pgm.addColumns('notifications', {
    type: {
      type: 'varchar(50)',
      notNull: true,
      default: 'GENERAL', // 'GENERAL', 'ACADEMIC', 'ATTENDANCE', 'EXAM', 'FINANCE', 'TRANSPORT', 'SYSTEM'
    },
    priority: {
      type: 'varchar(20)',
      notNull: true,
      default: 'NORMAL', // 'LOW', 'NORMAL', 'HIGH', 'URGENT'
    },
    action_url: {
      type: 'varchar(255)',
    },
    action_label: {
      type: 'varchar(100)',
    },
    channel: {
      type: 'varchar(30)',
      notNull: true,
      default: 'IN_APP', // 'IN_APP', 'SMS', 'IN_APP_AND_SMS'
    },
    metadata: {
      type: 'jsonb',
      notNull: true,
      default: '{}',
    },
    recipient_user_id: {
      type: 'uuid',
      references: 'users(id)',
      onDelete: 'CASCADE',
    },
  });

  // Index for filtering notifications by school, type, and publish date
  pgm.createIndex('notifications', ['school_id', 'type', 'published_at'], {
    name: 'idx_notifications_school_type_published',
    where: 'deleted_at IS NULL',
  });

  // 2. Create user_notifications table for tracking per-user read and delivery state
  pgm.createTable('user_notifications', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    notification_id: {
      type: 'uuid',
      notNull: true,
      references: 'notifications(id)',
      onDelete: 'CASCADE',
    },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users(id)',
      onDelete: 'CASCADE',
    },
    is_read: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
    read_at: {
      type: 'timestamp with time zone',
    },
    is_archived: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
    archived_at: {
      type: 'timestamp with time zone',
    },
    created_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });

  // Unique constraint: A user has exactly one state record per notification
  pgm.addConstraint('user_notifications', 'uq_user_notifications_notif_user', {
    unique: ['notification_id', 'user_id'],
  });

  // High-performance index for the top header unread counter
  pgm.createIndex('user_notifications', ['user_id', 'is_read'], {
    name: 'idx_user_notif_unread',
    where: 'is_archived = false',
  });

  // High-performance index for the user's notification feed sorted by created_at
  pgm.createIndex('user_notifications', ['user_id', 'created_at'], {
    name: 'idx_user_notif_feed',
    where: 'is_archived = false',
  });

  // Index on foreign key notification_id
  pgm.createIndex('user_notifications', ['notification_id'], {
    name: 'idx_user_notif_notification_id',
  });
};

const down = async (pgm) => {
  pgm.dropTable('user_notifications');

  pgm.dropIndex('notifications', ['school_id', 'type', 'published_at'], {
    name: 'idx_notifications_school_type_published',
    ifExists: true,
  });

  pgm.dropColumns('notifications', [
    'type',
    'priority',
    'action_url',
    'action_label',
    'channel',
    'metadata',
    'recipient_user_id',
  ], { ifExists: true });
};

module.exports = {
  shorthands,
  up,
  down,
};
