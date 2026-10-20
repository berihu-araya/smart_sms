class AnalyticsRepository {
  constructor(database) {
    this.database = database;
  }

  /**
   * Helper to execute queries safely with fallback
   */
  async safeQuery(sql, params = [], label = 'query') {
    try {
      const result = await this.database.query(sql, params);
      return result.rows;
    } catch (err) {
      console.warn(`[AnalyticsRepository] Query failed (${label}):`, err.message);
      return [];
    }
  }

  /**
   * 1. Enrollment & Demographics Metrics
   */
  async getEnrollmentAnalytics(schoolId, academicYearId = null) {
    const schoolFilter = schoolId ? `AND s.school_id = $1` : '';
    const params = schoolId ? [schoolId] : [];

    // Total active, gender breakdown
    const studentsSql = `
      SELECT
        COUNT(*) AS total_students,
        COUNT(*) FILTER (WHERE LOWER(s.gender) = 'male') AS male_students,
        COUNT(*) FILTER (WHERE LOWER(s.gender) = 'female') AS female_students,
        COUNT(*) FILTER (WHERE LOWER(s.gender) NOT IN ('male', 'female') OR s.gender IS NULL) AS other_students
      FROM students s
      WHERE s.deleted_at IS NULL
        AND s.status = 'ACTIVE'
        ${schoolFilter}
    `;
    const studentsRes = await this.safeQuery(studentsSql, params, 'enrollment counts');
    const counts = studentsRes[0] || { total_students: 0, male_students: 0, female_students: 0, other_students: 0 };

    // Grade-level enrollment distribution
    const gradeSql = `
      SELECT
        g.id AS grade_id,
        g.name AS grade_name,
        COUNT(s.id) AS student_count
      FROM grades g
      LEFT JOIN sections sec ON sec.grade_id = g.id AND sec.deleted_at IS NULL
      LEFT JOIN students s ON s.section_id = sec.id AND s.deleted_at IS NULL AND s.status = 'ACTIVE'
      WHERE g.deleted_at IS NULL
        ${schoolId ? 'AND g.school_id = $1' : ''}
      GROUP BY g.id, g.name
      ORDER BY g.name ASC
    `;
    const gradeDistribution = await this.safeQuery(gradeSql, params, 'grade distribution');

    // Section classroom capacity utilization
    const sectionSql = `
      SELECT
        sec.id AS section_id,
        sec.name AS section_name,
        g.name AS grade_name,
        COALESCE(sec.capacity, 40) AS capacity,
        COUNT(s.id) AS enrolled_students,
        CASE
          WHEN COALESCE(sec.capacity, 40) > 0 THEN
            ROUND((COUNT(s.id)::numeric / COALESCE(sec.capacity, 40)::numeric) * 100, 1)
          ELSE 0
        END AS utilization_rate
      FROM sections sec
      JOIN grades g ON g.id = sec.grade_id AND g.deleted_at IS NULL
      LEFT JOIN students s ON s.section_id = sec.id AND s.deleted_at IS NULL AND s.status = 'ACTIVE'
      WHERE sec.deleted_at IS NULL
        ${schoolId ? 'AND sec.school_id = $1' : ''}
      GROUP BY sec.id, sec.name, g.name, sec.capacity
      ORDER BY g.name ASC, sec.name ASC
    `;
    const sectionCapacity = await this.safeQuery(sectionSql, params, 'section capacity');

    // Monthly admission velocity (last 12 months)
    const velocitySql = `
      SELECT
        TO_CHAR(COALESCE(s.admission_date, s.created_at::date), 'YYYY-MM') AS month_key,
        TO_CHAR(COALESCE(s.admission_date, s.created_at::date), 'Mon YYYY') AS month_label,
        COUNT(*) AS count
      FROM students s
      WHERE s.deleted_at IS NULL
        AND s.status = 'ACTIVE'
        AND COALESCE(s.admission_date, s.created_at::date) >= CURRENT_DATE - INTERVAL '12 months'
        ${schoolFilter}
      GROUP BY month_key, month_label
      ORDER BY month_key ASC
    `;
    const admissionVelocity = await this.safeQuery(velocitySql, params, 'admission velocity');

    return {
      totalStudents: Number(counts.total_students || 0),
      genderDistribution: {
        male: Number(counts.male_students || 0),
        female: Number(counts.female_students || 0),
        other: Number(counts.other_students || 0),
        malePercentage: counts.total_students > 0 ? Math.round((counts.male_students / counts.total_students) * 100) : 0,
        femalePercentage: counts.total_students > 0 ? Math.round((counts.female_students / counts.total_students) * 100) : 0,
      },
      gradeDistribution: gradeDistribution.map((g) => ({
        gradeId: g.grade_id,
        gradeName: g.grade_name,
        count: Number(g.student_count || 0),
      })),
      sectionCapacity: sectionCapacity.map((s) => {
        const rate = Number(s.utilization_rate || 0);
        let status = 'OPTIMAL';
        if (rate > 100) status = 'OVERCROWDED';
        else if (rate < 60) status = 'UNDER_ENROLLED';

        return {
          sectionId: s.section_id,
          sectionName: s.section_name,
          gradeName: s.grade_name,
          capacity: Number(s.capacity || 40),
          enrolled: Number(s.enrolled_students || 0),
          utilizationRate: rate,
          status,
        };
      }),
      admissionVelocity: admissionVelocity.map((v) => ({
        month: v.month_label,
        count: Number(v.count || 0),
      })),
    };
  }

  /**
   * 2. Faculty & Staffing Metrics (Student-to-Teacher Ratio)
   */
  async getFacultyAnalytics(schoolId) {
    const schoolFilter = schoolId ? `AND t.school_id = $1` : '';
    const params = schoolId ? [schoolId] : [];

    // Total active faculty
    const facultySql = `
      SELECT
        COUNT(*) AS total_teachers,
        COUNT(*) FILTER (WHERE LOWER(t.gender) = 'male') AS male_teachers,
        COUNT(*) FILTER (WHERE LOWER(t.gender) = 'female') AS female_teachers
      FROM teachers t
      WHERE t.deleted_at IS NULL
        AND t.status = 'ACTIVE'
        ${schoolFilter}
    `;
    const facultyRes = await this.safeQuery(facultySql, params, 'faculty counts');
    const counts = facultyRes[0] || { total_teachers: 0, male_teachers: 0, female_teachers: 0 };

    // Departmental distribution
    const deptSql = `
      SELECT
        COALESCE(NULLIF(TRIM(t.department), ''), 'General Academics') AS department_name,
        COUNT(*) AS teacher_count
      FROM teachers t
      WHERE t.deleted_at IS NULL
        AND t.status = 'ACTIVE'
        ${schoolFilter}
      GROUP BY department_name
      ORDER BY teacher_count DESC
    `;
    const departmentDistribution = await this.safeQuery(deptSql, params, 'teacher departments');

    // Subject allocation coverage (% of subjects having at least one active teacher assigned)
    const subjectCoverageSql = `
      SELECT
        COUNT(DISTINCT sub.id) AS total_subjects,
        COUNT(DISTINCT ts.subject_id) AS allocated_subjects
      FROM subjects sub
      LEFT JOIN teacher_subjects ts ON ts.subject_id = sub.id AND ts.deleted_at IS NULL
      WHERE sub.deleted_at IS NULL
        ${schoolId ? 'AND sub.school_id = $1' : ''}
    `;
    const subjectRes = await this.safeQuery(subjectCoverageSql, params, 'subject coverage');
    const subStats = subjectRes[0] || { total_subjects: 0, allocated_subjects: 0 };

    return {
      totalTeachers: Number(counts.total_teachers || 0),
      genderDistribution: {
        male: Number(counts.male_teachers || 0),
        female: Number(counts.female_teachers || 0),
      },
      departments: departmentDistribution.map((d) => ({
        department: d.department_name,
        count: Number(d.teacher_count || 0),
      })),
      subjectCoverage: {
        totalSubjects: Number(subStats.total_subjects || 0),
        allocatedSubjects: Number(subStats.allocated_subjects || 0),
        coveragePercentage:
          subStats.total_subjects > 0
            ? Math.round((subStats.allocated_subjects / subStats.total_subjects) * 100)
            : 100,
      },
    };
  }

  /**
   * 3. Academic Performance Index
   */
  async getAcademicHealthIndex(schoolId, academicYearId = null) {
    const params = [];
    let pIdx = 1;
    let whereClause = 'm.deleted_at IS NULL AND e.deleted_at IS NULL';

    if (schoolId) {
      whereClause += ` AND (g.school_id = $${pIdx} OR e.school_id = $${pIdx})`;
      params.push(schoolId);
      pIdx++;
    }

    if (academicYearId) {
      whereClause += ` AND e.academic_year_id = $${pIdx}`;
      params.push(academicYearId);
      pIdx++;
    }

    const sql = `
      SELECT
        COUNT(*) AS total_marks_recorded,
        ROUND(AVG(m.score), 1) AS mean_score,
        COUNT(*) FILTER (WHERE m.score >= 50) AS passing_marks,
        COUNT(*) FILTER (WHERE m.score < 50) AS failing_marks
      FROM marks m
      JOIN exams e ON e.id = m.exam_id
      LEFT JOIN grades g ON g.id = e.grade_id
      WHERE ${whereClause}
    `;
    const res = await this.safeQuery(sql, params, 'academic index');
    const stats = res[0] || { total_marks_recorded: 0, mean_score: 0, passing_marks: 0, failing_marks: 0 };

    const total = Number(stats.total_marks_recorded || 0);
    const passing = Number(stats.passing_marks || 0);
    const passRate = total > 0 ? Math.round((passing / total) * 100) : 100;

    return {
      totalMarksRecorded: total,
      meanScore: Number(stats.mean_score || 0),
      passRate,
      academicIndex: passRate,
    };
  }

  /**
   * 4. Attendance Health Index
   */
  async getAttendanceHealthIndex(schoolId) {
    const params = schoolId ? [schoolId] : [];
    const sql = `
      SELECT
        COUNT(*) AS total_sessions,
        COUNT(*) FILTER (WHERE a.status = 'PRESENT') AS present_count,
        COUNT(*) FILTER (WHERE a.status = 'ABSENT') AS absent_count,
        COUNT(*) FILTER (WHERE a.status = 'LATE') AS late_count
      FROM attendance a
      JOIN students s ON s.id = a.student_id AND s.deleted_at IS NULL
      WHERE a.deleted_at IS NULL
        ${schoolId ? 'AND s.school_id = $1' : ''}
    `;
    const res = await this.safeQuery(sql, params, 'attendance health');
    const stats = res[0] || { total_sessions: 0, present_count: 0, absent_count: 0, late_count: 0 };

    const total = Number(stats.total_sessions || 0);
    const present = Number(stats.present_count || 0);
    const attendanceRate = total > 0 ? Math.round((present / total) * 100) : 100;

    return {
      totalSessions: total,
      presentCount: present,
      absentCount: Number(stats.absent_count || 0),
      lateCount: Number(stats.late_count || 0),
      attendanceRate,
    };
  }

  /**
   * 5. Financial Health Index
   */
  async getFinancialHealthIndex(schoolId) {
    const params = schoolId ? [schoolId] : [];

    const invoiceSql = `
      SELECT
        COALESCE(SUM(total_amount), 0) AS total_invoiced,
        COALESCE(SUM(paid_amount), 0) AS total_collected,
        COALESCE(SUM(balance_amount), 0) AS total_outstanding
      FROM student_fee_invoices
      WHERE deleted_at IS NULL
        ${schoolId ? 'AND school_id = $1' : ''}
    `;
    const invoiceRes = await this.safeQuery(invoiceSql, params, 'financial index invoices');
    const inv = invoiceRes[0] || { total_invoiced: 0, total_collected: 0, total_outstanding: 0 };

    const invoiced = Number(inv.total_invoiced || 0);
    const collected = Number(inv.total_collected || 0);
    const outstanding = Number(inv.total_outstanding || 0);
    const collectionEfficiency = invoiced > 0 ? Math.round((collected / invoiced) * 100) : 100;

    const expenseSql = `
      SELECT COALESCE(SUM(amount), 0) AS total_expenses
      FROM expenses
      WHERE deleted_at IS NULL
        ${schoolId ? 'AND school_id = $1' : ''}
    `;
    const expRes = await this.safeQuery(expenseSql, params, 'financial index expenses');
    const totalExpenses = Number(expRes[0]?.total_expenses || 0);

    return {
      totalInvoiced: invoiced,
      totalCollected: collected,
      totalOutstanding: outstanding,
      totalExpenses,
      collectionEfficiency,
      netOperatingMargin: collected - totalExpenses,
    };
  }

  /**
   * 6. 360° Multi-Risk Early Warning Radar
   * Joins Academics + Attendance + Financial Invoices to identify compounded student vulnerability
   */
  async getMultiRiskStudents(schoolId, limit = 25) {
    const params = schoolId ? [schoolId, limit] : [limit];
    const schoolFilter = schoolId ? `AND s.school_id = $1` : '';
    const limitParam = schoolId ? `$2` : `$1`;

    const sql = `
      WITH student_academic AS (
        SELECT
          m.student_id,
          ROUND(AVG(m.score), 1) AS avg_score,
          COUNT(*) FILTER (WHERE m.score < 50) AS failed_subjects_count
        FROM marks m
        WHERE m.deleted_at IS NULL
        GROUP BY m.student_id
      ),
      student_attendance AS (
        SELECT
          a.student_id,
          COUNT(*) AS total_marked,
          COUNT(*) FILTER (WHERE a.status = 'PRESENT') AS present_count,
          COUNT(*) FILTER (WHERE a.status = 'ABSENT') AS absent_count,
          CASE
            WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE a.status = 'PRESENT')::numeric / COUNT(*)::numeric) * 100, 1)
            ELSE 100
          END AS att_rate
        FROM attendance a
        WHERE a.deleted_at IS NULL
        GROUP BY a.student_id
      ),
      student_finance AS (
        SELECT
          sfi.student_id,
          COALESCE(SUM(sfi.balance_amount), 0) AS fee_balance
        FROM student_fee_invoices sfi
        WHERE sfi.deleted_at IS NULL
        GROUP BY sfi.student_id
      )
      SELECT
        s.id AS student_id,
        s.admission_number,
        s.first_name,
        s.last_name,
        g.name AS grade_name,
        sec.name AS section_name,
        p.full_name AS parent_name,
        p.phone AS parent_phone,
        COALESCE(sa.avg_score, 0) AS academic_avg_score,
        COALESCE(satt.att_rate, 100) AS attendance_rate,
        COALESCE(satt.absent_count, 0) AS total_absent_days,
        COALESCE(sf.fee_balance, 0) AS outstanding_fees,
        CASE
          WHEN COALESCE(sa.avg_score, 100) < 50 AND COALESCE(satt.att_rate, 100) < 75 AND COALESCE(sf.fee_balance, 0) > 0 THEN 'TRIPLE_RISK'
          WHEN (COALESCE(sa.avg_score, 100) < 50 AND COALESCE(satt.att_rate, 100) < 75) THEN 'ACADEMIC_ATTENDANCE'
          WHEN (COALESCE(sa.avg_score, 100) < 50 AND COALESCE(sf.fee_balance, 0) > 0) THEN 'ACADEMIC_FINANCIAL'
          WHEN (COALESCE(satt.att_rate, 100) < 75 AND COALESCE(sf.fee_balance, 0) > 0) THEN 'ATTENDANCE_FINANCIAL'
          WHEN COALESCE(sa.avg_score, 100) < 50 THEN 'ACADEMIC_ONLY'
          WHEN COALESCE(satt.att_rate, 100) < 75 THEN 'ATTENDANCE_ONLY'
          ELSE 'FINANCIAL_ONLY'
        END AS risk_tier
      FROM students s
      JOIN sections sec ON sec.id = s.section_id AND sec.deleted_at IS NULL
      JOIN grades g ON g.id = sec.grade_id AND g.deleted_at IS NULL
      LEFT JOIN parents p ON p.id = s.parent_id AND p.deleted_at IS NULL
      LEFT JOIN student_academic sa ON sa.student_id = s.id
      LEFT JOIN student_attendance satt ON satt.student_id = s.id
      LEFT JOIN student_finance sf ON sf.student_id = s.id
      WHERE s.deleted_at IS NULL
        AND s.status = 'ACTIVE'
        ${schoolFilter}
        AND (
          COALESCE(sa.avg_score, 100) < 50
          OR COALESCE(satt.att_rate, 100) < 75
          OR COALESCE(sf.fee_balance, 0) > 0
        )
      ORDER BY
        (CASE
          WHEN COALESCE(sa.avg_score, 100) < 50 AND COALESCE(satt.att_rate, 100) < 75 AND COALESCE(sf.fee_balance, 0) > 0 THEN 1
          WHEN (COALESCE(sa.avg_score, 100) < 50 AND COALESCE(satt.att_rate, 100) < 75) THEN 2
          ELSE 3
        END) ASC,
        COALESCE(sa.avg_score, 100) ASC,
        COALESCE(satt.att_rate, 100) ASC
      LIMIT ${limitParam}
    `;
    const rows = await this.safeQuery(sql, params, 'multi-risk radar');
    return rows.map((r) => ({
      studentId: r.student_id,
      admissionNumber: r.admission_number,
      name: `${r.first_name} ${r.last_name}`,
      gradeName: r.grade_name,
      sectionName: r.section_name,
      parentName: r.parent_name || 'Not on file',
      parentPhone: r.parent_phone || '—',
      academicAvgScore: Number(r.academic_avg_score || 0),
      attendanceRate: Number(r.attendance_rate || 0),
      absentDays: Number(r.total_absent_days || 0),
      outstandingFees: Number(r.outstanding_fees || 0),
      riskTier: r.risk_tier,
    }));
  }

  /**
   * 7. Multi-Year Longitudinal Benchmarking
   */
  async getLongitudinalTrends(schoolId) {
    const params = schoolId ? [schoolId] : [];
    const sql = `
      SELECT
        ay.id AS year_id,
        ay.name AS year_name,
        ay.is_active,
        ay.start_date,
        ay.end_date,
        (
          SELECT COUNT(DISTINCT s.id)
          FROM students s
          WHERE s.deleted_at IS NULL
            ${schoolId ? 'AND s.school_id = $1' : ''}
            AND s.admission_date <= ay.end_date
        ) AS estimated_enrollment,
        (
          SELECT COALESCE(ROUND(AVG(m.score), 1), 0)
          FROM marks m
          JOIN exams e ON e.id = m.exam_id
          WHERE m.deleted_at IS NULL
            AND e.academic_year_id = ay.id
            ${schoolId ? 'AND (e.school_id = $1 OR e.school_id IS NULL)' : ''}
        ) AS avg_academic_score,
        (
          SELECT COALESCE(SUM(sfi.paid_amount), 0)
          FROM student_fee_invoices sfi
          WHERE sfi.deleted_at IS NULL
            AND sfi.academic_year_id = ay.id
            ${schoolId ? 'AND sfi.school_id = $1' : ''}
        ) AS revenue_collected
      FROM academic_years ay
      WHERE ay.deleted_at IS NULL
        ${schoolId ? 'AND (ay.school_id = $1 OR ay.school_id IS NULL)' : ''}
      ORDER BY ay.start_date ASC
      LIMIT 5
    `;
    const rows = await this.safeQuery(sql, params, 'longitudinal trends');
    return rows.map((r) => ({
      yearId: r.year_id,
      yearName: r.year_name,
      isActive: r.is_active,
      enrollment: Number(r.estimated_enrollment || 0),
      academicScore: Number(r.avg_academic_score || 0),
      revenueCollected: Number(r.revenue_collected || 0),
    }));
  }
}

module.exports = AnalyticsRepository;
