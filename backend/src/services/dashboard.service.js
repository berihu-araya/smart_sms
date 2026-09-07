function buildDashboardPayload(data = {}) {
  return {
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

module.exports = {
  buildDashboardPayload,
};
