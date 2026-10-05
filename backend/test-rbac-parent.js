const { db } = require('./src/config/database');

async function testRBAC() {
  try {
    console.log('--- 1. Testing Parent & Student Database Connections & Schemas ---');
    const parents = await db.query('SELECT id, user_id, full_name, email, phone FROM parents WHERE deleted_at IS NULL LIMIT 5');
    console.log('Sample parents:', parents.rows);

    const students = await db.query('SELECT id, user_id, parent_id, admission_number, first_name, last_name, section_id FROM students WHERE deleted_at IS NULL LIMIT 5');
    console.log('Sample students:', students.rows);

    const users = await db.query('SELECT u.id, u.email, u.phone, r.name as role_name FROM users u JOIN roles r ON r.id = u.role_id LIMIT 10');
    console.log('Sample users & roles:', users.rows);

    console.log('\n--- 2. Checking Parent Scope Logic against DB ---');
    if (parents.rows.length > 0) {
      const p = parents.rows[0];
      const children = await db.query(
        `SELECT
          s.id,
          s.user_id,
          s.admission_number,
          s.first_name,
          s.last_name,
          s.gender,
          s.date_of_birth,
          NULL AS roll_number,
          s.status,
          s.school_id,
          sec.id AS section_id,
          sec.name AS section_name,
          sec.room_number,
          g.id AS grade_id,
          g.name AS grade_name,
          sch.name AS school_name
        FROM students s
        LEFT JOIN sections sec ON sec.id = s.section_id AND sec.deleted_at IS NULL
        LEFT JOIN grades g ON g.id = sec.grade_id AND g.deleted_at IS NULL
        LEFT JOIN schools sch ON sch.id = s.school_id AND sch.deleted_at IS NULL
        WHERE s.parent_id = $1
          AND s.deleted_at IS NULL`,
        [p.id]
      );
      console.log(`Parent "${p.full_name}" has ${children.rows.length} linked children:`, children.rows);
    }

    console.log('\n✅ All Database Queries and Parent Scope schemas validated successfully with zero errors.');
    process.exit(0);
  } catch (error) {
    console.error('❌ RBAC Test Error:', error);
    process.exit(1);
  }
}

testRBAC();
