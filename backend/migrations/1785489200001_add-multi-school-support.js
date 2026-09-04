/**
 * Migration: Add Multi-School/Tenant Support
 *
 * Creates:
 * - schools table (new)
 * - Adds school_id FK to: users, teachers, students, parents, grades, 
 *   academic_years, sections, subjects, and all related tables
 *
 * This enables the system to support multiple schools with proper data isolation.
 *
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
const shorthands = undefined;

const up = async (pgm) => {
  // 1. Create schools table
  pgm.createTable('schools', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    name: {
      type: 'varchar(255)',
      notNull: true,
    },
    abbreviation: {
      type: 'varchar(20)',
    },
    address: {
      type: 'text',
    },
    phone: {
      type: 'varchar(30)',
    },
    email: {
      type: 'varchar(255)',
    },
    website: {
      type: 'varchar(255)',
    },
    principal_name: {
      type: 'varchar(255)',
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

  pgm.createIndex('schools', 'name');
  pgm.createIndex('schools', 'status');

  // 2. Add school_id to users table (make nullable first for existing data)
  pgm.addColumn('users', {
    school_id: {
      type: 'uuid',
      references: 'schools(id)',
      onDelete: 'restrict',
    },
  });

  // 3. Add school_id to teachers table
  pgm.addColumn('teachers', {
    school_id: {
      type: 'uuid',
      references: 'schools(id)',
      onDelete: 'restrict',
    },
  });

  // 4. Add school_id to students table
  pgm.addColumn('students', {
    school_id: {
      type: 'uuid',
      references: 'schools(id)',
      onDelete: 'restrict',
    },
  });

  // 5. Add school_id to parents table
  pgm.addColumn('parents', {
    user_id: {
      type: 'uuid',
      references: 'users(id)',
      onDelete: 'set null',
    },
    school_id: {
      type: 'uuid',
      references: 'schools(id)',
      onDelete: 'restrict',
    },
  });

  // 6. Add school_id to grades table
  pgm.addColumn('grades', {
    school_id: {
      type: 'uuid',
      references: 'schools(id)',
      onDelete: 'restrict',
    },
  });

  // 7. Add school_id to academic_years table
  pgm.addColumn('academic_years', {
    school_id: {
      type: 'uuid',
      references: 'schools(id)',
      onDelete: 'restrict',
    },
  });

  // 8. Add school_id to sections table
  pgm.addColumn('sections', {
    school_id: {
      type: 'uuid',
      references: 'schools(id)',
      onDelete: 'restrict',
    },
  });

  // 9. Add school_id to subjects table
  pgm.addColumn('subjects', {
    school_id: {
      type: 'uuid',
      references: 'schools(id)',
      onDelete: 'restrict',
    },
  });

  // 10. Add school_id to timetables table
  pgm.addColumn('timetables', {
    school_id: {
      type: 'uuid',
      references: 'schools(id)',
      onDelete: 'restrict',
    },
  });

  // 11. Add school_id to rooms table
  pgm.addColumn('rooms', {
    school_id: {
      type: 'uuid',
      references: 'schools(id)',
      onDelete: 'restrict',
    },
  });

  // 12. Add school_id to attendance table
  pgm.addColumn('attendance', {
    school_id: {
      type: 'uuid',
      references: 'schools(id)',
      onDelete: 'restrict',
    },
  });

  // 13. Add school_id to marks table
  pgm.addColumn('marks', {
    school_id: {
      type: 'uuid',
      references: 'schools(id)',
      onDelete: 'restrict',
    },
  });

  // 14. Add school_id to exams table
  pgm.addColumn('exams', {
    school_id: {
      type: 'uuid',
      references: 'schools(id)',
      onDelete: 'restrict',
    },
  });

  // 15. Create composite indexes for tenant isolation
  pgm.createIndex('users', ['school_id', 'email'], {
    name: 'users_school_email_idx',
    where: 'deleted_at IS NULL',
  });

  pgm.createIndex('teachers', ['school_id', 'user_id'], {
    name: 'teachers_school_user_idx',
    where: 'deleted_at IS NULL',
  });

  pgm.createIndex('students', ['school_id', 'user_id'], {
    name: 'students_school_user_idx',
    where: 'deleted_at IS NULL',
  });

  pgm.createIndex('parents', ['school_id', 'user_id'], {
    name: 'parents_school_user_idx',
    where: 'deleted_at IS NULL',
  });

  pgm.createIndex('grades', ['school_id'], {
    name: 'grades_school_idx',
    where: 'deleted_at IS NULL',
  });

  pgm.createIndex('academic_years', ['school_id'], {
    name: 'academic_years_school_idx',
    where: 'deleted_at IS NULL',
  });

  pgm.createIndex('sections', ['school_id', 'grade_id'], {
    name: 'sections_school_grade_idx',
    where: 'deleted_at IS NULL',
  });

  pgm.createIndex('timetables', ['school_id', 'academic_year_id'], {
    name: 'timetables_school_year_idx',
    where: 'deleted_at IS NULL',
  });

  pgm.createIndex('attendance', ['school_id', 'student_id'], {
    name: 'attendance_school_student_idx',
    where: 'deleted_at IS NULL',
  });

  pgm.createIndex('marks', ['school_id', 'student_id'], {
    name: 'marks_school_student_idx',
  });

  pgm.createIndex('exams', ['school_id', 'academic_year_id'], {
    name: 'exams_school_year_idx',
    where: 'deleted_at IS NULL',
  });

  // 16. Create audit_logs table for security logging
  pgm.createTable('audit_logs', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    school_id: {
      type: 'uuid',
      notNull: true,
      references: 'schools(id)',
      onDelete: 'cascade',
    },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users(id)',
      onDelete: 'set null',
    },
    action: {
      type: 'varchar(100)',
      notNull: true,
    },
    resource_type: {
      type: 'varchar(50)',
    },
    resource_id: {
      type: 'uuid',
    },
    old_values: {
      type: 'jsonb',
    },
    new_values: {
      type: 'jsonb',
    },
    ip_address: {
      type: 'varchar(45)',
    },
    user_agent: {
      type: 'text',
    },
    status: {
      type: 'varchar(20)',
      default: 'SUCCESS',
    },
    created_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  pgm.createIndex('audit_logs', ['school_id', 'created_at'], {
    name: 'audit_logs_school_time_idx',
  });

  pgm.createIndex('audit_logs', ['user_id', 'action'], {
    name: 'audit_logs_user_action_idx',
  });

  pgm.createIndex('audit_logs', ['resource_type', 'resource_id'], {
    name: 'audit_logs_resource_idx',
  });
};

const down = async (pgm) => {
  // Drop audit logs table
  pgm.dropTable('audit_logs', { ifExists: true });

  // Drop indexes
  pgm.dropIndex('exams', 'exams_school_year_idx', { ifExists: true });
  pgm.dropIndex('marks', 'marks_school_student_idx', { ifExists: true });
  pgm.dropIndex('attendance', 'attendance_school_student_idx', { ifExists: true });
  pgm.dropIndex('timetables', 'timetables_school_year_idx', { ifExists: true });
  pgm.dropIndex('sections', 'sections_school_grade_idx', { ifExists: true });
  pgm.dropIndex('academic_years', 'academic_years_school_idx', { ifExists: true });
  pgm.dropIndex('grades', 'grades_school_idx', { ifExists: true });
  pgm.dropIndex('parents', 'parents_school_user_idx', { ifExists: true });
  pgm.dropIndex('students', 'students_school_user_idx', { ifExists: true });
  pgm.dropIndex('teachers', 'teachers_school_user_idx', { ifExists: true });
  pgm.dropIndex('users', 'users_school_email_idx', { ifExists: true });

  // Drop school_id columns
  pgm.dropColumn('exams', 'school_id');
  pgm.dropColumn('marks', 'school_id');
  pgm.dropColumn('attendance', 'school_id');
  pgm.dropColumn('rooms', 'school_id');
  pgm.dropColumn('timetables', 'school_id');
  pgm.dropColumn('subjects', 'school_id');
  pgm.dropColumn('sections', 'school_id');
  pgm.dropColumn('academic_years', 'school_id');
  pgm.dropColumn('grades', 'school_id');
  pgm.dropColumn('parents', ['user_id', 'school_id']);
  pgm.dropColumn('students', 'school_id');
  pgm.dropColumn('teachers', 'school_id');
  pgm.dropColumn('users', 'school_id');

  // Drop schools table
  pgm.dropTable('schools');
};

module.exports = {
  shorthands,
  up,
  down,
};
