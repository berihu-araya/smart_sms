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

module.exports = {
  buildDashboardPayload,
  buildStudentDashboardPayload,
};
