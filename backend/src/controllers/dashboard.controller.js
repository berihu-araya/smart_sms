const { buildDashboardPayload, buildStudentDashboardPayload, buildParentDashboardPayload, buildTeacherDashboardPayload } = require('../services/dashboard.service');
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

async function getDatabaseCalendar(label) {
  const rows = await safeQuery(
    `SELECT CURRENT_DATE::text AS current_date,
      UPPER(TRIM(TO_CHAR(CURRENT_DATE, 'Day'))) AS day_of_week`,
    [],
    label
  );
  return rows[0] || {};
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

    const databaseCalendar = await getDatabaseCalendar('student database date');
    const todayDayName = databaseCalendar.day_of_week;

    const [
      subjects,
      attendanceSummary,
      attendanceTrend,
      assignments,
      exams,
      marks,
      todaySchedule,
      studentFeeSummary,
      studentRecentInvoices,
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
      student.id
        ? safeQuery(
          `SELECT 
             COALESCE(SUM(total_amount), 0)::float AS total_invoiced,
             COALESCE(SUM(paid_amount), 0)::float AS total_paid,
             COALESCE(SUM(balance_amount), 0)::float AS outstanding_balance,
             COUNT(*)::int AS total_invoices,
             COUNT(CASE WHEN status = 'PAID' THEN 1 END)::int AS paid_invoices_count,
             COUNT(CASE WHEN status IN ('UNPAID', 'PARTIALLY_PAID') THEN 1 END)::int AS pending_invoices_count
           FROM student_fee_invoices
           WHERE student_id = $1 AND deleted_at IS NULL`,
          [student.id],
          'student fee summary'
        )
        : Promise.resolve([]),
      student.id
        ? safeQuery(
          `SELECT id, invoice_number, title, total_amount, paid_amount, balance_amount, status, due_date
           FROM student_fee_invoices
           WHERE student_id = $1 AND deleted_at IS NULL
           ORDER BY due_date DESC, created_at DESC
           LIMIT 4`,
          [student.id],
          'student recent invoices'
        )
        : Promise.resolve([]),
    ]);

    const studentFee = studentFeeSummary[0] || {};

    const payload = buildStudentDashboardPayload({
      student,
      subjects,
      attendance: attendanceSummary[0] || {},
      attendanceTrend,
      assignments,
      exams,
      marks,
      todaySchedule,
      finance: {
        totalInvoiced: Number(studentFee.total_invoiced || 0),
        totalPaid: Number(studentFee.total_paid || 0),
        outstandingBalance: Number(studentFee.outstanding_balance || 0),
        pendingInvoicesCount: Number(studentFee.pending_invoices_count || 0),
        paidInvoicesCount: Number(studentFee.paid_invoices_count || 0),
        recentInvoices: studentRecentInvoices,
      },
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

async function getTeacherDashboard(req, res) {
  try {
    const userSub = req.user?.sub;
    const userEmail = (req.user?.email || '').trim().toLowerCase();
    const teacherRows = await safeQuery(
      `SELECT t.*, sch.name AS school_name
       FROM teachers t
       LEFT JOIN schools sch ON sch.id = t.school_id AND sch.deleted_at IS NULL
       WHERE (t.user_id = $1 OR (t.email IS NOT NULL AND LOWER(t.email) = LOWER($2)))
         AND t.deleted_at IS NULL
       ORDER BY (CASE WHEN t.user_id = $1 THEN 0 ELSE 1 END) ASC
       LIMIT 1`,
      [userSub, userEmail],
      'teacher profile'
    );
    const teacher = teacherRows[0] || {
      id: null,
      first_name: req.user?.firstName || 'Faculty',
      last_name: req.user?.lastName || 'Member',
      email: req.user?.email,
      status: 'ACTIVE',
    };

    const academicYearRows = await safeQuery(
      `SELECT id, name FROM academic_years
       WHERE is_active = TRUE AND status = 'ACTIVE' AND deleted_at IS NULL
       ORDER BY start_date DESC LIMIT 1`,
      [],
      'active academic year'
    );
    const academicYear = academicYearRows[0] || {};
    const databaseDate = await getDatabaseCalendar('database current date');
    const todayDayName = databaseDate.day_of_week;
    const timetableWhere = teacher.id && academicYear.id
      ? `te.teacher_id = $1 AND tt.academic_year_id = $2 AND tt.is_active = TRUE AND tt.status = 'PUBLISHED'
         AND tt.deleted_at IS NULL AND te.deleted_at IS NULL`
      : 'FALSE';
    const timetableValues = teacher.id && academicYear.id ? [teacher.id, academicYear.id] : [];
    const timetableBase = `
      SELECT te.id, te.day_of_week, te.section_id, sec.name AS section_name,
        g.id AS grade_id, g.name AS grade_name, te.subject_id,
        sub.subject_name, sub.subject_code, te.room_id, r.name AS room_name,
        r.building AS room_building, p.name AS period_name,
        TO_CHAR(p.start_time, 'HH24:MI') AS start_time,
        TO_CHAR(p.end_time, 'HH24:MI') AS end_time, p.period_order,
        p.is_break, p.period_type
      FROM timetable_entries te
      JOIN timetables tt ON tt.id = te.timetable_id
      JOIN periods p ON p.id = te.period_id AND p.deleted_at IS NULL
      JOIN sections sec ON sec.id = te.section_id AND sec.deleted_at IS NULL
      LEFT JOIN grades g ON g.id = sec.grade_id AND g.deleted_at IS NULL
      LEFT JOIN subjects sub ON sub.id = te.subject_id AND sub.deleted_at IS NULL
      LEFT JOIN rooms r ON r.id = te.room_id AND r.deleted_at IS NULL
      WHERE ${timetableWhere}`;

    const [todayTimetable, weeklySchedule, teachingAssignments, homeroomRows, studentCountRows, teacherPayslips] = await Promise.all([
      todayDayName ? safeQuery(`${timetableBase} AND te.day_of_week = $3 ORDER BY p.period_order ASC, p.start_time ASC`, [...timetableValues, todayDayName], 'teacher today timetable') : Promise.resolve([]),
      safeQuery(`${timetableBase} ORDER BY CASE te.day_of_week WHEN 'MONDAY' THEN 1 WHEN 'TUESDAY' THEN 2 WHEN 'WEDNESDAY' THEN 3 WHEN 'THURSDAY' THEN 4 WHEN 'FRIDAY' THEN 5 WHEN 'SATURDAY' THEN 6 WHEN 'SUNDAY' THEN 7 END, p.period_order ASC, p.start_time ASC`, timetableValues, 'teacher weekly timetable'),
      teacher.id && academicYear.id ? safeQuery(
        `SELECT ts.id, ts.grade_id, g.name AS grade_name, ts.section_id, sec.name AS section_name,
          ts.subject_id, sub.subject_name, sub.subject_code, ts.status,
          sec.room_number AS section_default_room,
          (SELECT COUNT(*)::int FROM students s WHERE s.section_id = ts.section_id AND s.deleted_at IS NULL) AS student_count
         FROM teacher_subjects ts
         JOIN grades g ON g.id = ts.grade_id AND g.deleted_at IS NULL
         JOIN sections sec ON sec.id = ts.section_id AND sec.deleted_at IS NULL
         JOIN subjects sub ON sub.id = ts.subject_id AND sub.deleted_at IS NULL
         WHERE ts.teacher_id = $1 AND ts.academic_year_id = $2 AND ts.status = 'ACTIVE' AND ts.deleted_at IS NULL
         ORDER BY g.name, sec.name, sub.subject_name`,
        [teacher.id, academicYear.id],
        'teacher term assignments'
      ) : Promise.resolve([]),
      teacher.id && academicYear.id ? safeQuery(
        `SELECT ct.id AS class_teacher_id, ct.section_id, sec.name AS section_name,
          sec.grade_id, g.name AS grade_name, sec.room_number,
          ay.name AS academic_year_name,
          (SELECT COUNT(*)::int FROM students s WHERE s.section_id = sec.id AND s.deleted_at IS NULL) AS student_count
         FROM class_teachers ct
         JOIN sections sec ON sec.id = ct.section_id AND sec.deleted_at IS NULL
         JOIN grades g ON g.id = sec.grade_id AND g.deleted_at IS NULL
         JOIN academic_years ay ON ay.id = ct.academic_year_id
         WHERE ct.teacher_id = $1 AND ct.academic_year_id = $2 AND ct.status = 'ACTIVE' AND ct.deleted_at IS NULL
         LIMIT 1`,
        [teacher.id, academicYear.id],
        'teacher homeroom'
      ) : Promise.resolve([]),
      teacher.id && academicYear.id ? safeQuery(
        `SELECT COUNT(DISTINCT s.id)::int AS total_student_count
         FROM students s
         WHERE s.deleted_at IS NULL
           AND (
             EXISTS (
               SELECT 1 FROM teacher_subjects ts
               WHERE ts.teacher_id = $1 AND ts.academic_year_id = $2
                 AND ts.section_id = s.section_id
                 AND ts.status = 'ACTIVE' AND ts.deleted_at IS NULL
             )
             OR EXISTS (
               SELECT 1 FROM class_teachers ct
               WHERE ct.teacher_id = $1 AND ct.academic_year_id = $2
                 AND ct.section_id = s.section_id
                 AND ct.status = 'ACTIVE' AND ct.deleted_at IS NULL
             )
           )`,
        [teacher.id, academicYear.id],
        'teacher distinct student count'
      ) : Promise.resolve([]),
      userSub ? safeQuery(
        `SELECT p.id, p.payslip_number, p.gross_salary, p.total_deductions, p.net_salary, p.status, pr.month, pr.year, pr.batch_reference, p.created_at
         FROM payslips p
         JOIN payroll_runs pr ON pr.id = p.payroll_run_id AND pr.deleted_at IS NULL
         WHERE p.user_id = $1 AND p.deleted_at IS NULL
         ORDER BY pr.year DESC, pr.month DESC, p.created_at DESC
         LIMIT 4`,
        [userSub],
        'teacher recent payslips'
      ) : Promise.resolve([]),
    ]);

    const homeroomClass = homeroomRows[0] || null;
    const homeroomCourses = homeroomClass ? await safeQuery(
      `SELECT sub.id AS subject_id, sub.subject_name, sub.subject_code,
        COALESCE(gs.pass_marks, sub.pass_mark) AS pass_mark,
        COALESCE(gs.total_marks, sub.max_mark) AS max_mark,
        gs.weekly_periods, gs.is_compulsory
       FROM grade_subjects gs
       JOIN subjects sub ON sub.id = gs.subject_id AND sub.deleted_at IS NULL
       WHERE gs.grade_id = $1 AND gs.status = 'ACTIVE' AND gs.deleted_at IS NULL
       ORDER BY gs.display_order ASC, sub.subject_name ASC`,
      [homeroomClass.grade_id],
      'homeroom courses'
    ) : [];

    const payload = buildTeacherDashboardPayload({
      teacher,
      todayTimetable,
      weeklySchedule,
      teachingAssignments,
      homeroomClass,
      homeroomCourses,
      recentPayslips: teacherPayslips,
      activeAcademicYear: academicYear.name,
      currentDayOfWeek: todayDayName,
      currentDate: databaseDate.current_date,
      totalStudentCount: studentCountRows[0]?.total_student_count || 0,
    });
    return res.status(200).json(payload);
  } catch (error) {
    console.error('Teacher dashboard data fetch error:', error.message);
    return res.status(500).json({ message: 'Unable to load teacher dashboard data', error: error.message });
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

        const databaseCalendar = await getDatabaseCalendar('parent database date');
        const todayDayName = databaseCalendar.day_of_week;

        // 3. For each child, load their detailed academic & financial dataset in parallel
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
              childFeeSummary,
              childRecentInvoices,
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
              student.id
                ? safeQuery(
                  `SELECT 
                     COALESCE(SUM(total_amount), 0)::float AS total_invoiced,
                     COALESCE(SUM(paid_amount), 0)::float AS total_paid,
                     COALESCE(SUM(balance_amount), 0)::float AS outstanding_balance,
                     COUNT(*)::int AS total_invoices,
                     COUNT(CASE WHEN status = 'PAID' THEN 1 END)::int AS paid_invoices_count,
                     COUNT(CASE WHEN status IN ('UNPAID', 'PARTIALLY_PAID') THEN 1 END)::int AS pending_invoices_count
                   FROM student_fee_invoices
                   WHERE student_id = $1 AND deleted_at IS NULL`,
                  [student.id],
                  'child fee summary'
                )
                : Promise.resolve([]),
              student.id
                ? safeQuery(
                  `SELECT id, invoice_number, title, total_amount, paid_amount, balance_amount, status, due_date
                   FROM student_fee_invoices
                   WHERE student_id = $1 AND deleted_at IS NULL
                   ORDER BY due_date DESC, created_at DESC
                   LIMIT 4`,
                  [student.id],
                  'child recent invoices'
                )
                : Promise.resolve([]),
            ]);

            const feeSum = childFeeSummary[0] || {};

            return {
              student,
              subjects,
              attendance: attendanceSummary[0] || {},
              attendanceTrend,
              assignments,
              exams,
              marks,
              todaySchedule,
              finance: {
                totalInvoiced: Number(feeSum.total_invoiced || 0),
                totalPaid: Number(feeSum.total_paid || 0),
                outstandingBalance: Number(feeSum.outstanding_balance || 0),
                pendingInvoicesCount: Number(feeSum.pending_invoices_count || 0),
                paidInvoicesCount: Number(feeSum.paid_invoices_count || 0),
                recentInvoices: childRecentInvoices,
              },
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
        if (role === 'teacher') {
          return await getTeacherDashboard(req, res);
        }
        const scope = await getSchoolScope(req.user);
        const active = (table) => `${scope.clause} AND ${table}.deleted_at IS NULL`;
        const { values } = scope;
        const count = (rows) => Number(rows[0]?.count || 0);

        const [
          studentRows,
          teacherRows,
          schoolRows,
          yearRows,
          sectionRows,
          assignmentRows,
          termRows,
          attendanceSummary,
          attendanceTrend,
          performanceSummary,
          performanceDistribution,
          enrollmentTrend,
          sectionOverview,
          recentStudents,
          recentTeachers,
          recentExams,
          invoiceSummaryRows,
          incomeRows,
          expenseRows,
          payrollSummaryRows,
          salaryStructureRows,
          bankSlipRows,
          settingsRows,
          latestPayrollRows,
          recentPayrollRunsRows,
          recentPaymentsRows,
          recentExpensesRows,
          monthlyFinanceTrendRows,
        ] = await Promise.all([
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
          safeQuery(
            `SELECT 
               COALESCE(SUM(total_amount), 0)::float AS total_invoiced,
               COALESCE(SUM(paid_amount), 0)::float AS total_collected,
               COALESCE(SUM(balance_amount), 0)::float AS total_outstanding,
               COUNT(*)::int AS total_invoices,
               COUNT(CASE WHEN status = 'PAID' THEN 1 END)::int AS paid_invoices_count,
               COUNT(CASE WHEN status = 'PARTIALLY_PAID' THEN 1 END)::int AS partial_invoices_count,
               COUNT(CASE WHEN status = 'UNPAID' THEN 1 END)::int AS unpaid_invoices_count,
               COUNT(CASE WHEN due_date < CURRENT_DATE AND status NOT IN ('PAID', 'CANCELLED') THEN 1 END)::int AS overdue_invoices_count
             FROM student_fee_invoices
             WHERE ${active('student_fee_invoices')}`,
            values,
            'finance invoices summary'
          ),
          safeQuery(
            `SELECT COALESCE(SUM(amount), 0)::float AS total_other_income
             FROM incomes
             WHERE ${active('incomes')}`,
            values,
            'finance direct income'
          ),
          safeQuery(
            `SELECT COALESCE(SUM(amount), 0)::float AS total_expenses
             FROM expenses
             WHERE ${active('expenses')} AND status = 'APPROVED'`,
            values,
            'finance expenses'
          ),
          safeQuery(
            `SELECT 
               COALESCE(SUM(total_net_amount), 0)::float AS total_payroll_disbursed,
               COALESCE(SUM(total_gross_amount), 0)::float AS total_payroll_gross,
               COALESCE(SUM(total_deductions_amount), 0)::float AS total_payroll_deductions,
               COUNT(*)::int AS total_payroll_runs
             FROM payroll_runs
             WHERE ${active('payroll_runs')} AND status IN ('PAID', 'DONE', 'DISBURSED')`,
            values,
            'payroll disbursed'
          ),
          safeQuery(
            `SELECT 
               COUNT(*)::int AS active_salary_structures_count,
               COALESCE(SUM(base_salary + housing_allowance + transport_allowance + medical_allowance + other_allowances), 0)::float AS monthly_payroll_commitment
             FROM salary_structures
             WHERE ${active('salary_structures')} AND is_active = TRUE`,
            values,
            'salary structures'
          ),
          safeQuery(
            `SELECT COUNT(*)::int AS pending_slips_count
             FROM bank_slip_submissions
             WHERE ${scope.schoolId ? '(school_id = $1 OR school_id IS NULL)' : 'TRUE'} AND status = 'PENDING'`,
            values,
            'pending bank slips'
          ),
          safeQuery(
            `SELECT currency_symbol, currency_code FROM finance_settings WHERE ${scope.schoolId ? '(school_id = $1 OR school_id IS NULL)' : 'TRUE'} LIMIT 1`,
            values,
            'finance settings'
          ),
          safeQuery(
            `SELECT id, batch_reference, month, year, total_staff_count, total_gross_amount, total_deductions_amount, total_net_amount, status, created_at, reviewed_at, closed_at
             FROM payroll_runs
             WHERE ${active('payroll_runs')}
             ORDER BY year DESC, month DESC, created_at DESC
             LIMIT 1`,
            values,
            'latest payroll run'
          ),
          safeQuery(
            `SELECT id, batch_reference, month, year, total_staff_count, total_gross_amount, total_deductions_amount, total_net_amount, status, created_at
             FROM payroll_runs
             WHERE ${active('payroll_runs')}
             ORDER BY year DESC, month DESC, created_at DESC
             LIMIT 5`,
            values,
            'recent payroll runs'
          ),
          safeQuery(
            `SELECT p.id, p.receipt_number, p.amount, p.payment_method, p.payment_date, p.created_at,
                    s.first_name AS student_first_name, s.last_name AS student_last_name, s.admission_number
             FROM fee_payments p
             LEFT JOIN students s ON s.id = p.student_id
             WHERE ${scope.schoolId ? '(p.school_id = $1 OR p.school_id IS NULL)' : 'TRUE'} AND p.deleted_at IS NULL
             ORDER BY p.payment_date DESC, p.created_at DESC
             LIMIT 4`,
            values,
            'recent fee payments'
          ),
          safeQuery(
            `SELECT e.id, e.voucher_number, e.title, e.payee, e.amount, e.payment_method, e.expense_date, e.status,
                    ec.name AS category_name
             FROM expenses e
             LEFT JOIN expense_categories ec ON ec.id = e.expense_category_id
             WHERE ${scope.schoolId ? '(e.school_id = $1 OR e.school_id IS NULL)' : 'TRUE'} AND e.deleted_at IS NULL
             ORDER BY e.expense_date DESC, e.created_at DESC
             LIMIT 4`,
            values,
            'recent expenses'
          ),
          safeQuery(
            `
            WITH months AS (
              SELECT generate_series(1, 12) AS month
            ),
            fee_coll AS (
              SELECT EXTRACT(MONTH FROM payment_date)::int AS month, SUM(amount) AS fee_amount
              FROM fee_payments
              WHERE ${scope.schoolId ? '(school_id = $1 OR school_id IS NULL)' : 'TRUE'} 
                AND deleted_at IS NULL 
                AND EXTRACT(YEAR FROM payment_date) = EXTRACT(YEAR FROM CURRENT_DATE)
              GROUP BY EXTRACT(MONTH FROM payment_date)
            ),
            other_inc AS (
              SELECT EXTRACT(MONTH FROM income_date)::int AS month, SUM(amount) AS other_inc_amount
              FROM incomes
              WHERE ${scope.schoolId ? '(school_id = $1 OR school_id IS NULL)' : 'TRUE'} 
                AND deleted_at IS NULL 
                AND EXTRACT(YEAR FROM income_date) = EXTRACT(YEAR FROM CURRENT_DATE)
              GROUP BY EXTRACT(MONTH FROM income_date)
            ),
            exp AS (
              SELECT EXTRACT(MONTH FROM expense_date)::int AS month, SUM(amount) AS exp_amount
              FROM expenses
              WHERE ${scope.schoolId ? '(school_id = $1 OR school_id IS NULL)' : 'TRUE'} 
                AND deleted_at IS NULL 
                AND status = 'APPROVED'
                AND EXTRACT(YEAR FROM expense_date) = EXTRACT(YEAR FROM CURRENT_DATE)
              GROUP BY EXTRACT(MONTH FROM expense_date)
            ),
            pay AS (
              SELECT pr.month, SUM(pr.total_net_amount) AS payroll_amount
              FROM payroll_runs pr
              WHERE ${scope.schoolId ? '(pr.school_id = $1 OR pr.school_id IS NULL)' : 'TRUE'} 
                AND pr.deleted_at IS NULL 
                AND pr.year = EXTRACT(YEAR FROM CURRENT_DATE)
                AND pr.status IN ('PAID', 'DONE', 'DISBURSED')
              GROUP BY pr.month
            )
            SELECT 
              m.month,
              COALESCE(fc.fee_amount, 0)::float AS fee_collections,
              COALESCE(oi.other_inc_amount, 0)::float AS direct_incomes,
              (COALESCE(fc.fee_amount, 0) + COALESCE(oi.other_inc_amount, 0))::float AS total_income,
              COALESCE(e.exp_amount, 0)::float AS operational_expenses,
              COALESCE(p.payroll_amount, 0)::float AS payroll_expenses,
              (COALESCE(e.exp_amount, 0) + COALESCE(p.payroll_amount, 0))::float AS total_expense,
              ((COALESCE(fc.fee_amount, 0) + COALESCE(oi.other_inc_amount, 0)) - (COALESCE(e.exp_amount, 0) + COALESCE(p.payroll_amount, 0)))::float AS net_profit_loss
            FROM months m
            LEFT JOIN fee_coll fc ON fc.month = m.month
            LEFT JOIN other_inc oi ON oi.month = m.month
            LEFT JOIN exp e ON e.month = m.month
            LEFT JOIN pay p ON p.month = m.month
            ORDER BY m.month ASC
            `,
            values,
            'monthly finance trend'
          ),
        ]);

        const attendance = attendanceSummary[0] || {};
        const performance = performanceSummary[0] || {};
        const activities = [
          ...recentStudents.map((row) => ({ id: `student-${row.id}`, title: 'New student record', description: `${row.first_name} ${row.last_name} was added`, timestamp: row.created_at })),
          ...recentTeachers.map((row) => ({ id: `teacher-${row.id}`, title: 'Teacher profile updated', description: `${row.first_name} ${row.last_name} joined the staff directory`, timestamp: row.created_at })),
          ...recentExams.map((row) => ({ id: `exam-${row.id}`, title: 'Assessment created', description: row.title, timestamp: row.created_at })),
        ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 6);

        // Process Finance & Payroll aggregates
        const inv = invoiceSummaryRows[0] || {};
        const totalInvoiced = Number(inv.total_invoiced || 0);
        const totalCollected = Number(inv.total_collected || 0);
        const totalOutstanding = Number(inv.total_outstanding || 0);
        const collectionEfficiency = totalInvoiced > 0 ? Math.round(((totalCollected / totalInvoiced) * 100) * 10) / 10 : 100;

        const totalOtherIncome = Number(incomeRows[0]?.total_other_income || 0);
        const totalExpenses = Number(expenseRows[0]?.total_expenses || 0);
        const totalPayroll = Number(payrollSummaryRows[0]?.total_payroll_disbursed || 0);
        const totalOutflow = totalExpenses + totalPayroll;
        const netCashFlow = (totalCollected + totalOtherIncome) - totalOutflow;
        const pendingBankSlipsCount = Number(bankSlipRows[0]?.pending_slips_count || 0);
        const currency = settingsRows[0]?.currency_symbol || 'ETB';

        const salaryStruct = salaryStructureRows[0] || {};
        const activeSalaryStructuresCount = Number(salaryStruct.active_salary_structures_count || 0);
        const monthlyPayrollCommitment = Number(salaryStruct.monthly_payroll_commitment || 0);

        const latestPayroll = latestPayrollRows[0] ? {
          id: latestPayrollRows[0].id,
          batchReference: latestPayrollRows[0].batch_reference,
          month: latestPayrollRows[0].month,
          year: latestPayrollRows[0].year,
          totalStaffCount: Number(latestPayrollRows[0].total_staff_count || 0),
          totalGrossAmount: Number(latestPayrollRows[0].total_gross_amount || 0),
          totalDeductionsAmount: Number(latestPayrollRows[0].total_deductions_amount || 0),
          totalNetAmount: Number(latestPayrollRows[0].total_net_amount || 0),
          status: latestPayrollRows[0].status,
          createdAt: latestPayrollRows[0].created_at,
          reviewedAt: latestPayrollRows[0].reviewed_at,
          closedAt: latestPayrollRows[0].closed_at,
        } : null;

        const recentPayrollRuns = (recentPayrollRunsRows || []).map((r) => ({
          id: r.id,
          batchReference: r.batch_reference,
          month: r.month,
          year: r.year,
          totalStaffCount: Number(r.total_staff_count || 0),
          totalGrossAmount: Number(r.total_gross_amount || 0),
          totalDeductionsAmount: Number(r.total_deductions_amount || 0),
          totalNetAmount: Number(r.total_net_amount || 0),
          status: r.status,
          createdAt: r.created_at,
        }));

        const recentPaymentsFormatted = (recentPaymentsRows || []).map((p) => ({
          id: p.id,
          receiptNumber: p.receipt_number,
          amount: Number(p.amount || 0),
          paymentMethod: p.payment_method,
          paymentDate: p.payment_date,
          studentName: `${p.student_first_name || ''} ${p.student_last_name || ''}`.trim() || 'Student',
          admissionNumber: p.admission_number,
          createdAt: p.created_at,
        }));

        const recentExpensesFormatted = (recentExpensesRows || []).map((e) => ({
          id: e.id,
          voucherNumber: e.voucher_number,
          title: e.title,
          payee: e.payee,
          amount: Number(e.amount || 0),
          paymentMethod: e.payment_method,
          expenseDate: e.expense_date,
          status: e.status,
          categoryName: e.category_name || 'General',
          createdAt: e.created_at,
        }));

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
          finance: {
            currency,
            totalInvoiced,
            totalCollected,
            totalOutstanding,
            collectionEfficiency,
            totalOtherIncome,
            totalExpenses,
            totalPayroll,
            totalOutflow,
            netCashFlow,
            pendingBankSlipsCount,
            totalInvoicesCount: Number(inv.total_invoices || 0),
            paidInvoicesCount: Number(inv.paid_invoices_count || 0),
            partialInvoicesCount: Number(inv.partial_invoices_count || 0),
            unpaidInvoicesCount: Number(inv.unpaid_invoices_count || 0),
            overdueInvoicesCount: Number(inv.overdue_invoices_count || 0),
            monthlyTrend: monthlyFinanceTrendRows || [],
            recentPayments: recentPaymentsFormatted,
            recentExpenses: recentExpensesFormatted,
          },
          payroll: {
            currency,
            activeSalaryStructuresCount,
            monthlyPayrollCommitment,
            totalDisbursedAllTime: totalPayroll,
            latestRun: latestPayroll,
            recentRuns: recentPayrollRuns,
          },
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
      getStudentDashboard,
      getParentDashboard,
      getTeacherDashboard,
    };
