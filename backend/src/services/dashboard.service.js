const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function buildDashboardPayload(data = {}) {
  const finance = data.finance || {};
  const payroll = data.payroll || {};
  const currentYear = new Date().getFullYear();

  // Normalize monthly finance trend
  const rawTrend = Array.isArray(finance.monthlyTrend) ? finance.monthlyTrend : [];
  const monthlyTrend = rawTrend.map((row, idx) => {
    const monthNum = Number(row.month || idx + 1);
    const label = row.label || MONTH_NAMES[monthNum - 1] || `M${monthNum}`;
    const feeCollections = Number(row.fee_collections ?? row.feeCollections ?? 0);
    const directIncomes = Number(row.direct_incomes ?? row.directIncomes ?? 0);
    const income = Number(row.income ?? row.total_income ?? (feeCollections + directIncomes));
    const operationalExpenses = Number(row.operational_expenses ?? row.operationalExpenses ?? 0);
    const payrollExpenses = Number(row.payroll_expenses ?? row.payrollExpenses ?? 0);
    const expense = Number(row.expense ?? row.total_expense ?? (operationalExpenses + payrollExpenses));
    const net = Number(row.net_profit_loss ?? row.net ?? (income - expense));

    return {
      key: `trend-${row.year || currentYear}-${monthNum}`,
      month: monthNum,
      year: Number(row.year || currentYear),
      label,
      income,
      expense,
      net,
      feeCollections,
      directIncomes,
      operationalExpenses,
      payrollExpenses,
    };
  });

  const totalInvoiced = Number(finance.totalInvoiced ?? finance.totalFeesInvoiced ?? 0);
  const totalCollected = Number(finance.totalCollected ?? finance.totalFeesCollected ?? 0);
  const totalOutstanding = Number(finance.totalOutstanding ?? finance.totalFeesOutstanding ?? (totalInvoiced - totalCollected));
  const collectionEfficiency = totalInvoiced > 0
    ? Math.min(100, Math.max(0, Math.round(((totalCollected / totalInvoiced) * 100) * 10) / 10))
    : 100;

  const totalOtherIncome = Number(finance.totalOtherIncome ?? 0);
  const totalExpenses = Number(finance.totalExpenses ?? 0);
  const totalPayroll = Number(finance.totalPayroll ?? payroll.totalDisbursedAllTime ?? 0);
  const totalOutflow = Number(finance.totalOutflow ?? (totalExpenses + totalPayroll));
  const totalIncome = Number(finance.totalIncome ?? (totalCollected + totalOtherIncome));
  const netCashFlow = Number(finance.netCashFlow ?? (totalIncome - totalOutflow));
  const currency = finance.currency || 'ETB';

  return {
    isStudent: false,
    stats: {
      totalStudents: Number(data.students ?? 0),
      totalTeachers: Number(data.teachers ?? 0),
      totalSchools: Number(data.schools ?? 0),
      totalAcademicYears: Number(data.academicYears ?? data.schools ?? 0),
      totalSections: Number(data.sections ?? 0),
      activeEnrollments: Number(data.enrollments ?? data.students ?? 0),
      currentTerm: data.term ?? 'Current Term',
      pendingTasks: Number(data.pendingTasks ?? 0),
      attendanceRate: Number(data.attendanceRate ?? 0),
      averageScore: Number(data.averageScore ?? 0),
      passRate: Number(data.passRate ?? 0),
      publishedExams: Number(data.publishedExams ?? 0),

      // Finance & Payroll Summary Stats
      currency,
      totalFeesInvoiced: totalInvoiced,
      totalFeesCollected: totalCollected,
      totalFeesOutstanding: totalOutstanding,
      collectionEfficiency,
      totalOtherIncome,
      totalExpenses,
      totalPayrollDisbursed: totalPayroll,
      totalOutflow,
      netCashFlow,
      pendingBankSlipsCount: Number(finance.pendingBankSlipsCount ?? 0),
      staffOnPayrollCount: Number(payroll.activeSalaryStructuresCount ?? 0),
      monthlyPayrollCommitment: Number(payroll.monthlyPayrollCommitment ?? 0),
    },
    attendance: {
      rate: Number(data.attendanceRate ?? 0),
      present: Number(data.attendancePresent ?? 0),
      absent: Number(data.attendanceAbsent ?? 0),
      late: Number(data.attendanceLate ?? 0),
      excused: Number(data.attendanceExcused ?? 0),
      trend: (data.attendanceTrend ?? []).map((point, index) => ({
        key: `att-trend-${index}-${point.label || ''}`,
        label: point.label || `W${index + 1}`,
        rate: Number(point.rate ?? 0),
      })),
    },
    performance: {
      averageScore: Number(data.averageScore ?? 0),
      passRate: Number(data.passRate ?? 0),
      distribution: (data.performanceDistribution ?? []).map((item, index) => ({
        key: `perf-dist-${index}-${item.label || ''}`,
        label: item.label || `Group ${index + 1}`,
        count: Number(item.count ?? 0),
      })),
    },
    finance: {
      currency,
      summary: {
        totalFeesInvoiced: totalInvoiced,
        totalFeesCollected: totalCollected,
        totalFeesOutstanding: totalOutstanding,
        totalInvoiced,
        totalCollected,
        totalOutstanding,
        collectionEfficiency,
        totalOtherIncome,
        totalIncome,
        totalExpenses,
        totalPayroll,
        totalOutflow,
        netCashFlow,
        pendingBankSlipsCount: Number(finance.pendingBankSlipsCount ?? 0),
      },
      invoices: {
        totalInvoices: Number(finance.totalInvoicesCount ?? finance.invoices?.totalInvoices ?? 0),
        paidCount: Number(finance.paidInvoicesCount ?? finance.invoices?.paidCount ?? 0),
        partiallyPaidCount: Number(finance.partialInvoicesCount ?? finance.invoices?.partiallyPaidCount ?? 0),
        unpaidCount: Number(finance.unpaidInvoicesCount ?? finance.invoices?.unpaidCount ?? 0),
        overdueCount: Number(finance.overdueInvoicesCount ?? finance.invoices?.overdueCount ?? 0),
        totalInvoiced,
        totalPaid: totalCollected,
        totalBalance: totalOutstanding,
      },
      pendingBankSlipsCount: Number(finance.pendingBankSlipsCount ?? 0),
      monthlyTrend,
      recentPayments: (finance.recentPayments || []).map((p, index) => ({
        id: p.id || `pay-${index}`,
        receiptNumber: p.receiptNumber || p.receipt_number || null,
        amount: Number(p.amount ?? 0),
        paymentMethod: p.paymentMethod || p.payment_method || 'Direct Payment',
        paymentDate: p.paymentDate || p.payment_date || p.createdAt || p.created_at || null,
        studentName: p.studentName || p.student_name || 'Student',
        admissionNumber: p.admissionNumber || p.admission_number || null,
        createdAt: p.createdAt || p.created_at || null,
      })),
      recentExpenses: (finance.recentExpenses || []).map((e, index) => ({
        id: e.id || `exp-${index}`,
        voucherNumber: e.voucherNumber || e.voucher_number || null,
        title: e.title || e.categoryName || 'Operational Expense',
        payee: e.payee || null,
        amount: Number(e.amount ?? 0),
        paymentMethod: e.paymentMethod || e.payment_method || 'Cash',
        expenseDate: e.expenseDate || e.expense_date || e.createdAt || e.created_at || null,
        categoryName: e.categoryName || e.category_name || 'General',
        status: e.status || 'APPROVED',
        createdAt: e.createdAt || e.created_at || null,
      })),
    },
    payroll: {
      currency,
      activeSalaryStructuresCount: Number(payroll.activeSalaryStructuresCount ?? 0),
      monthlyPayrollCommitment: Number(payroll.monthlyPayrollCommitment ?? 0),
      totalDisbursedAllTime: Number(payroll.totalDisbursedAllTime ?? totalPayroll),
      latestRun: payroll.latestRun ? {
        id: payroll.latestRun.id,
        batch_reference: payroll.latestRun.batchReference || payroll.latestRun.batch_reference || `Batch #${payroll.latestRun.id}`,
        month: Number(payroll.latestRun.month ?? 1),
        year: Number(payroll.latestRun.year ?? currentYear),
        total_staff_count: Number(payroll.latestRun.totalStaffCount ?? payroll.latestRun.total_staff_count ?? 0),
        total_gross_amount: Number(payroll.latestRun.totalGrossAmount ?? payroll.latestRun.total_gross_amount ?? 0),
        total_deductions_amount: Number(payroll.latestRun.totalDeductionsAmount ?? payroll.latestRun.total_deductions_amount ?? 0),
        total_net_amount: Number(payroll.latestRun.totalNetAmount ?? payroll.latestRun.total_net_amount ?? 0),
        status: payroll.latestRun.status || 'DRAFT',
        created_at: payroll.latestRun.createdAt || payroll.latestRun.created_at || null,
      } : null,
      recentRuns: (payroll.recentRuns || []).map((r, index) => ({
        id: r.id || `run-${index}`,
        batch_reference: r.batchReference || r.batch_reference || `Batch #${r.id || index + 1}`,
        month: Number(r.month ?? 1),
        year: Number(r.year ?? currentYear),
        total_staff_count: Number(r.totalStaffCount ?? r.total_staff_count ?? 0),
        total_gross_amount: Number(r.totalGrossAmount ?? r.total_gross_amount ?? 0),
        total_deductions_amount: Number(r.totalDeductionsAmount ?? r.total_deductions_amount ?? 0),
        total_net_amount: Number(r.totalNetAmount ?? r.total_net_amount ?? 0),
        status: r.status || 'DRAFT',
        created_at: r.createdAt || r.created_at || null,
      })),
    },
    enrollmentTrend: (data.enrollmentTrend ?? []).map((item, index) => ({
      key: `enr-${index}-${item.label || ''}`,
      label: item.label || `M${index + 1}`,
      count: Number(item.count ?? 0),
    })),
    sectionOverview: (data.sectionOverview ?? []).map((section, index) => ({
      id: section.id || `sec-${index}`,
      name: section.name || `Section ${index + 1}`,
      students: Number(section.students ?? 0),
    })),
    schoolsOverview: (data.schoolRows ?? []).map((school, index) => ({
      id: school.id || `sch-${index}`,
      name: school.name || 'School',
      studentCount: Number(school.studentCount ?? 0),
      teacherCount: Number(school.teacherCount ?? 0),
      gradeCount: Number(school.gradeCount ?? 0),
      enrollmentRate: Number(school.enrollmentRate ?? 0),
    })),
    recentActivity: (data.activities ?? []).map((activity, index) => ({
      id: activity.id || `act-${index}`,
      title: activity.title || 'System Activity',
      description: activity.description || '',
      timestamp: activity.timestamp || new Date().toISOString(),
    })),
  };
}

