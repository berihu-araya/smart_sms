/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
const shorthands = undefined;

const up = async (pgm) => {
  // Ensure standard roles exist in the roles table
  const roles = [
    { name: 'School Admin', description: 'Full administrator with complete system access' },
    { name: 'Teacher', description: 'Teacher role for classroom management, grading, and attendance' },
    { name: 'Student', description: 'Student role for courses, timetable, homework, and results' },
    { name: 'Parent', description: 'Parent role for monitoring children, attendance, and fee tracking' },
    { name: 'Staff', description: 'Administrative and operational staff member' },
  ];

  for (const role of roles) {
    await pgm.sql(`
      INSERT INTO roles (id, name, description, created_at, updated_at)
      SELECT gen_random_uuid(), '${role.name}', '${role.description}', current_timestamp, current_timestamp
      WHERE NOT EXISTS (SELECT 1 FROM roles WHERE LOWER(name) = LOWER('${role.name}'));
    `);
  }
};

const down = async (pgm) => {
  // Do not delete roles in down migration if they are referenced by users
};

module.exports = {
  shorthands,
  up,
  down,
};
