/**
 * Migration: Create Messaging and Communication Hub Tables
 *
 * Implements the relational persistence layer for the SMART SMS Direct Messaging Suite:
 * - conversations: Thread containers (Direct Parent-Teacher, Staff, Administrative inquiries)
 * - conversation_participants: Participant state, unread badge counters, mute/archive flags
 * - messages: Chronological message stream with markdown content & soft delete safeguarding
 * - message_attachments: Shared files (PDF notes, medical excuse slips, homework images)
 *
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
const shorthands = undefined;

const up = async (pgm) => {
  // 1. Create conversations table
  pgm.createTable('conversations', {
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
    type: {
      type: 'varchar(30)',
      notNull: true,
      default: 'DIRECT', // 'DIRECT', 'ACADEMIC_INQUIRY', 'OFFICE_SUPPORT', 'GROUP_SECTION'
    },
    title: {
      type: 'varchar(255)',
    },
    student_id: {
      type: 'uuid',
      references: 'students(id)',
      onDelete: 'SET NULL',
    },
    subject_id: {
      type: 'uuid',
      references: 'subjects(id)',
      onDelete: 'SET NULL',
    },
    created_by: {
      type: 'uuid',
      notNull: true,
      references: 'users(id)',
      onDelete: 'CASCADE',
    },
    last_message_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
    last_message_preview: {
      type: 'text',
    },
    status: {
      type: 'varchar(20)',
      notNull: true,
      default: 'ACTIVE', // 'ACTIVE', 'RESOLVED', 'ARCHIVED'
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

  // 2. Create conversation_participants table
  pgm.createTable('conversation_participants', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    conversation_id: {
      type: 'uuid',
      notNull: true,
      references: 'conversations(id)',
      onDelete: 'CASCADE',
    },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users(id)',
      onDelete: 'CASCADE',
    },
    role_in_conversation: {
      type: 'varchar(30)',
      notNull: true,
      default: 'PARTICIPANT', // 'INITIATOR', 'PARTICIPANT', 'MODERATOR'
    },
    last_read_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
    unread_count: {
      type: 'integer',
      notNull: true,
      default: 0,
    },
    is_muted: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
    is_archived: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
    is_starred: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
    joined_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });

  pgm.addConstraint('conversation_participants', 'uq_conv_participants_conv_user', {
    unique: ['conversation_id', 'user_id'],
  });

  // 3. Create messages table
  pgm.createTable('messages', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    conversation_id: {
      type: 'uuid',
      notNull: true,
      references: 'conversations(id)',
      onDelete: 'CASCADE',
    },
    sender_id: {
      type: 'uuid',
      notNull: true,
      references: 'users(id)',
      onDelete: 'CASCADE',
    },
    message_type: {
      type: 'varchar(30)',
      notNull: true,
      default: 'TEXT', // 'TEXT', 'ATTACHMENT', 'SYSTEM_EVENT'
    },
    content: {
      type: 'text',
      notNull: true,
    },
    reply_to_message_id: {
      type: 'uuid',
      references: 'messages(id)',
      onDelete: 'SET NULL',
    },
    is_edited: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
    edited_at: {
      type: 'timestamp with time zone',
    },
    created_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
    deleted_at: {
      type: 'timestamp with time zone',
    },
  });

  // 4. Create message_attachments table
  pgm.createTable('message_attachments', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    message_id: {
      type: 'uuid',
      notNull: true,
      references: 'messages(id)',
      onDelete: 'CASCADE',
    },
    file_name: {
      type: 'varchar(255)',
      notNull: true,
    },
    file_url: {
      type: 'text',
      notNull: true,
    },
    file_type: {
      type: 'varchar(100)',
      notNull: true,
    },
    file_size: {
      type: 'integer',
      notNull: true,
    },
    created_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });

  // 5. Create performance indexes
  pgm.createIndex('conversations', ['school_id', 'last_message_at'], {
    name: 'idx_conversations_inbox',
    where: 'deleted_at IS NULL',
  });

  pgm.createIndex('conversations', ['student_id'], {
    name: 'idx_conversations_student',
    where: 'student_id IS NOT NULL',
  });

  pgm.createIndex('conversation_participants', ['user_id', 'is_archived', 'unread_count'], {
    name: 'idx_participants_user_inbox',
  });

  pgm.createIndex('conversation_participants', ['conversation_id'], {
    name: 'idx_participants_conv',
  });

  pgm.createIndex('messages', ['conversation_id', 'created_at'], {
    name: 'idx_messages_conversation_time',
    where: 'deleted_at IS NULL',
  });

  pgm.createIndex('messages', ['sender_id'], {
    name: 'idx_messages_sender',
  });

  pgm.createIndex('message_attachments', ['message_id'], {
    name: 'idx_attachments_message',
  });
};

const down = async (pgm) => {
  pgm.dropTable('message_attachments');
  pgm.dropTable('messages');
  pgm.dropTable('conversation_participants');
  pgm.dropTable('conversations');
};

module.exports = {
  shorthands,
  up,
  down,
};