function buildStudentDashboardPayload(data = {}) {
  const student = data.student || {};
  const attendance = data.attendance || {};
  const marks = data.marks || [];
  const assignments = data.assignments || [];
  const exams = data.exams || [];
  const todaySchedule = data.todaySchedule || [];
  const subjects = data.subjects || [];
  const finance = data.finance || {};

  const pendingAssignments = assignments.filter((a) => !a.submission_status || a.submission_status === 'NOT_SUBMITTED' || a.submission_status === 'DRAFT');
  const submittedAssignments = assignments.filter((a) => a.submission_status === 'SUBMITTED' || a.submission_status === 'GRADED' || a.submission_status === 'LATE');

  const validScores = marks.filter((m) => m.score !== null && m.score !== undefined).map((m) => Number(m.percentage || (m.max_marks ? (m.score / m.max_marks) * 100 : m.score)));
  const averagePercentage = validScores.length ? Math.round((validScores.reduce((acc, v) => acc + v, 0) / validScores.length) * 10) / 10 : 0;

  const totalAtt = Number(attendance.total || 0);
  const presentAtt = Number(attendance.present || 0);
  const lateAtt = Number(attendance.late || 0);
  const absentAtt = Number(attendance.absent || 0);
  const excusedAtt = Number(attendance.excused || 0);
  const attendanceRate = totalAtt > 0 ? Math.round(((presentAtt + lateAtt) / totalAtt) * 1000) / 10 : 100;

  const totalFeeInvoiced = Number(finance.totalInvoiced ?? 0);
  const totalFeePaid = Number(finance.totalPaid ?? 0);
  const outstandingFeeBalance = Number(finance.outstandingBalance ?? (totalFeeInvoiced - totalFeePaid));

  return {
    isStudent: true,
    student: {
      id: student.id,
      admissionNumber: student.admission_number,
      firstName: student.first_name,
      lastName: student.last_name,
      name: `${student.first_name || ''} ${student.last_name || ''}`.trim(),
      gender: student.gender,
      rollNumber: student.roll_number,
      dateOfBirth: student.date_of_birth,
      status: student.status,
      gradeId: student.grade_id,
      gradeName: student.grade_name,
      sectionId: student.section_id,
      sectionName: student.section_name,
      roomNumber: student.room_number,
      schoolName: student.school_name,
    },
    stats: {
      enrolledSubjectsCount: subjects.length,
      attendanceRate,
      averageScore: averagePercentage,
      pendingAssignmentsCount: pendingAssignments.length,
      submittedAssignmentsCount: submittedAssignments.length,
      upcomingExamsCount: exams.length,
      todayClassesCount: todaySchedule.filter((s) => s.period_type === 'LESSON' || !s.period_type).length,
      totalFeeInvoiced,
      totalFeePaid,
      outstandingFeeBalance,
    },
    attendance: {
      rate: attendanceRate,
      total: totalAtt,
      present: presentAtt,
      absent: absentAtt,
      late: lateAtt,
      excused: excusedAtt,
      trend: (data.attendanceTrend || []).map((point, index) => ({
        key: `att-trend-${index}-${point.label || ''}`,
        label: point.label || `W${index + 1}`,
        rate: Number(point.rate ?? 0),
      })),
    },
    feeSummary: {
      currency: finance.currency || 'ETB',
      totalInvoiced: totalFeeInvoiced,
      totalPaid: totalFeePaid,
      totalBalance: outstandingFeeBalance,
      pendingInvoicesCount: Number(finance.pendingInvoicesCount ?? 0),
      paidInvoicesCount: Number(finance.paidInvoicesCount ?? 0),
      recentInvoices: finance.recentInvoices || [],
    },
    subjects,
    todaySchedule: todaySchedule.map((item, index) => ({
      ...item,
      id: item.id || `sched-${index}`,
    })),
    assignments: assignments.slice(0, 8).map((a, index) => ({
      ...a,
      id: a.id || `asg-${index}`,
    })),
    upcomingExams: exams.slice(0, 8).map((e, index) => ({
      ...e,
      id: e.id || `exam-${index}`,
    })),
    recentMarks: marks.slice(0, 8).map((m, index) => ({
      ...m,
      id: m.id || `mark-${index}`,
    })),
  };
}

