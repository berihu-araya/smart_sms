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

function buildTeacherDashboardPayload(data = {}) {
  const teacher = data.teacher || {};
  const todayTimetable = data.todayTimetable || [];
  const weeklySchedule = data.weeklySchedule || [];
  const teachingAssignments = data.teachingAssignments || [];
  const homeroomClass = data.homeroomClass || null;
  const homeroomCourses = data.homeroomCourses || [];
  const recentMarks = data.recentMarks || [];
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

  const mapTimetableItem = (item) => ({
    id: item.id,
    dayOfWeek: item.day_of_week,
    periodName: item.period_name || `Period ${item.period_order || ''}`.trim(),
    periodOrder: item.period_order ?? item.period_number,
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
    },
    todayTimetable: sortTimetable(todayTimetable).map(mapTimetableItem),
    weeklySchedule: sortTimetable(weeklySchedule).map(mapTimetableItem),
    teachingAssignments: teachingAssignments.map((a) => ({
      id: a.id,
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
    recentMarks,
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
