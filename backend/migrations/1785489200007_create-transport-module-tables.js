/**
 * Migration: Create Comprehensive Transport Module Tables
 *
 * Creates:
 * 1. Seed 'Driver' role in roles table if not exists
 * 2. transport_settings (configurable transport policies per school/tenant)
 * 3. transport_vehicles (fleet management and seating capacity)
 * 4. transport_drivers (linked to existing users / staff members)
 * 5. transport_routes (route master details)
 * 6. transport_stops (ordered stops per route)
 * 7. transport_student_allocations (student route & stop assignment)
 * 8. transport_trips (daily dispatch and schedule)
 * 9. transport_attendance (student boarding & drop-off logging)
 *
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
const shorthands = undefined;// this is required for the migration to run

const up = async (pgm) => {
  // 1. Seed 'Driver' role if not exists
  await pgm.sql(`
    INSERT INTO roles (id, name, description, created_at, updated_at)
    SELECT gen_random_uuid(), 'Driver', 'School transport driver responsible for vehicle trips, route stops, and student passenger attendance', current_timestamp, current_timestamp
    WHERE NOT EXISTS (SELECT 1 FROM roles WHERE LOWER(name) = 'driver');
  `);

  // 2. transport_settings table
  pgm.createTable('transport_settings', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    school_id: {
      type: 'uuid',
      references: 'schools(id)',
      onDelete: 'cascade',
    },
    enforce_strict_capacity: {
      type: 'boolean',
      notNull: true,
      default: true,
    },
    notify_parents_on_boarding: {
      type: 'boolean',
      notNull: true,
      default: true,
    },
    default_morning_departure: {
      type: 'varchar(10)',
      default: '07:00',
    },
    default_afternoon_departure: {
      type: 'varchar(10)',
      default: '15:30',
    },
    fare_currency: {
      type: 'varchar(10)',
      default: 'USD',
    },
    allow_qr_attendance: {
      type: 'boolean',
      notNull: true,
      default: false,
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
  });

  pgm.createIndex('transport_settings', 'school_id', {
    name: 'transport_settings_school_idx',
    unique: true,
  });

  // 3. transport_vehicles table
  pgm.createTable('transport_vehicles', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    school_id: {
      type: 'uuid',
      references: 'schools(id)',
      onDelete: 'cascade',
    },
    vehicle_number: {
      type: 'varchar(50)',
      notNull: true,
    },
    vehicle_model: {
      type: 'varchar(100)',
      notNull: true,
    },
    seating_capacity: {
      type: 'integer',
      notNull: true,
      default: 30,
    },
    registration_number: {
      type: 'varchar(100)',
    },
    chassis_number: {
      type: 'varchar(100)',
    },
    manufacturing_year: {
      type: 'integer',
    },
    fuel_type: {
      type: 'varchar(30)',
      default: 'Diesel',
    },
    insurance_policy_number: {
      type: 'varchar(100)',
    },
    insurance_expiry_date: {
      type: 'date',
    },
    fitness_certificate_expiry: {
      type: 'date',
    },
    ownership_type: {
      type: 'varchar(30)',
      default: 'OWNED',
    },
    status: {
      type: 'varchar(30)',
      notNull: true,
      default: 'ACTIVE', // ACTIVE, MAINTENANCE, OUT_OF_SERVICE, RETIRED
    },
    notes: {
      type: 'text',
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

  pgm.createIndex('transport_vehicles', ['school_id', 'vehicle_number'], {
    name: 'transport_vehicles_school_number_idx',
    where: 'deleted_at IS NULL',
  });
  pgm.createIndex('transport_vehicles', 'status');

  // 4. transport_drivers table (reusing existing users)
  pgm.createTable('transport_drivers', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    school_id: {
      type: 'uuid',
      references: 'schools(id)',
      onDelete: 'cascade',
    },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users(id)',
      onDelete: 'restrict',
    },
    license_number: {
      type: 'varchar(100)',
      notNull: true,
    },
    license_type: {
      type: 'varchar(50)', // Heavy Vehicle, Commercial, Standard
      default: 'Commercial',
    },
    license_expiry_date: {
      type: 'date',
    },
    emergency_contact: {
      type: 'varchar(50)',
    },
    medical_fitness_expiry: {
      type: 'date',
    },
    status: {
      type: 'varchar(30)',
      notNull: true,
      default: 'ACTIVE', // ACTIVE, INACTIVE, ON_DUTY, SUSPENDED
    },
    notes: {
      type: 'text',
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

  pgm.createIndex('transport_drivers', ['school_id', 'user_id'], {
    name: 'transport_drivers_school_user_idx',
    where: 'deleted_at IS NULL',
  });
  pgm.createIndex('transport_drivers', 'license_number');

  // 5. transport_routes table
  pgm.createTable('transport_routes', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    school_id: {
      type: 'uuid',
      references: 'schools(id)',
      onDelete: 'cascade',
    },
    route_name: {
      type: 'varchar(150)',
      notNull: true,
    },
    route_code: {
      type: 'varchar(50)',
      notNull: true,
    },
    start_location: {
      type: 'varchar(255)',
      notNull: true,
    },
    end_location: {
      type: 'varchar(255)',
      notNull: true,
    },
    default_vehicle_id: {
      type: 'uuid',
      references: 'transport_vehicles(id)',
      onDelete: 'set null',
    },
    default_driver_id: {
      type: 'uuid',
      references: 'transport_drivers(id)',
      onDelete: 'set null',
    },
    distance_km: {
      type: 'numeric(8, 2)',
      default: 0,
    },
    estimated_duration_minutes: {
      type: 'integer',
      default: 45,
    },
    fare_amount: {
      type: 'numeric(10, 2)',
      default: 0,
    },
    status: {
      type: 'varchar(30)',
      notNull: true,
      default: 'ACTIVE', // ACTIVE, INACTIVE
    },
    description: {
      type: 'text',
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

  pgm.createIndex('transport_routes', ['school_id', 'route_code'], {
    name: 'transport_routes_school_code_idx',
    where: 'deleted_at IS NULL',
  });
  pgm.createIndex('transport_routes', 'default_vehicle_id');
  pgm.createIndex('transport_routes', 'default_driver_id');

  // 6. transport_stops table (ordered route stops)
  pgm.createTable('transport_stops', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    school_id: {
      type: 'uuid',
      references: 'schools(id)',
      onDelete: 'cascade',
    },
    route_id: {
      type: 'uuid',
      notNull: true,
      references: 'transport_routes(id)',
      onDelete: 'cascade',
    },
    stop_name: {
      type: 'varchar(150)',
      notNull: true,
    },
    stop_order: {
      type: 'integer',
      notNull: true,
      default: 1,
    },
    pickup_time: {
      type: 'varchar(10)', // e.g. '07:15'
    },
    dropoff_time: {
      type: 'varchar(10)', // e.g. '15:45'
    },
    landmark: {
      type: 'varchar(255)',
    },
    latitude: {
      type: 'numeric(10, 7)',
    },
    longitude: {
      type: 'numeric(10, 7)',
    },
    fare_amount: {
      type: 'numeric(10, 2)',
      default: 0,
    },
    status: {
      type: 'varchar(30)',
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

  pgm.createIndex('transport_stops', ['route_id', 'stop_order'], {
    name: 'transport_stops_route_order_idx',
    where: 'deleted_at IS NULL',
  });

  // 7. transport_student_allocations table
  pgm.createTable('transport_student_allocations', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    school_id: {
      type: 'uuid',
      references: 'schools(id)',
      onDelete: 'cascade',
    },
    student_id: {
      type: 'uuid',
      notNull: true,
      references: 'students(id)',
      onDelete: 'cascade',
    },
    route_id: {
      type: 'uuid',
      notNull: true,
      references: 'transport_routes(id)',
      onDelete: 'cascade',
    },
    pickup_stop_id: {
      type: 'uuid',
      references: 'transport_stops(id)',
      onDelete: 'set null',
    },
    dropoff_stop_id: {
      type: 'uuid',
      references: 'transport_stops(id)',
      onDelete: 'set null',
    },
    assigned_vehicle_id: {
      type: 'uuid',
      references: 'transport_vehicles(id)',
      onDelete: 'set null',
    },
    trip_type: {
      type: 'varchar(30)',
      notNull: true,
      default: 'BOTH', // BOTH, PICKUP_ONLY, DROPOFF_ONLY
    },
    seat_number: {
      type: 'varchar(20)',
    },
    start_date: {
      type: 'date',
      notNull: true,
      default: pgm.func('current_date'),
    },
    end_date: {
      type: 'date',
    },
    status: {
      type: 'varchar(30)',
      notNull: true,
      default: 'ACTIVE', // ACTIVE, INACTIVE, SUSPENDED, CANCELLED
    },
    notes: {
      type: 'text',
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

  pgm.createIndex('transport_student_allocations', ['school_id', 'student_id'], {
    name: 'transport_allocations_school_student_idx',
    where: 'deleted_at IS NULL',
  });
  pgm.createIndex('transport_student_allocations', ['route_id', 'status']);
  pgm.createIndex('transport_student_allocations', ['assigned_vehicle_id', 'status']);

  // 8. transport_trips table (daily trips)
  pgm.createTable('transport_trips', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    school_id: {
      type: 'uuid',
      references: 'schools(id)',
      onDelete: 'cascade',
    },
    route_id: {
      type: 'uuid',
      notNull: true,
      references: 'transport_routes(id)',
      onDelete: 'cascade',
    },
    vehicle_id: {
      type: 'uuid',
      notNull: true,
      references: 'transport_vehicles(id)',
      onDelete: 'restrict',
    },
    driver_id: {
      type: 'uuid',
      notNull: true,
      references: 'transport_drivers(id)',
      onDelete: 'restrict',
    },
    trip_date: {
      type: 'date',
      notNull: true,
      default: pgm.func('current_date'),
    },
    trip_type: {
      type: 'varchar(30)',
      notNull: true,
      default: 'PICKUP', // PICKUP, DROPOFF, SPECIAL
    },
    scheduled_start_time: {
      type: 'varchar(10)', // '07:00'
    },
    scheduled_end_time: {
      type: 'varchar(10)', // '08:00'
    },
    actual_start_time: {
      type: 'timestamp with time zone',
    },
    actual_end_time: {
      type: 'timestamp with time zone',
    },
    odometer_start: {
      type: 'numeric(10, 2)',
    },
    odometer_end: {
      type: 'numeric(10, 2)',
    },
    status: {
      type: 'varchar(30)',
      notNull: true,
      default: 'SCHEDULED', // SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED, DELAYED
    },
    notes: {
      type: 'text',
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

  pgm.createIndex('transport_trips', ['school_id', 'trip_date', 'status'], {
    name: 'transport_trips_school_date_idx',
    where: 'deleted_at IS NULL',
  });
  pgm.createIndex('transport_trips', 'route_id');
  pgm.createIndex('transport_trips', 'vehicle_id');
  pgm.createIndex('transport_trips', 'driver_id');

  // 9. transport_attendance table
  pgm.createTable('transport_attendance', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    school_id: {
      type: 'uuid',
      references: 'schools(id)',
      onDelete: 'cascade',
    },
    trip_id: {
      type: 'uuid',
      notNull: true,
      references: 'transport_trips(id)',
      onDelete: 'cascade',
    },
    student_id: {
      type: 'uuid',
      notNull: true,
      references: 'students(id)',
      onDelete: 'cascade',
    },
    stop_id: {
      type: 'uuid',
      references: 'transport_stops(id)',
      onDelete: 'set null',
    },
    status: {
      type: 'varchar(30)',
      notNull: true,
      default: 'BOARDED', // BOARDED, DROPPED_OFF, ABSENT, EXCUSED, SKIPPED
    },
    recorded_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    recorded_by: {
      type: 'uuid',
      references: 'users(id)',
      onDelete: 'set null',
    },
    remarks: {
      type: 'text',
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
  });

  pgm.createIndex('transport_attendance', ['trip_id', 'student_id'], {
    name: 'transport_attendance_trip_student_idx',
    unique: true,
  });
  pgm.createIndex('transport_attendance', ['school_id', 'recorded_at']);
};

const down = async (pgm) => {
  pgm.dropTable('transport_attendance', { ifExists: true });
  pgm.dropTable('transport_trips', { ifExists: true });
  pgm.dropTable('transport_student_allocations', { ifExists: true });
  pgm.dropTable('transport_stops', { ifExists: true });
  pgm.dropTable('transport_routes', { ifExists: true });
  pgm.dropTable('transport_drivers', { ifExists: true });
  pgm.dropTable('transport_vehicles', { ifExists: true });
  pgm.dropTable('transport_settings', { ifExists: true });
};

module.exports = {
  shorthands,
  up,
  down,
};