function buildParentDashboardPayload(data = {}) {
  const parent = data.parent || {};
  const childrenData = data.childrenData || [];

  let totalPendingHomework = 0;
  let totalUpcomingExams = 0;
  let totalClassesToday = 0;
  let sumAttendanceRates = 0;
  let sumAverageScores = 0;
  let totalChildFeeBalance = 0;
  let totalChildFeePaid = 0;
  let totalChildFeeInvoiced = 0;

  const processedChildren = childrenData.map((cd, childIdx) => {
    const student = cd.student || {};
    const attendance = cd.attendance || {};
    const marks = cd.marks || [];
    const assignments = cd.assignments || [];
    const exams = cd.exams || [];
    const todaySchedule = cd.todaySchedule || [];
    const subjects = cd.subjects || [];
    const finance = cd.finance || {};

    const pendingAssignments = assignments.filter((a) => !a.submission_status || a.submission_status === 'NOT_SUBMITTED' || a.submission_status === 'DRAFT');
    const submittedAssignments = assignments.filter((a) => a.submission_status === 'SUBMITTED' || a.submission_status === 'GRADED' || a.submission_status === 'LATE');

    const validScores = marks.filter((m) => m.score !== null && m.score !== undefined).map((m) => Number(m.percentage || (m.max_marks ? (m.score / m.max_marks) * 100 : m.score)));
    const averagePercentage = validScores.length ? Math.round((validScores.reduce((acc, v) => acc + v, 0) / validScores.length) * 10) / 10 : 0;

    const totalAtt = Number(attendance.total || 0);
    const presentAtt = Number(attendance.present || 0);
    const lateAtt = Number(attendance.late || 0);
    const absentAtt = Number(attendance.absent || 0);
    const excusedAtt = Number(attendance.excused || 0);
    const attendanceRate = totalAtt > 0 ? Math.round(((presentAtt + lateAtt) / totalAtt) * 1000) / 10 : 100;

    const childInvoiced = Number(finance.totalInvoiced ?? 0);
    const childPaid = Number(finance.totalPaid ?? 0);
    const childBalance = Number(finance.outstandingBalance ?? (childInvoiced - childPaid));

    totalPendingHomework += pendingAssignments.length;
    totalUpcomingExams += exams.length;
    totalClassesToday += todaySchedule.filter((s) => s.period_type === 'LESSON' || !s.period_type).length;
    sumAttendanceRates += attendanceRate;
    sumAverageScores += averagePercentage;
    totalChildFeeInvoiced += childInvoiced;
    totalChildFeePaid += childPaid;
    totalChildFeeBalance += childBalance;

    return {
      id: student.id || `child-${childIdx}`,
      admissionNumber: student.admission_number,
      firstName: student.first_name,
      lastName: student.last_name,
      name: `${student.first_name || ''} ${student.last_name || ''}`.trim(),
      gender: student.gender,
      rollNumber: student.roll_number,
      dateOfBirth: student.date_of_birth,
      status: student.status,
      gradeId: student.grade_id,
      gradeName: student.grade_name,
      sectionId: student.section_id,
      sectionName: student.section_name,
      roomNumber: student.room_number,
      schoolName: student.school_name,
      stats: {
        enrolledSubjectsCount: subjects.length,
        attendanceRate,
        averageScore: averagePercentage,
        pendingAssignmentsCount: pendingAssignments.length,
        submittedAssignmentsCount: submittedAssignments.length,
        upcomingExamsCount: exams.length,
        todayClassesCount: todaySchedule.filter((s) => s.period_type === 'LESSON' || !s.period_type).length,
        totalFeeInvoiced: childInvoiced,
        totalFeePaid: childPaid,
        outstandingFeeBalance: childBalance,
      },
      attendance: {
        rate: attendanceRate,
        total: totalAtt,
        present: presentAtt,
        absent: absentAtt,
        late: lateAtt,
        excused: excusedAtt,
        trend: (cd.attendanceTrend || []).map((point, index) => ({
          key: `att-trend-${childIdx}-${index}-${point.label || ''}`,
          label: point.label || `W${index + 1}`,
          rate: Number(point.rate ?? 0),
        })),
      },
      feeSummary: {
        currency: finance.currency || 'ETB',
        totalInvoiced: childInvoiced,
        totalPaid: childPaid,
        totalBalance: childBalance,
        pendingInvoicesCount: Number(finance.pendingInvoicesCount ?? 0),
        paidInvoicesCount: Number(finance.paidInvoicesCount ?? 0),
        recentInvoices: finance.recentInvoices || [],
      },
      subjects,
      todaySchedule: todaySchedule.map((item, index) => ({
        ...item,
        id: item.id || `sched-${childIdx}-${index}`,
      })),
      assignments: assignments.slice(0, 10).map((a, index) => ({
        ...a,
        id: a.id || `asg-${childIdx}-${index}`,
      })),
      upcomingExams: exams.slice(0, 10).map((e, index) => ({
        ...e,
        id: e.id || `exam-${childIdx}-${index}`,
      })),
      recentMarks: marks.slice(0, 10).map((m, index) => ({
        ...m,
        id: m.id || `mark-${childIdx}-${index}`,
      })),
    };
  });

  const childrenCount = processedChildren.length || 1;
  const overallAttendanceRate = Math.round((sumAttendanceRates / childrenCount) * 10) / 10;
  const overallAverageScore = Math.round((sumAverageScores / childrenCount) * 10) / 10;

  return {
    isParent: true,
    isStudent: false,
    parent: {
      id: parent.id,
      name: parent.full_name || 'Parent',
      phone: parent.phone,
      email: parent.email,
      relationship: parent.relationship || 'GUARDIAN',
      schoolName: parent.school_name || 'Academic Institution',
      childrenCount: processedChildren.length,
    },
    stats: {
      totalChildren: processedChildren.length,
      overallAttendanceRate,
      overallAverageScore,
      totalPendingHomework,
      totalUpcomingExams,
      totalClassesToday,
      totalFeeInvoiced: totalChildFeeInvoiced,
      totalFeePaid: totalChildFeePaid,
      totalFeeBalance: totalChildFeeBalance,
    },
    children: processedChildren,
    recentActivity: (data.recentActivity || []).map((act, index) => ({
      id: act.id || `parent-act-${index}`,
      title: act.title || 'Notification',
      description: act.description || '',
      timestamp: act.timestamp || new Date().toISOString(),
    })),
  };
}

