function buildDashboardPayload(data = {}) {
  return {
    isStudent: false,
    stats: {
      totalStudents: data.students ?? 0,
      totalTeachers: data.teachers ?? 0,
      totalSchools: data.schools ?? 0,
      totalAcademicYears: data.academicYears ?? data.schools ?? 0,
      totalSections: data.sections ?? 0,
      activeEnrollments: data.enrollments ?? 0,
      currentTerm: data.term ?? 'Current Term',
      pendingTasks: data.pendingTasks ?? 0,
      attendanceRate: data.attendanceRate ?? 0,
      averageScore: data.averageScore ?? 0,
      passRate: data.passRate ?? 0,
      publishedExams: data.publishedExams ?? 0,
    },
    attendance: {
      rate: data.attendanceRate ?? 0,
      present: data.attendancePresent ?? 0,
      absent: data.attendanceAbsent ?? 0,
      late: data.attendanceLate ?? 0,
      excused: data.attendanceExcused ?? 0,
      trend: data.attendanceTrend ?? [],
    },
    performance: {
      averageScore: data.averageScore ?? 0,
      passRate: data.passRate ?? 0,
      distribution: data.performanceDistribution ?? [],
    },
    enrollmentTrend: data.enrollmentTrend ?? [],
    sectionOverview: data.sectionOverview ?? [],
    schoolsOverview: (data.schoolRows ?? []).map((school) => ({
      id: school.id,
      name: school.name,
      studentCount: school.studentCount ?? 0,
      teacherCount: school.teacherCount ?? 0,
      gradeCount: school.gradeCount ?? 0,
      enrollmentRate: school.enrollmentRate ?? 0,
    })),
    recentActivity: (data.activities ?? []).map((activity) => ({
      id: activity.id,
      title: activity.title,
      description: activity.description,
      timestamp: activity.timestamp,
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
    },
    attendance: {
      rate: attendanceRate,
      total: totalAtt,
      present: presentAtt,
      absent: absentAtt,
      late: lateAtt,
      excused: excusedAtt,
      trend: data.attendanceTrend || [],
    },
    subjects,
    todaySchedule,
    assignments: assignments.slice(0, 6),
    upcomingExams: exams.slice(0, 6),
    recentMarks: marks.slice(0, 6),
  };
}

function buildParentDashboardPayload(data = {}) {
  const parent = data.parent || {};
  const childrenData = data.childrenData || [];

  // Summary stats across all children
  let totalPendingHomework = 0;
  let totalUpcomingExams = 0;
  let totalClassesToday = 0;
  let sumAttendanceRates = 0;
  let sumAverageScores = 0;

  const processedChildren = childrenData.map((cd) => {
    const student = cd.student || {};
    const attendance = cd.attendance || {};
    const marks = cd.marks || [];
    const assignments = cd.assignments || [];
    const exams = cd.exams || [];
    const todaySchedule = cd.todaySchedule || [];
    const subjects = cd.subjects || [];

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

    totalPendingHomework += pendingAssignments.length;
    totalUpcomingExams += exams.length;
    totalClassesToday += todaySchedule.filter((s) => s.period_type === 'LESSON' || !s.period_type).length;
    sumAttendanceRates += attendanceRate;
    sumAverageScores += averagePercentage;

    return {
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
      stats: {
        enrolledSubjectsCount: subjects.length,
        attendanceRate,
        averageScore: averagePercentage,
        pendingAssignmentsCount: pendingAssignments.length,
        submittedAssignmentsCount: submittedAssignments.length,
        upcomingExamsCount: exams.length,
        todayClassesCount: todaySchedule.filter((s) => s.period_type === 'LESSON' || !s.period_type).length,
      },
      attendance: {
        rate: attendanceRate,
        total: totalAtt,
        present: presentAtt,
        absent: absentAtt,
        late: lateAtt,
        excused: excusedAtt,
        trend: cd.attendanceTrend || [],
      },
      subjects,
      todaySchedule,
      assignments: assignments.slice(0, 10),
      upcomingExams: exams.slice(0, 10),
      recentMarks: marks.slice(0, 10),
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
    },
    children: processedChildren,
    recentActivity: data.recentActivity || [],
  };
}

module.exports = {
  buildDashboardPayload,
  buildStudentDashboardPayload,
  buildParentDashboardPayload,
};
