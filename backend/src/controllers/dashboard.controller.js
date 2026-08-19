const { buildDashboardPayload } = require('../services/dashboard.service');
const { db } = require('../config/database');

async function getDashboard(req, res) {
  try {
    let totalStudents = 0;
    let totalTeachers = 0;
    let totalAcademicYears = 0;
    let currentTerm = 'Current Term';
    let activeAssignments = 0;

    try {
      const studentResult = await db.query(
        `SELECT COUNT(*)::int AS count FROM students WHERE deleted_at IS NULL`
      );
      totalStudents = studentResult.rows[0]?.count || 0;
    } catch (err) {
      console.warn('Could not query students table:', err.message);
    }

    try {
      const teacherResult = await db.query(
        `SELECT COUNT(*)::int AS count FROM teachers WHERE deleted_at IS NULL`
      );
      totalTeachers = teacherResult.rows[0]?.count || 0;
    } catch (err) {
      console.warn('Could not query teachers table:', err.message);
    }

    try {
      const academicYearResult = await db.query(
        `SELECT COUNT(*)::int AS count FROM academic_years WHERE deleted_at IS NULL`
      );
      totalAcademicYears = academicYearResult.rows[0]?.count || 0;
    } catch (err) {
      console.warn('Could not query academic_years table:', err.message);
    }

    try {
      const activeTermResult = await db.query(
        `SELECT name
         FROM academic_years
         WHERE deleted_at IS NULL
         ORDER BY start_date DESC, created_at DESC
         LIMIT 1`
      );
      currentTerm = activeTermResult.rows[0]?.name || currentTerm;
    } catch (err) {
      console.warn('Could not query active academic year:', err.message);
    }

    try {
      const assignmentResult = await db.query(
        `SELECT COUNT(*)::int AS count FROM teacher_subjects WHERE deleted_at IS NULL`
      );
      activeAssignments = assignmentResult.rows[0]?.count || 0;
    } catch (err) {
      console.warn('Could not query teacher_subjects table:', err.message);
    }

    const payload = buildDashboardPayload({
      students: totalStudents,
      teachers: totalTeachers,
      schools: totalAcademicYears,
      enrollments: totalStudents,
      term: currentTerm,
      pendingTasks: activeAssignments,
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