function buildTeacherDashboardPayload(data = {}) {
  const teacher = data.teacher || {};
  const todayTimetable = data.todayTimetable || [];
  const weeklySchedule = data.weeklySchedule || [];
  const teachingAssignments = data.teachingAssignments || [];
  const homeroomClass = data.homeroomClass || null;
  const homeroomCourses = data.homeroomCourses || [];
  const recentMarks = data.recentMarks || [];
  const recentPayslips = data.recentPayslips || [];
  const activeAcademicYear = data.activeAcademicYear || 'Current Term';

  const totalAssignedClasses = teachingAssignments.length;
  const totalStudents = Number(data.totalStudentCount ?? teachingAssignments.reduce((acc, a) => acc + (Number(a.student_count) || 0), 0));
  const totalWeeklyPeriods = weeklySchedule.filter((w) => !w.is_break).length;
  const todayLessonsCount = todayTimetable.filter((t) => !t.is_break).length;

  const sortTimetable = (items) => [...items].sort((a, b) => {
    const dayOrder = { MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4, FRIDAY: 5, SATURDAY: 6, SUNDAY: 7 };
    return (dayOrder[a.day_of_week] || 99) - (dayOrder[b.day_of_week] || 99)
      || (Number(a.period_order ?? a.period_number) || 0) - (Number(b.period_order ?? b.period_number) || 0)
      || String(a.start_time || '').localeCompare(String(b.start_time || ''));
  });

  const mapTimetableItem = (item, index) => ({
    id: item.id || `tt-${index}-${item.day_of_week || ''}-${item.period_order || ''}`,
    dayOfWeek: item.day_of_week,
    periodName: item.period_name || `Period ${item.period_order || index + 1}`.trim(),
    periodOrder: item.period_order ?? item.period_number ?? index + 1,
    startTime: item.start_time || '',
    endTime: item.end_time || '',
    timeSlot: item.start_time && item.end_time ? `${item.start_time} - ${item.end_time}` : '',
    isBreak: !!item.is_break,
    periodType: item.period_type || 'LESSON',
    gradeId: item.grade_id,
    gradeName: item.grade_name,
    sectionId: item.section_id,
    sectionName: item.section_name,
    gradeSection: item.grade_name && item.section_name
      ? (item.section_name.toLowerCase().startsWith(item.grade_name.toLowerCase())
          ? item.section_name
          : `${item.grade_name}-${item.section_name}`)
      : (item.section_name || item.grade_name || 'Class'),
    subjectId: item.subject_id,
    subjectName: item.subject_name || 'Unassigned Subject',
    subjectCode: item.subject_code || '',
    roomId: item.room_id,
    roomName: item.room_name || (item.room_number ? `Room ${item.room_number}` : 'Unassigned Room'),
    roomNumber: item.room_number || item.room_name || '',
    building: item.room_building || '',
  });

  return {
    isTeacher: true,
    isStudent: false,
    isParent: false,
    teacher: {
      id: teacher.id,
      name: `${teacher.first_name || ''} ${teacher.last_name || ''}`.trim() || 'Faculty Member',
      firstName: teacher.first_name,
      lastName: teacher.last_name,
      email: teacher.email,
      phone: teacher.phone,
      employeeNumber: teacher.employee_number,
      qualification: teacher.qualification,
      specialization: teacher.specialization,
      status: teacher.status || 'ACTIVE',
      schoolName: teacher.school_name || 'Academic Institution',
      isClassTeacher: !!homeroomClass,
    },
    stats: {
      todayClassesCount: todayLessonsCount,
      totalAssignedClasses,
      totalStudents,
      totalWeeklyPeriods,
      homeroomStudentsCount: homeroomClass ? (Number(homeroomClass.student_count) || 0) : 0,
      activeCurriculumCount: teachingAssignments.length,
      latestPayslipNetSalary: Number(recentPayslips[0]?.net_salary ?? 0),
    },
    todayTimetable: sortTimetable(todayTimetable).map(mapTimetableItem),
    weeklySchedule: sortTimetable(weeklySchedule).map(mapTimetableItem),
    teachingAssignments: teachingAssignments.map((a, index) => ({
      id: a.id || `teach-assign-${index}`,
      gradeId: a.grade_id,
      gradeName: a.grade_name,
      sectionId: a.section_id,
      sectionName: a.section_name,
      gradeSection: a.grade_name && a.section_name
        ? (a.section_name.toLowerCase().startsWith(a.grade_name.toLowerCase())
            ? a.section_name
            : `${a.grade_name}-${a.section_name}`)
        : (a.section_name || 'Class'),
      subjectId: a.subject_id,
      subjectName: a.subject_name,
      subjectCode: a.subject_code,
      studentCount: Number(a.student_count) || 0,
      defaultRoom: a.section_default_room,
      status: a.status || 'ACTIVE',
    })),
    homeroomClass: homeroomClass ? {
      classTeacherId: homeroomClass.class_teacher_id,
      sectionId: homeroomClass.section_id,
      sectionName: homeroomClass.section_name,
      gradeId: homeroomClass.grade_id,
      gradeName: homeroomClass.grade_name,
      gradeSection: homeroomClass.grade_name && homeroomClass.section_name
        ? (homeroomClass.section_name.toLowerCase().startsWith(homeroomClass.grade_name.toLowerCase())
            ? homeroomClass.section_name
            : `${homeroomClass.grade_name}-${homeroomClass.section_name}`)
        : (homeroomClass.section_name || 'Class'),
      roomNumber: homeroomClass.room_number,
      academicYearName: homeroomClass.academic_year_name,
      studentCount: Number(homeroomClass.student_count) || 0,
      courses: homeroomCourses,
    } : null,
    recentMarks: recentMarks.map((m, index) => ({ ...m, id: m.id || `teacher-mark-${index}` })),
    recentPayslips: recentPayslips.map((p, index) => ({ ...p, id: p.id || `payslip-${index}` })),
    currentTerm: activeAcademicYear,
    currentDayOfWeek: data.currentDayOfWeek || null,
    currentDate: data.currentDate || null,
  };
}

module.exports = {
  buildDashboardPayload,
  buildStudentDashboardPayload,
  buildParentDashboardPayload,
  buildTeacherDashboardPayload,
};
