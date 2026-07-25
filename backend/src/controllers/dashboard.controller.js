const { buildDashboardPayload } = require('../services/dashboard.service');
const { db } = require('../config/database');

async function getDashboard(req, res) {
  try {
    // Query real-time counts from the database with error-safe fallbacks
    let totalStudents = 0;
    let totalTeachers = 0;
    let totalUsers = 0;

    try {
      const studentResult = await db.query(
        `SELECT COUNT(*)::int AS count FROM students WHERE deleted_at IS NULL AND status = 'ACTIVE'`
      );
      totalStudents = studentResult.rows[0]?.count || 0;
    } catch (err) {
      console.warn('Could not query students table:', err.message);
    }

    try {
      // Count users with Teacher role (teacher module may not exist yet)
      const teacherResult = await db.query(
        `SELECT COUNT(*)::int AS count FROM users u
         JOIN roles r ON r.id = u.role_id
         WHERE u.deleted_at IS NULL AND LOWER(r.name) LIKE '%teacher%'`
      );
      totalTeachers = teacherResult.rows[0]?.count || 0;
    } catch (err) {
      console.warn('Could not query teacher role users:', err.message);
    }

    try {
      const userResult = await db.query(
        `SELECT COUNT(*)::int AS count FROM users WHERE deleted_at IS NULL`
      );
      totalUsers = userResult.rows[0]?.count || 0;
    } catch (err) {
      console.warn('Could not query users table:', err.message);
    }

    const payload = buildDashboardPayload({
      students: totalStudents,
      teachers: totalTeachers,
      schools: 1,
      enrollments: totalStudents,
      term: '2024/2025 Academic Year',
      pendingTasks: 0,
    });

    res.status(200).json(payload);
  } catch (error) {
    console.error('Dashboard data fetch error:', error.message);
    res.status(500).json({
      message: 'Unable to load dashboard data',
      error: error.message,
    });
  }
}

module.exports = {
  getDashboard,
};
