const { buildDashboardPayload } = require('../services/dashboard.service');
const { db } = require('../config/database');

async function getSchoolScope(user = {}) {
  let schoolId = user.schoolId || user.school_id;

  if (!schoolId && user.sub) {
    const rows = await safeQuery('SELECT school_id FROM users WHERE id = $1 AND deleted_at IS NULL LIMIT 1', [user.sub], 'user school scope');
    schoolId = rows[0]?.school_id;
  }

  return schoolId ? { clause: 'school_id = $1', values: [schoolId] } : { clause: 'TRUE', values: [] };
}

async function safeQuery(text, values = [], label) {
  try {
    return (await db.query(text, values)).rows;
  } catch (error) {
    console.warn(`Could not query ${label}:`, error.message);
    return [];
  }
}

async function getDashboard(req, res) {
  try {
    const scope = await getSchoolScope(req.user);
    const active = (table) => `${scope.clause} AND ${table}.deleted_at IS NULL`;
    const { values } = scope;
    const count = (rows) => Number(rows[0]?.count || 0);

    const [studentRows, teacherRows, schoolRows, yearRows, sectionRows, assignmentRows, termRows, attendanceSummary, attendanceTrend, performanceSummary, performanceDistribution, enrollmentTrend, sectionOverview, recentStudents, recentTeachers, recentExams] = await Promise.all([
      safeQuery(`SELECT COUNT(*)::int AS count FROM students WHERE ${active('students')}`, values, 'students'),
      safeQuery(`SELECT COUNT(*)::int AS count FROM teachers WHERE ${active('teachers')}`, values, 'teachers'),
      safeQuery(`SELECT COUNT(*)::int AS count FROM schools WHERE ${active('schools')}`, values, 'schools'),
      safeQuery(`SELECT COUNT(*)::int AS count FROM academic_years WHERE ${active('academic_years')}`, values, 'academic years'),
      safeQuery(`SELECT COUNT(*)::int AS count FROM sections WHERE ${active('sections')}`, values, 'sections'),
      safeQuery(`SELECT COUNT(*)::int AS count FROM teacher_subjects WHERE ${active('teacher_subjects')}`, values, 'teacher assignments'),
      safeQuery(`SELECT name FROM academic_years WHERE ${active('academic_years')} ORDER BY start_date DESC, created_at DESC LIMIT 1`, values, 'active academic year'),
      safeQuery(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'PRESENT')::int AS present,
          COUNT(*) FILTER (WHERE status = 'ABSENT')::int AS absent,
          COUNT(*) FILTER (WHERE status = 'LATE')::int AS late,
          COUNT(*) FILTER (WHERE status = 'EXCUSED')::int AS excused,
          COUNT(*)::int AS total
        FROM attendance
        WHERE ${active('attendance')} AND date BETWEEN CURRENT_DATE - INTERVAL '30 days' AND CURRENT_DATE
      `, values, 'attendance summary'),
      safeQuery(`
        SELECT TO_CHAR(date_trunc('week', date), 'Mon DD') AS label,
          ROUND(100.0 * COUNT(*) FILTER (WHERE status IN ('PRESENT', 'LATE')) / NULLIF(COUNT(*), 0), 1)::float AS rate
        FROM attendance
        WHERE ${active('attendance')} AND date BETWEEN CURRENT_DATE - INTERVAL '35 days' AND CURRENT_DATE
        GROUP BY date_trunc('week', date)
        ORDER BY date_trunc('week', date)
      `, values, 'attendance trend'),
      safeQuery(`
        SELECT ROUND(AVG(score), 1)::float AS average_score,
          ROUND(100.0 * COUNT(*) FILTER (WHERE score >= 50) / NULLIF(COUNT(*), 0), 1)::float AS pass_rate
        FROM marks
        WHERE ${scope.clause}
      `, values, 'performance summary'),
      safeQuery(`
        SELECT bucket AS label, COUNT(*)::int AS count
        FROM (
          SELECT CASE WHEN score >= 85 THEN '85-100' WHEN score >= 70 THEN '70-84' WHEN score >= 50 THEN '50-69' ELSE 'Below 50' END AS bucket
          FROM marks
          WHERE ${scope.clause}
        ) scores
        GROUP BY bucket
        ORDER BY CASE bucket WHEN '85-100' THEN 1 WHEN '70-84' THEN 2 WHEN '50-69' THEN 3 ELSE 4 END
      `, values, 'performance distribution'),
      safeQuery(`
        SELECT TO_CHAR(date_trunc('month', admission_date), 'Mon') AS label, COUNT(*)::int AS count
        FROM students
        WHERE ${active('students')} AND admission_date BETWEEN CURRENT_DATE - INTERVAL '6 months' AND CURRENT_DATE
        GROUP BY date_trunc('month', admission_date)
        ORDER BY date_trunc('month', admission_date)
      `, values, 'enrollment trend'),
      safeQuery(`
        SELECT sections.id, sections.name, COUNT(students.id)::int AS students
        FROM sections
        LEFT JOIN students ON students.section_id = sections.id AND students.deleted_at IS NULL
        WHERE ${active('sections')}
        GROUP BY sections.id, sections.name
        ORDER BY students DESC, sections.name
        LIMIT 6
      `, values, 'section overview'),
      safeQuery(`SELECT id, first_name, last_name, created_at FROM students WHERE ${active('students')} ORDER BY created_at DESC LIMIT 3`, values, 'recent students'),
      safeQuery(`SELECT id, first_name, last_name, created_at FROM teachers WHERE ${active('teachers')} ORDER BY created_at DESC LIMIT 3`, values, 'recent teachers'),
      safeQuery(`SELECT id, title, created_at FROM exams WHERE ${active('exams')} ORDER BY created_at DESC LIMIT 3`, values, 'recent exams'),
    ]);

    const attendance = attendanceSummary[0] || {};
    const performance = performanceSummary[0] || {};
    const activities = [
      ...recentStudents.map((row) => ({ id: `student-${row.id}`, title: 'New student record', description: `${row.first_name} ${row.last_name} was added`, timestamp: row.created_at })),
      ...recentTeachers.map((row) => ({ id: `teacher-${row.id}`, title: 'Teacher profile updated', description: `${row.first_name} ${row.last_name} joined the staff directory`, timestamp: row.created_at })),
      ...recentExams.map((row) => ({ id: `exam-${row.id}`, title: 'Assessment created', description: row.title, timestamp: row.created_at })),
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 6);

    const payload = buildDashboardPayload({
      students: count(studentRows),
      teachers: count(teacherRows),
      schools: count(schoolRows),
      academicYears: count(yearRows),
      sections: count(sectionRows),
      enrollments: count(studentRows),
      term: termRows[0]?.name || 'Current Term',
      pendingTasks: count(assignmentRows),
      attendanceRate: Number(attendance.total) ? Math.round(((Number(attendance.present || 0) + Number(attendance.late || 0)) / Number(attendance.total)) * 1000) / 10 : 0,
      attendancePresent: Number(attendance.present || 0),
      attendanceAbsent: Number(attendance.absent || 0),
      attendanceLate: Number(attendance.late || 0),
      attendanceExcused: Number(attendance.excused || 0),
      attendanceTrend,
      averageScore: Number(performance.average_score || 0),
      passRate: Number(performance.pass_rate || 0),
      performanceDistribution,
      enrollmentTrend,
      sectionOverview,
      publishedExams: count(await safeQuery(`SELECT COUNT(*)::int AS count FROM exams WHERE ${active('exams')} AND is_published = TRUE`, values, 'published exams')),
      activities,
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
