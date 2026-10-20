/**
 * Migration: Create Dynamic Settings and Governance Tables
 *
 * Implements:
 * 1. departments table (with HOD appointment and budget)
 * 2. department_id in teachers table
 * 3. role_permissions table (dynamic fine-grained permission matrix)
 * 4. system_backups table (disaster recovery registry)
 * 5. dynamic policy columns & preferences in settings table
 * 6. Seeds initial dynamic departments & dynamic role permissions matrix
 *
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
const shorthands = undefined;

const up = async (pgm) => {
  // 1. Create departments table
  pgm.createTable('departments', {
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
    name: {
      type: 'varchar(150)',
      notNull: true,
    },
    code: {
      type: 'varchar(50)',
      notNull: true,
    },
    type: {
      type: 'varchar(50)',
      notNull: true,
      default: 'ACADEMIC', // 'ACADEMIC', 'ADMINISTRATIVE', 'SUPPORT'
    },
    hod_teacher_id: {
      type: 'uuid',
      references: 'teachers(id)',
      onDelete: 'set null',
    },
    budget: {
      type: 'numeric(15, 2)',
      default: 0.00,
    },
    description: {
      type: 'text',
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

  pgm.createIndex('departments', ['school_id', 'status'], {
    name: 'idx_departments_school_status',
    where: 'deleted_at IS NULL',
  });
  pgm.createIndex('departments', 'hod_teacher_id', {
    name: 'idx_departments_hod',
  });

  // 2. Add department_id to teachers table if not exists
  pgm.addColumns('teachers', {
    department_id: {
      type: 'uuid',
      references: 'departments(id)',
      onDelete: 'set null',
    },
  });
  pgm.createIndex('teachers', 'department_id', {
    name: 'idx_teachers_department',
  });

  // 3. Create role_permissions table
  pgm.createTable('role_permissions', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    role_id: {
      type: 'uuid',
      notNull: true,
      references: 'roles(id)',
      onDelete: 'cascade',
    },
    module: {
      type: 'varchar(50)',
      notNull: true,
    },
    can_view: {
      type: 'boolean',
      notNull: true,
      default: true,
    },
    can_create: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
    can_edit: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
    can_delete: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
    can_approve: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
    can_export: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
    scope: {
      type: 'varchar(30)',
      notNull: true,
      default: 'SCHOOL', // 'OWN_ONLY', 'DEPARTMENT_ONLY', 'SCHOOL'
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

  pgm.addConstraint('role_permissions', 'uq_role_module', {
    unique: ['role_id', 'module'],
  });
  pgm.createIndex('role_permissions', 'role_id', {
    name: 'idx_role_permissions_role',
  });

  // 4. Create system_backups table
  pgm.createTable('system_backups', {
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
    file_name: {
      type: 'varchar(255)',
      notNull: true,
    },
    file_size_bytes: {
      type: 'bigint',
      notNull: true,
      default: 0,
    },
    backup_type: {
      type: 'varchar(30)',
      notNull: true,
      default: 'MANUAL', // 'AUTOMATED', 'MANUAL', 'PRE_MIGRATION'
    },
    status: {
      type: 'varchar(20)',
      notNull: true,
      default: 'COMPLETED', // 'IN_PROGRESS', 'COMPLETED', 'FAILED'
    },
    storage_path: {
      type: 'text',
      notNull: true,
    },
    checksum_sha256: {
      type: 'varchar(64)',
    },
    error_message: {
      type: 'text',
    },
    initiated_by: {
      type: 'uuid',
      references: 'users(id)',
      onDelete: 'set null',
    },
    created_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  pgm.createIndex('system_backups', 'created_at', {
    name: 'idx_system_backups_created',
  });

  // 5. Enhance settings table with dynamic configuration fields
  pgm.addColumns('settings', {
    tax_id: { type: 'varchar(50)' },
    timezone: { type: 'varchar(50)', default: 'Africa/Addis_Ababa' },
    date_format: { type: 'varchar(20)', default: 'DD/MM/YYYY' },
    calendar_system: { type: 'varchar(20)', default: 'GREGORIAN' },
    min_attendance_percentage: { type: 'integer', default: 75 },
    passing_grade_percentage: { type: 'integer', default: 50 },
    grading_system: { type: 'varchar(30)', default: 'LETTER_SCALE' },
    auto_absence_alert: { type: 'boolean', default: false },
    stamp_url: { type: 'text' },
    dynamic_preferences: { type: 'jsonb', default: '{}' },
  });

  // 6. Seed initial departments
  await pgm.sql(`
    INSERT INTO departments (id, name, code, type, description, budget, status)
    VALUES
      (gen_random_uuid(), 'Department of Natural Sciences', 'SCI', 'ACADEMIC', 'Physics, Chemistry, Biology, and Laboratory Sciences', 50000.00, 'ACTIVE'),
      (gen_random_uuid(), 'Department of Mathematics & ICT', 'MATH-ICT', 'ACADEMIC', 'Pure Mathematics, Statistics, Computer Science, and Digital Literacy', 45000.00, 'ACTIVE'),
      (gen_random_uuid(), 'Department of Languages & Humanities', 'LANG-HUM', 'ACADEMIC', 'English, Amharic, History, Geography, and Social Studies', 35000.00, 'ACTIVE'),
      (gen_random_uuid(), 'Administration & Student Services', 'ADMIN-OPS', 'ADMINISTRATIVE', 'Institutional Operations, Student Welfare, and Campus Logistics', 60000.00, 'ACTIVE')
    ON CONFLICT DO NOTHING;
  `);

  // 7. Seed initial dynamic permissions for all existing roles
  await pgm.sql(`
    DO $$
    DECLARE
      r_admin_id UUID;
      r_teacher_id UUID;
      r_student_id UUID;
      r_parent_id UUID;
      r_staff_id UUID;
      mod TEXT;
      modules TEXT[] := ARRAY[
        'students', 'teachers', 'attendance', 'marks', 'exams', 
        'timetable', 'finance', 'library', 'transport', 'announcements', 
        'reports', 'departments', 'roles_permissions', 'audit_logs', 'backups', 'settings'
      ];
    BEGIN
      SELECT id INTO r_admin_id FROM roles WHERE LOWER(name) IN ('school admin', 'admin') LIMIT 1;
      SELECT id INTO r_teacher_id FROM roles WHERE LOWER(name) = 'teacher' LIMIT 1;
      SELECT id INTO r_student_id FROM roles WHERE LOWER(name) = 'student' LIMIT 1;
      SELECT id INTO r_parent_id FROM roles WHERE LOWER(name) = 'parent' LIMIT 1;
      SELECT id INTO r_staff_id FROM roles WHERE LOWER(name) = 'staff' LIMIT 1;

      -- Seed Admin (Full Access to all modules)
      IF r_admin_id IS NOT NULL THEN
        FOREACH mod IN ARRAY modules LOOP
          INSERT INTO role_permissions (role_id, module, can_view, can_create, can_edit, can_delete, can_approve, can_export, scope)
          VALUES (r_admin_id, mod, true, true, true, true, true, true, 'SCHOOL')
          ON CONFLICT (role_id, module) DO NOTHING;
        END LOOP;
      END IF;

      -- Seed Teacher (Classroom & Academic Permissions)
      IF r_teacher_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, module, can_view, can_create, can_edit, can_delete, can_approve, can_export, scope)
        VALUES
          (r_teacher_id, 'students', true, false, false, false, false, true, 'OWN_ONLY'),
          (r_teacher_id, 'teachers', true, false, false, false, false, false, 'SCHOOL'),
          (r_teacher_id, 'attendance', true, true, true, false, false, true, 'OWN_ONLY'),
          (r_teacher_id, 'marks', true, true, true, false, false, true, 'OWN_ONLY'),
          (r_teacher_id, 'exams', true, false, false, false, false, true, 'SCHOOL'),
          (r_teacher_id, 'timetable', true, false, false, false, false, false, 'OWN_ONLY'),
          (r_teacher_id, 'announcements', true, true, false, false, false, false, 'SCHOOL'),
          (r_teacher_id, 'library', true, false, false, false, false, false, 'SCHOOL'),
          (r_teacher_id, 'reports', true, false, false, false, false, true, 'OWN_ONLY')
        ON CONFLICT (role_id, module) DO NOTHING;
      END IF;

      -- Seed Student
      IF r_student_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, module, can_view, can_create, can_edit, can_delete, can_approve, can_export, scope)
        VALUES
          (r_student_id, 'students', true, false, false, false, false, false, 'OWN_ONLY'),
          (r_student_id, 'attendance', true, false, false, false, false, false, 'OWN_ONLY'),
          (r_student_id, 'marks', true, false, false, false, false, false, 'OWN_ONLY'),
          (r_student_id, 'exams', true, false, false, false, false, false, 'OWN_ONLY'),
          (r_student_id, 'timetable', true, false, false, false, false, false, 'OWN_ONLY'),
          (r_student_id, 'library', true, false, false, false, false, false, 'SCHOOL'),
          (r_student_id, 'announcements', true, false, false, false, false, false, 'SCHOOL')
        ON CONFLICT (role_id, module) DO NOTHING;
      END IF;

      -- Seed Parent
      IF r_parent_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, module, can_view, can_create, can_edit, can_delete, can_approve, can_export, scope)
        VALUES
          (r_parent_id, 'students', true, false, false, false, false, false, 'OWN_ONLY'),
          (r_parent_id, 'attendance', true, false, false, false, false, false, 'OWN_ONLY'),
          (r_parent_id, 'marks', true, false, false, false, false, false, 'OWN_ONLY'),
          (r_parent_id, 'finance', true, false, false, false, false, false, 'OWN_ONLY'),
          (r_parent_id, 'announcements', true, false, false, false, false, false, 'SCHOOL')
        ON CONFLICT (role_id, module) DO NOTHING;
      END IF;

      -- Seed Staff
      IF r_staff_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, module, can_view, can_create, can_edit, can_delete, can_approve, can_export, scope)
        VALUES
          (r_staff_id, 'students', true, true, true, false, false, true, 'SCHOOL'),
          (r_staff_id, 'attendance', true, true, true, false, false, true, 'SCHOOL'),
          (r_staff_id, 'finance', true, true, false, false, false, true, 'SCHOOL'),
          (r_staff_id, 'library', true, true, true, false, false, true, 'SCHOOL'),
          (r_staff_id, 'transport', true, true, true, false, false, true, 'SCHOOL'),
          (r_staff_id, 'announcements', true, true, false, false, false, false, 'SCHOOL')
        ON CONFLICT (role_id, module) DO NOTHING;
      END IF;
    END $$;
  `);
};

const down = async (pgm) => {
  pgm.dropTable('role_permissions', { ifExists: true });
  pgm.dropTable('system_backups', { ifExists: true });
  pgm.dropIndex('teachers', 'department_id', { ifExists: true });
  pgm.dropColumns('teachers', ['department_id'], { ifExists: true });
  pgm.dropTable('departments', { ifExists: true });
};

module.exports = {
  shorthands,
  up,
  down,
};
