const { buildDashboardPayload, buildStudentDashboardPayload, buildParentDashboardPayload } = require('../services/dashboard.service');
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

async function getStudentDashboard(req, res) {
  try {
    const userSub = req.user?.sub;
    const userEmail = (req.user?.email || '').trim().toLowerCase();

    const studentRows = await safeQuery(
      `SELECT
        s.id,
        s.user_id,
        s.first_name,
        s.last_name,
        s.admission_number,
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
      WHERE (s.user_id = $1 OR (s.email IS NOT NULL AND LOWER(s.email) = LOWER($2)))
        AND s.deleted_at IS NULL
      ORDER BY (CASE WHEN s.user_id = $1 THEN 0 ELSE 1 END) ASC
      LIMIT 1`,
      [userSub, userEmail],
      'student profile'
    );

    let student = studentRows[0];

    // Auto-link user_id if matched by email
    if (student && !student.user_id && userSub) {
      safeQuery(
        'UPDATE students SET user_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id IS NULL',
        [userSub, student.id],
        'auto-link student user_id'
      ).catch(() => { });
      student.user_id = userSub;
    }

    // Fallback: If no student record exists yet in students table for this account
    if (!student) {
      const userRows = await safeQuery(
        `SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.school_id, sch.name AS school_name
         FROM users u
         LEFT JOIN schools sch ON sch.id = u.school_id AND sch.deleted_at IS NULL
         WHERE u.id = $1 LIMIT 1`,
        [userSub],
        'user profile fallback'
      );
      const user = userRows[0] || {};
      student = {
        id: null,
        first_name: user.first_name || req.user?.firstName || 'Student',
        last_name: user.last_name || req.user?.lastName || '',
        admission_number: null,
        gender: null,
        date_of_birth: null,
        roll_number: null,
        status: 'ACTIVE',
        school_id: user.school_id || req.user?.school_id || null,
        section_id: null,
        section_name: null,
        room_number: null,
        grade_id: null,
        grade_name: null,
        school_name: user.school_name || 'Academic Institution',
      };
    }

    const todayDayName = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date()).toUpperCase();

    const [
      subjects,
      attendanceSummary,
      attendanceTrend,
      assignments,
      exams,
      marks,
      todaySchedule,
    ] = await Promise.all([
      student.grade_id
        ? safeQuery(
          `SELECT
              s.id,
              s.subject_code,
              s.subject_name,
              s.credit_hours,
              s.pass_mark,
              s.max_mark,
              s.is_elective,
              gs.is_compulsory,
              t.first_name AS teacher_first_name,
              t.last_name AS teacher_last_name
            FROM grade_subjects gs
            JOIN subjects s ON s.id = gs.subject_id AND s.deleted_at IS NULL
            LEFT JOIN teacher_subjects ts ON ts.subject_id = s.id AND ts.section_id = $2 AND ts.deleted_at IS NULL
            LEFT JOIN teachers t ON t.id = ts.teacher_id AND t.deleted_at IS NULL
            WHERE gs.grade_id = $1 AND gs.deleted_at IS NULL
            ORDER BY s.subject_name ASC`,
          [student.grade_id, student.section_id || null],
          'student subjects'
        )
        : Promise.resolve([]),
      student.id
        ? safeQuery(
          `SELECT
              COUNT(*) FILTER (WHERE status = 'PRESENT')::int AS present,
              COUNT(*) FILTER (WHERE status = 'ABSENT')::int AS absent,
              COUNT(*) FILTER (WHERE status = 'LATE')::int AS late,
              COUNT(*) FILTER (WHERE status = 'EXCUSED')::int AS excused,
              COUNT(*)::int AS total
            FROM attendance
            WHERE student_id = $1 AND deleted_at IS NULL AND date BETWEEN CURRENT_DATE - INTERVAL '30 days' AND CURRENT_DATE`,
          [student.id],
          'student attendance summary'
        )
        : Promise.resolve([]),
      student.id
        ? safeQuery(
          `SELECT TO_CHAR(date_trunc('week', date), 'Mon DD') AS label,
              ROUND(100.0 * COUNT(*) FILTER (WHERE status IN ('PRESENT', 'LATE')) / NULLIF(COUNT(*), 0), 1)::float AS rate
            FROM attendance
            WHERE student_id = $1 AND deleted_at IS NULL AND date BETWEEN CURRENT_DATE - INTERVAL '35 days' AND CURRENT_DATE
            GROUP BY date_trunc('week', date)
            ORDER BY date_trunc('week', date)`,
          [student.id],
          'student attendance trend'
        )
        : Promise.resolve([]),
      student.grade_id
        ? safeQuery(
          `SELECT
              a.id,
              a.title,
              a.due_date,
              a.max_marks,
              a.pass_marks,
              a.status AS assignment_status,
              sub.subject_name,
              sub.subject_code,
              t.first_name AS teacher_first_name,
              t.last_name AS teacher_last_name,
              my_sub.id AS submission_id,
              my_sub.status AS submission_status,
              my_sub.obtained_marks,
              my_sub.submitted_at
            FROM assignments a
            JOIN subjects sub ON sub.id = a.subject_id AND sub.deleted_at IS NULL
            LEFT JOIN teachers t ON t.id = a.teacher_id AND t.deleted_at IS NULL
            LEFT JOIN assignment_submissions my_sub ON my_sub.assignment_id = a.id AND my_sub.student_id = $1 AND my_sub.deleted_at IS NULL
            WHERE a.grade_id = $2
              AND (a.section_id IS NULL OR a.section_id = $3)
              AND a.deleted_at IS NULL
              AND a.status IN ('PUBLISHED', 'CLOSED')
            ORDER BY a.due_date ASC
            LIMIT 10`,
          [student.id || null, student.grade_id, student.section_id || null],
          'student assignments'
        )
        : Promise.resolve([]),
      student.grade_id
        ? safeQuery(
          `SELECT
              e.id,
              e.title,
              e.exam_type,
              e.exam_date,
              e.max_marks,
              e.weight_percentage,
              e.term_or_semester,
              e.description,
              sub.subject_name,
              sub.subject_code
            FROM exams e
            JOIN subjects sub ON sub.id = e.subject_id AND sub.deleted_at IS NULL
            WHERE e.grade_id = $1
              AND e.is_published = TRUE
              AND e.deleted_at IS NULL
              AND (e.exam_date >= CURRENT_DATE OR e.exam_date IS NULL)
            ORDER BY e.exam_date ASC NULLS LAST
            LIMIT 6`,
          [student.grade_id],
          'student exams'
        )
        : Promise.resolve([]),
      student.id
        ? safeQuery(
          `SELECT
              m.id,
              m.score,
              m.is_absent,
              COALESCE(e.max_marks, 100) AS max_marks,
              e.weight_percentage,
              ROUND((COALESCE(m.score, 0)::numeric / NULLIF(COALESCE(e.max_marks, 100), 0)::numeric) * 100, 1)::float AS percentage,
              m.created_at,
              e.title AS exam_title,
              e.exam_type,
              sub.subject_name,
              sub.subject_code
            FROM marks m
            JOIN exams e ON e.id = m.exam_id AND e.deleted_at IS NULL
            JOIN subjects sub ON sub.id = m.subject_id AND sub.deleted_at IS NULL
            WHERE m.student_id = $1
            ORDER BY m.created_at DESC
            LIMIT 8`,
          [student.id],
          'student marks'
        )
        : Promise.resolve([]),
      student.section_id
        ? safeQuery(
          `SELECT
              te.id,
              te.day_of_week,
              p.name AS period_name,
              p.period_order AS period_number,
              p.start_time,
              p.end_time,
              p.period_type,
              sub.subject_name,
              sub.subject_code,
              r.name AS room_name,
              r.building AS room_building,
              r.name AS room_number,
              t.first_name AS teacher_first_name,
              t.last_name AS teacher_last_name
            FROM timetable_entries te
            JOIN timetables tt ON tt.id = te.timetable_id AND tt.is_active = TRUE AND tt.deleted_at IS NULL
            JOIN periods p ON p.id = te.period_id AND p.deleted_at IS NULL
            LEFT JOIN subjects sub ON sub.id = te.subject_id AND sub.deleted_at IS NULL
            LEFT JOIN rooms r ON r.id = te.room_id AND r.deleted_at IS NULL
            LEFT JOIN teachers t ON t.id = te.teacher_id AND t.deleted_at IS NULL
            WHERE te.section_id = $1
              AND te.day_of_week = $2
              AND te.deleted_at IS NULL
            ORDER BY p.start_time ASC, p.period_order ASC`,
          [student.section_id, todayDayName],
          'student today schedule'
        )
        : Promise.resolve([]),
    ]);

    const payload = buildStudentDashboardPayload({
      student,
      subjects,
      attendance: attendanceSummary[0] || {},
      attendanceTrend,
      assignments,
      exams,
      marks,
      todaySchedule,
    });

    return res.status(200).json(payload);
  } catch (error) {
    console.error('Student dashboard data fetch error:', error.message);
    return res.status(500).json({
      message: 'Unable to load student dashboard data',
      error: error.message,
    });
  }
}

    async function getParentDashboard(req, res) {
      try {
        const userSub = req.user?.sub;
        const userEmail = (req.user?.email || '').trim().toLowerCase();
        const userPhone = (req.user?.phone || '').trim();

        // 1. Resolve parent profile
        const parentRows = await safeQuery(
          `SELECT
        p.id,
        p.user_id,
        p.full_name,
        p.phone,
        p.email,
        p.occupation,
        p.address,
        p.relationship,
        p.school_id,
        sch.name AS school_name
      FROM parents p
      LEFT JOIN schools sch ON sch.id = p.school_id AND sch.deleted_at IS NULL
      WHERE (p.user_id = $1 OR (p.email IS NOT NULL AND LOWER(p.email) = LOWER($2)) OR (p.phone IS NOT NULL AND p.phone = $3))
        AND p.deleted_at IS NULL
      ORDER BY (CASE WHEN p.user_id = $1 THEN 0 ELSE 1 END) ASC
      LIMIT 1`,
          [userSub, userEmail, userPhone || '___NO_PHONE___'],
          'parent profile'
        );

        let parent = parentRows[0];

        // Auto-link user_id if matched by email or phone
        if (parent && !parent.user_id && userSub) {
          safeQuery(
            'UPDATE parents SET user_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id IS NULL',
            [userSub, parent.id],
            'auto-link parent user_id'
          ).catch(() => { });
          parent.user_id = userSub;
        }

        if (!parent) {
          const userRows = await safeQuery(
            `SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.school_id, sch.name AS school_name
         FROM users u
         LEFT JOIN schools sch ON sch.id = u.school_id AND sch.deleted_at IS NULL
         WHERE u.id = $1 LIMIT 1`,
            [userSub],
            'user profile fallback'
          );
          const user = userRows[0] || {};
          parent = {
            id: null,
            full_name: `${user.first_name || req.user?.firstName || 'Parent'} ${user.last_name || req.user?.lastName || ''}`.trim(),
            phone: user.phone || req.user?.phone || null,
            email: user.email || req.user?.email || null,
            relationship: 'GUARDIAN',
            school_name: user.school_name || 'Academic Institution',
          };
        }

        // 2. Fetch children linked to this parent
        const childrenRows = parent.id
          ? await safeQuery(
            `SELECT
            s.id,
            s.user_id,
            s.first_name,
            s.last_name,
            s.admission_number,
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
            AND s.deleted_at IS NULL
          ORDER BY s.first_name ASC, s.last_name ASC`,
            [parent.id],
            'parent children'
          )
          : [];

        const todayDayName = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date()).toUpperCase();

        // 3. For each child, load their detailed academic dataset in parallel
        const childrenData = await Promise.all(
          childrenRows.map(async (student) => {
            const [
              subjects,
              attendanceSummary,
              attendanceTrend,
              assignments,
              exams,
              marks,
              todaySchedule,
            ] = await Promise.all([
              student.grade_id
                ? safeQuery(
                  `SELECT
                  s.id,
                  s.subject_code,
                  s.subject_name,
                  s.credit_hours,
                  s.pass_mark,
                  s.max_mark,
                  s.is_elective,
                  gs.is_compulsory,
                  t.first_name AS teacher_first_name,
                  t.last_name AS teacher_last_name
                FROM grade_subjects gs
                JOIN subjects s ON s.id = gs.subject_id AND s.deleted_at IS NULL
                LEFT JOIN teacher_subjects ts ON ts.subject_id = s.id AND ts.section_id = $2 AND ts.deleted_at IS NULL
                LEFT JOIN teachers t ON t.id = ts.teacher_id AND t.deleted_at IS NULL
                WHERE gs.grade_id = $1 AND gs.deleted_at IS NULL
                ORDER BY s.subject_name ASC`,
                  [student.grade_id, student.section_id || null],
                  'child subjects'
                )
                : Promise.resolve([]),
              student.id
                ? safeQuery(
                  `SELECT
                  COUNT(*) FILTER (WHERE status = 'PRESENT')::int AS present,
                  COUNT(*) FILTER (WHERE status = 'ABSENT')::int AS absent,
                  COUNT(*) FILTER (WHERE status = 'LATE')::int AS late,
                  COUNT(*) FILTER (WHERE status = 'EXCUSED')::int AS excused,
                  COUNT(*)::int AS total
                FROM attendance
                WHERE student_id = $1 AND deleted_at IS NULL AND date BETWEEN CURRENT_DATE - INTERVAL '30 days' AND CURRENT_DATE`,
                  [student.id],
                  'child attendance summary'
                )
                : Promise.resolve([]),
              student.id
                ? safeQuery(
                  `SELECT TO_CHAR(date_trunc('week', date), 'Mon DD') AS label,
                  ROUND(100.0 * COUNT(*) FILTER (WHERE status IN ('PRESENT', 'LATE')) / NULLIF(COUNT(*), 0), 1)::float AS rate
                FROM attendance
                WHERE student_id = $1 AND deleted_at IS NULL AND date BETWEEN CURRENT_DATE - INTERVAL '35 days' AND CURRENT_DATE
                GROUP BY date_trunc('week', date)
                ORDER BY date_trunc('week', date)`,
                  [student.id],
                  'child attendance trend'
                )
                : Promise.resolve([]),
              student.grade_id
                ? safeQuery(
                  `SELECT
                  a.id,
                  a.title,
                  a.due_date,
                  a.max_marks,
                  a.pass_marks,
                  a.status AS assignment_status,
                  sub.subject_name,
                  sub.subject_code,
                  t.first_name AS teacher_first_name,
                  t.last_name AS teacher_last_name,
                  my_sub.id AS submission_id,
                  my_sub.status AS submission_status,
                  my_sub.obtained_marks,
                  my_sub.submitted_at
                FROM assignments a
                JOIN subjects sub ON sub.id = a.subject_id AND sub.deleted_at IS NULL
                LEFT JOIN teachers t ON t.id = a.teacher_id AND t.deleted_at IS NULL
                LEFT JOIN assignment_submissions my_sub ON my_sub.assignment_id = a.id AND my_sub.student_id = $1 AND my_sub.deleted_at IS NULL
                WHERE a.grade_id = $2
                  AND (a.section_id IS NULL OR a.section_id = $3)
                  AND a.deleted_at IS NULL
                  AND a.status IN ('PUBLISHED', 'CLOSED')
                ORDER BY a.due_date ASC
                LIMIT 10`,
                  [student.id || null, student.grade_id, student.section_id || null],
                  'child assignments'
                )
                : Promise.resolve([]),
              student.grade_id
                ? safeQuery(
                  `SELECT
                  e.id,
                  e.title,
                  e.exam_type,
                  e.exam_date,
                  e.max_marks,
                  e.weight_percentage,
                  e.term_or_semester,
                  e.description,
                  sub.subject_name,
                  sub.subject_code
                FROM exams e
                JOIN subjects sub ON sub.id = e.subject_id AND sub.deleted_at IS NULL
                WHERE e.grade_id = $1
                  AND e.is_published = TRUE
                  AND e.deleted_at IS NULL
                  AND (e.exam_date >= CURRENT_DATE OR e.exam_date IS NULL)
                ORDER BY e.exam_date ASC NULLS LAST
                LIMIT 8`,
                  [student.grade_id],
                  'child exams'
                )
                : Promise.resolve([]),
              student.id
                ? safeQuery(
                  `SELECT
                  m.id,
                  m.score,
                  m.is_absent,
                  COALESCE(e.max_marks, 100) AS max_marks,
                  e.weight_percentage,
                  ROUND((COALESCE(m.score, 0)::numeric / NULLIF(COALESCE(e.max_marks, 100), 0)::numeric) * 100, 1)::float AS percentage,
                  m.created_at,
                  e.title AS exam_title,
                  e.exam_type,
                  sub.subject_name,
                  sub.subject_code
                FROM marks m
                JOIN exams e ON e.id = m.exam_id AND e.deleted_at IS NULL
                JOIN subjects sub ON sub.id = m.subject_id AND sub.deleted_at IS NULL
                WHERE m.student_id = $1
                ORDER BY m.created_at DESC
                LIMIT 10`,
                  [student.id],
                  'child marks'
                )
                : Promise.resolve([]),
              student.section_id
                ? safeQuery(
                  `SELECT
                  te.id,
                  te.day_of_week,
                  p.name AS period_name,
                  p.period_order AS period_number,
                  p.start_time,
                  p.end_time,
                  p.period_type,
                  sub.subject_name,
                  sub.subject_code,
                  r.name AS room_name,
                  r.building AS room_building,
                  r.name AS room_number,
                  t.first_name AS teacher_first_name,
                  t.last_name AS teacher_last_name
                FROM timetable_entries te
                JOIN timetables tt ON tt.id = te.timetable_id AND tt.is_active = TRUE AND tt.deleted_at IS NULL
                JOIN periods p ON p.id = te.period_id AND p.deleted_at IS NULL
                LEFT JOIN subjects sub ON sub.id = te.subject_id AND sub.deleted_at IS NULL
                LEFT JOIN rooms r ON r.id = te.room_id AND r.deleted_at IS NULL
                LEFT JOIN teachers t ON t.id = te.teacher_id AND t.deleted_at IS NULL
                WHERE te.section_id = $1
                  AND te.day_of_week = $2
                  AND te.deleted_at IS NULL
                ORDER BY p.start_time ASC, p.period_order ASC`,
                  [student.section_id, todayDayName],
                  'child today schedule'
                )
                : Promise.resolve([]),
            ]);

            return {
              student,
              subjects,
              attendance: attendanceSummary[0] || {},
              attendanceTrend,
              assignments,
              exams,
              marks,
              todaySchedule,
            };
          })
        );

        // 4. Collect child-specific activities
        const childIds = childrenRows.map((c) => c.id).filter(Boolean);
        const childGradeIds = [...new Set(childrenRows.map((c) => c.grade_id).filter(Boolean))];

        const recentChildMarks = childIds.length
          ? await safeQuery(
            `SELECT m.id, m.score, e.title AS exam_title, s.first_name, s.last_name, m.created_at
           FROM marks m
           JOIN exams e ON e.id = m.exam_id
           JOIN students s ON s.id = m.student_id
           WHERE m.student_id = ANY($1::uuid[])
           ORDER BY m.created_at DESC LIMIT 4`,
            [childIds],
            'recent child marks'
          )
          : [];

        const recentChildExams = childGradeIds.length
          ? await safeQuery(
            `SELECT e.id, e.title, e.exam_date, e.created_at
           FROM exams e
           WHERE e.grade_id = ANY($1::uuid[]) AND e.is_published = TRUE AND e.deleted_at IS NULL
           ORDER BY e.created_at DESC LIMIT 4`,
            [childGradeIds],
            'recent child exams'
          )
          : [];

        const recentActivity = [
          ...recentChildMarks.map((m) => ({
            id: `mark-${m.id}`,
            title: 'New Assessment Result',
            description: `Mark graded for ${m.first_name}: ${m.exam_title}`,
            timestamp: m.created_at,
          })),
          ...recentChildExams.map((e) => ({
            id: `exam-${e.id}`,
            title: 'Exam Scheduled',
            description: `${e.title} scheduled on ${e.exam_date ? new Date(e.exam_date).toLocaleDateString() : 'upcoming date'}`,
            timestamp: e.created_at,
          })),
        ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 6);

        const payload = buildParentDashboardPayload({
          parent,
          childrenData,
          recentActivity,
        });

        return res.status(200).json(payload);
      } catch (error) {
        console.error('Parent dashboard data fetch error:', error.message);
        return res.status(500).json({
          message: 'Unable to load parent dashboard data',
          error: error.message,
        });
      }
    }

    async function getDashboard(req, res) {
      try {
        const role = (req.user?.role || '').toLowerCase();
        if (role === 'student') {
          return await getStudentDashboard(req, res);
        }
        if (role === 'parent') {
          return await getParentDashboard(req, res);
        }
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
