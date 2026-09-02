/**
 * Migration: Create rooms table and update sections, subjects, and teachers tables.
 * 
 * - Adds a dedicated rooms management table for capacity and room type tracking.
 * - Links sections to rooms via room_id.
 * - Adds required_room_type to subjects (NORMAL, LAB, COMPUTER_LAB, etc.).
 * - Adds max_weekly_periods to teachers for workload tracking.
 * 
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
const shorthands = undefined;

const up = (pgm) => {
  // 1. Create rooms table
  pgm.createTable('rooms', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    name: {
      type: 'varchar(100)',
      notNull: true,
    },
    building: {
      type: 'varchar(100)',
    },
    floor: {
      type: 'varchar(50)',
    },
    capacity: {
      type: 'integer',
      default: 40,
    },
    room_type: {
      type: 'varchar(50)',
      notNull: true,
      default: 'NORMAL',
    },
    is_active: {
      type: 'boolean',
      notNull: true,
      default: true,
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

  // Unique active room name constraint
  pgm.addConstraint('rooms', 'rooms_name_active_unique', {
    unique: ['name'],
    where: 'deleted_at IS NULL',
  });

  // Room type and capacity check constraints
  pgm.addConstraint('rooms', 'rooms_type_check', {
    check: "room_type IN ('NORMAL', 'LAB', 'COMPUTER_LAB', 'LIBRARY', 'GYM', 'AUDITORIUM', 'OTHER')",
  });

  pgm.addConstraint('rooms', 'rooms_capacity_check', {
    check: 'capacity IS NULL OR capacity > 0',
  });

  // Indexes for room lookups
  pgm.createIndex('rooms', 'name', {
    name: 'rooms_name_active_idx',
    where: 'deleted_at IS NULL',
  });
  pgm.createIndex('rooms', 'room_type');
  pgm.createIndex('rooms', 'is_active');

  // 2. Add room_id foreign key to sections table
  pgm.addColumns('sections', {
    room_id: {
      type: 'uuid',
      references: 'rooms(id)',
      onDelete: 'set null',
    },
  });
  pgm.createIndex('sections', 'room_id');

  // 3. Add required_room_type to subjects table
  pgm.addColumns('subjects', {
    required_room_type: {
      type: 'varchar(50)',
      notNull: true,
      default: 'NORMAL',
    },
  });
  pgm.addConstraint('subjects', 'subjects_required_room_type_check', {
    check: "required_room_type IN ('NORMAL', 'LAB', 'COMPUTER_LAB', 'LIBRARY', 'GYM', 'AUDITORIUM', 'OTHER')",
  });

  // 4. Add max_weekly_periods to teachers table
  pgm.addColumns('teachers', {
    max_weekly_periods: {
      type: 'integer',
      notNull: true,
      default: 30,
    },
  });
  pgm.addConstraint('teachers', 'teachers_max_weekly_periods_check', {
    check: 'max_weekly_periods > 0',
  });
};

const down = (pgm) => {
  pgm.dropColumns('teachers', ['max_weekly_periods']);
  pgm.dropColumns('subjects', ['required_room_type']);
  pgm.dropColumns('sections', ['room_id']);
  pgm.dropTable('rooms');
};

module.exports = {
  shorthands,
  up,
  down,
};
