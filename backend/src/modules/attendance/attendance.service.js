class AttendanceService {
  constructor(repository) {
    this.repository = repository;
  }

  async getSectionRosterSheet({ sectionId, date }) {
    const students = await this.repository.findSectionRosterWithAttendance(sectionId, date);
    const summary = await this.repository.getAttendanceSummary({ date, sectionId });

    return {
      sectionId,
      date,
      totalStudents: students.length,
      summary: {
        present: Number(summary.present_count || 0),
        absent: Number(summary.absent_count || 0),
        late: Number(summary.late_count || 0),
        excused: Number(summary.excused_count || 0),
      },
      students,
    };
  }

  async saveBulkAttendance({ sectionId, date, academicYearId, recordedBy, records }) {
    const saved = await this.repository.bulkUpsertAttendance({
      sectionId,
      date,
      academicYearId,
      recordedBy,
      records,
    });

    const summary = await this.repository.getAttendanceSummary({ date, sectionId });

    return {
      sectionId,
      date,
      count: saved.length,
      summary: {
        present: Number(summary.present_count || 0),
        absent: Number(summary.absent_count || 0),
        late: Number(summary.late_count || 0),
        excused: Number(summary.excused_count || 0),
      },
    };
  }

  async getDailySummary({ date, sectionId }) {
    const summary = await this.repository.getAttendanceSummary({ date, sectionId });
    return summary;
  }

  async getMonthlyMatrix({ sectionId, year, month }) {
    const raw = await this.repository.findSectionMonthlyMatrix(sectionId, year, month);

    // Group attendance by student
    const attendanceByStudent = {};
    for (const record of raw.attendanceRecords) {
      if (!attendanceByStudent[record.student_id]) {
        attendanceByStudent[record.student_id] = {};
      }
      attendanceByStudent[record.student_id][record.day_number] = {
        status: record.status,
        remark: record.remark,
      };
    }

    let totalSectionPresent = 0;
    let totalSectionMarked = 0;

    const studentMatrix = raw.students.map((s) => {
      const studentDays = attendanceByStudent[s.student_id] || {};
      let presentCount = 0;
      let absentCount = 0;
      let lateCount = 0;
      let excusedCount = 0;
      let totalMarked = 0;

      const daysMap = {};
      for (let day = 1; day <= raw.daysInMonth; day++) {
        const record = studentDays[day];
        if (record) {
          daysMap[day] = record.status;
          totalMarked++;
          if (record.status === 'PRESENT') presentCount++;
          else if (record.status === 'ABSENT') absentCount++;
          else if (record.status === 'LATE') lateCount++;
          else if (record.status === 'EXCUSED') excusedCount++;
        } else {
          daysMap[day] = null;
        }
      }

      totalSectionPresent += presentCount;
      totalSectionMarked += totalMarked;

      const attendanceRate =
        totalMarked > 0 ? Math.round((presentCount / totalMarked) * 100) : 0;

      return {
        studentId: s.student_id,
        admissionNumber: s.admission_number,
        name: `${s.first_name} ${s.last_name}`,
        gender: s.gender,
        sectionName: s.section_name,
        gradeName: s.grade_name,
        days: daysMap,
        summary: {
          totalMarked,
          presentCount,
          absentCount,
          lateCount,
          excusedCount,
          attendanceRate,
        },
      };
    });

    const averageRate =
      totalSectionMarked > 0
        ? Math.round((totalSectionPresent / totalSectionMarked) * 100)
        : 0;

    return {
      sectionId,
      year: raw.year,
      month: raw.month,
      daysInMonth: raw.daysInMonth,
      totalStudents: raw.students.length,
      averageAttendanceRate: averageRate,
      matrix: studentMatrix,
    };
  }

  async getStudentAttendance(studentId, { academicYearId = null, limit = 30, offset = 0 } = {}) {
    return await this.repository.getStudentAttendanceHistory(studentId, { academicYearId, limit, offset });
  }

  /**
   * Enterprise Attendance Reports & Analytics Generator
   */
  async generateAttendanceReport({
    schoolId = null,
    academicYearId = null,
    gradeId = null,
    sectionId = null,
    startDate,
    endDate,
    period = 'this_month',
    accessibleSectionIds = null,
    targetStudentId = null,
    mode = 'cohort', // 'cohort' | 'individual'
  }) {
    const raw = await this.repository.getAttendanceReportsRawData({
      schoolId,
      academicYearId,
      gradeId,
      sectionId,
      startDate,
      endDate,
      accessibleSectionIds,
      targetStudentId,
    });

    const recordsByStudent = {};
    const distinctDates = new Set();
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalLate = 0;
    let totalExcused = 0;

    const DOW_NAMES = {
      1: 'Monday',
      2: 'Tuesday',
      3: 'Wednesday',
      4: 'Thursday',
      5: 'Friday',
    };

    const dowMap = {
      1: { day: 'Monday', present: 0, absent: 0, late: 0, excused: 0, total: 0 },
      2: { day: 'Tuesday', present: 0, absent: 0, late: 0, excused: 0, total: 0 },
      3: { day: 'Wednesday', present: 0, absent: 0, late: 0, excused: 0, total: 0 },
      4: { day: 'Thursday', present: 0, absent: 0, late: 0, excused: 0, total: 0 },
      5: { day: 'Friday', present: 0, absent: 0, late: 0, excused: 0, total: 0 },
    };

    for (const rec of raw.attendanceRecords) {
      distinctDates.add(rec.date_str);

      if (rec.status === 'PRESENT') totalPresent++;
      else if (rec.status === 'ABSENT') totalAbsent++;
      else if (rec.status === 'LATE') totalLate++;
      else if (rec.status === 'EXCUSED') totalExcused++;

      if (rec.dow >= 1 && rec.dow <= 5) {
        const item = dowMap[rec.dow];
        item.total++;
        if (rec.status === 'PRESENT') item.present++;
        else if (rec.status === 'ABSENT') item.absent++;
        else if (rec.status === 'LATE') item.late++;
        else if (rec.status === 'EXCUSED') item.excused++;
      }

      if (!recordsByStudent[rec.student_id]) {
        recordsByStudent[rec.student_id] = [];
      }
      recordsByStudent[rec.student_id].push(rec);
    }

    // Process broadsheet for all scoped students
    const broadsheet = raw.students.map((s) => {
      const records = recordsByStudent[s.student_id] || [];
      // Sort records ascending for calendar, descending for consecutive streak
      records.sort((a, b) => new Date(a.date) - new Date(b.date));

      let presentCount = 0;
      let absentCount = 0;
      let lateCount = 0;
      let excusedCount = 0;

      for (const r of records) {
        if (r.status === 'PRESENT') presentCount++;
        else if (r.status === 'ABSENT') absentCount++;
        else if (r.status === 'LATE') lateCount++;
        else if (r.status === 'EXCUSED') excusedCount++;
      }

      const totalMarked = records.length;
      const attendanceRate = totalMarked > 0 ? Math.round((presentCount / totalMarked) * 100) : 100;

      // Calculate consecutive absences (looking backwards from latest marked date)
      let consecutiveAbsences = 0;
      for (let i = records.length - 1; i >= 0; i--) {
        if (records[i].status === 'ABSENT') {
          consecutiveAbsences++;
        } else {
          break;
        }
      }

      let riskLevel = 'NORMAL';
      if (totalMarked >= 3) {
        if (attendanceRate < 65 || consecutiveAbsences >= 5) {
          riskLevel = 'CRITICAL';
        } else if (attendanceRate < 75 || consecutiveAbsences >= 3) {
          riskLevel = 'WARNING';
        } else if (lateCount >= 4) {
          riskLevel = 'WATCHLIST';
        }
      }

      return {
        studentId: s.student_id,
        admissionNumber: s.admission_number,
        name: `${s.first_name} ${s.last_name}`,
        gender: s.gender,
        gradeId: s.grade_id,
        gradeName: s.grade_name,
        sectionId: s.section_id,
        sectionName: s.section_name,
        parentName: s.parent_name || 'Not on file',
        parentPhone: s.parent_phone || '—',
        totalDays: totalMarked,
        presentDays: presentCount,
        absentDays: absentCount,
        lateDays: lateCount,
        excusedDays: excusedCount,
        attendanceRate,
        consecutiveAbsences,
        riskLevel,
        complianceStatus: attendanceRate >= 75 ? 'COMPLIANT' : 'AT_RISK',
      };
    });

    // At-Risk Register (Chronic Defaulters & High Absences)
    const atRiskRegister = broadsheet
      .filter((s) => s.riskLevel !== 'NORMAL')
      .sort((a, b) => {
        if (a.riskLevel === 'CRITICAL' && b.riskLevel !== 'CRITICAL') return -1;
        if (b.riskLevel === 'CRITICAL' && a.riskLevel !== 'CRITICAL') return 1;
        return a.attendanceRate - b.attendanceRate;
      });

    // Grade-level aggregated comparisons
    const gradeMap = {};
    for (const b of broadsheet) {
      if (!gradeMap[b.gradeId]) {
        gradeMap[b.gradeId] = {
          gradeId: b.gradeId,
          gradeName: b.gradeName,
          studentCount: 0,
          presentDays: 0,
          absentDays: 0,
          lateDays: 0,
          excusedDays: 0,
          totalDays: 0,
        };
      }
      const g = gradeMap[b.gradeId];
      g.studentCount++;
      g.presentDays += b.presentDays;
      g.absentDays += b.absentDays;
      g.lateDays += b.lateDays;
      g.excusedDays += b.excusedDays;
      g.totalDays += b.totalDays;
    }

    const gradeComparison = Object.values(gradeMap)
      .map((g) => ({
        gradeId: g.gradeId,
        gradeName: g.gradeName,
        studentCount: g.studentCount,
        presentCount: g.presentDays,
        absentCount: g.absentDays,
        lateCount: g.lateDays,
        excusedCount: g.excusedDays,
        totalMarked: g.totalDays,
        attendanceRate: g.totalDays > 0 ? Math.round((g.presentDays / g.totalDays) * 100) : 100,
      }))
      .sort((a, b) => b.attendanceRate - a.attendanceRate);

    // Section comparisons
    const sectionStatsMap = {};
    for (const b of broadsheet) {
      if (!sectionStatsMap[b.sectionId]) {
        sectionStatsMap[b.sectionId] = {
          presentDays: 0,
          absentDays: 0,
          lateDays: 0,
          excusedDays: 0,
          totalDays: 0,
        };
      }
      const sec = sectionStatsMap[b.sectionId];
      sec.presentDays += b.presentDays;
      sec.absentDays += b.absentDays;
      sec.lateDays += b.lateDays;
      sec.excusedDays += b.excusedDays;
      sec.totalDays += b.totalDays;
    }

    const sectionComparison = raw.sections.map((sec) => {
      const stats = sectionStatsMap[sec.section_id] || {
        presentDays: 0,
        absentDays: 0,
        lateDays: 0,
        excusedDays: 0,
        totalDays: 0,
      };

      const attendanceRate =
        stats.totalDays > 0 ? Math.round((stats.presentDays / stats.totalDays) * 100) : 100;

      const isSubmittedToday = Number(sec.today_marked_count) > 0;

      return {
        sectionId: sec.section_id,
        sectionName: sec.section_name,
        gradeId: sec.grade_id,
        gradeName: sec.grade_name,
        totalStudents: Number(sec.total_students || 0),
        classTeacherName: sec.class_teacher_name || 'Not assigned',
        attendanceRate,
        presentCount: stats.presentDays,
        absentCount: stats.absentDays,
        lateCount: stats.lateDays,
        excusedCount: stats.excusedDays,
        todayMarkedCount: Number(sec.today_marked_count || 0),
        todayLastMarkedAt: sec.today_last_marked_at || null,
        todayStatus: isSubmittedToday ? 'SUBMITTED' : 'PENDING',
      };
    }).sort((a, b) => b.attendanceRate - a.attendanceRate);

    // Day of Week Trends
    const dayOfWeekTrends = Object.values(dowMap).map((d) => ({
      ...d,
      attendanceRate: d.total > 0 ? Math.round((d.present / d.total) * 100) : 100,
    }));

    let lowestDay = null;
    let highestDay = null;
    for (const d of dayOfWeekTrends) {
      if (d.total > 0) {
        if (!lowestDay || d.attendanceRate < lowestDay.attendanceRate) lowestDay = d;
        if (!highestDay || d.attendanceRate > highestDay.attendanceRate) highestDay = d;
      }
    }

    // Roll-call compliance for today across sections
    const totalSectionsCount = raw.sections.length;
    const sectionsSubmittedToday = raw.sections.filter((s) => Number(s.today_marked_count) > 0).length;
    const todayRollCallRate =
      totalSectionsCount > 0 ? Math.round((sectionsSubmittedToday / totalSectionsCount) * 100) : 0;

    // Overall KPIs
    const totalEnrolled = raw.students.length;
    const totalAttendanceRecords = raw.attendanceRecords.length;
    const overallAttendanceRate =
      totalAttendanceRecords > 0 ? Math.round((totalPresent / totalAttendanceRecords) * 100) : 100;
    const punctualityRate =
      totalPresent > 0 ? Math.round(((totalPresent - totalLate) / totalPresent) * 100) : 100;

    const kpis = {
      totalEnrolled,
      totalMarkedDays: distinctDates.size,
      totalAttendanceRecords,
      totalPresent,
      totalAbsent,
      totalLate,
      totalExcused,
      overallAttendanceRate,
      punctualityRate,
      chronicDefaultersCount: atRiskRegister.length,
      chronicDefaultersRate: totalEnrolled > 0 ? Math.round((atRiskRegister.length / totalEnrolled) * 100) : 0,
      totalSectionsCount,
      sectionsSubmittedToday,
      todayRollCallRate,
    };

    // Status Distribution
    const statusDistribution = [
      {
        status: 'PRESENT',
        label: 'Present',
        count: totalPresent,
        percentage: totalAttendanceRecords > 0 ? Math.round((totalPresent / totalAttendanceRecords) * 100) : 0,
        color: '#10b981',
      },
      {
        status: 'ABSENT',
        label: 'Absent',
        count: totalAbsent,
        percentage: totalAttendanceRecords > 0 ? Math.round((totalAbsent / totalAttendanceRecords) * 100) : 0,
        color: '#ef4444',
      },
      {
        status: 'LATE',
        label: 'Late',
        count: totalLate,
        percentage: totalAttendanceRecords > 0 ? Math.round((totalLate / totalAttendanceRecords) * 100) : 0,
        color: '#f59e0b',
      },
      {
        status: 'EXCUSED',
        label: 'Excused',
        count: totalExcused,
        percentage: totalAttendanceRecords > 0 ? Math.round((totalExcused / totalAttendanceRecords) * 100) : 0,
        color: '#3b82f6',
      },
    ];

    // Individual Mode Data (Parent / Student view or Admin drill-down)
    let individualData = null;
    if (mode === 'individual' || targetStudentId) {
      const studentSummary = broadsheet.find((s) => s.studentId === targetStudentId) || broadsheet[0] || null;
      const studentRecords = (recordsByStudent[studentSummary?.studentId] || []).slice().reverse();

      const daysMap = {};
      for (const rec of studentRecords) {
        daysMap[rec.date_str] = {
          status: rec.status,
          remark: rec.remark,
          markedBy: rec.marked_by_first_name ? `${rec.marked_by_first_name} ${rec.marked_by_last_name}` : 'Staff',
        };
      }

      individualData = {
        student: studentSummary,
        daysMap,
        auditLog: studentRecords.slice(0, 30),
      };
    }

    return {
      mode: targetStudentId ? 'individual' : mode,
      period,
      startDate: raw.startDate,
      endDate: raw.endDate,
      kpis,
      statusDistribution,
      dayOfWeekTrends: {
        days: dayOfWeekTrends,
        lowestDay: lowestDay ? { day: lowestDay.day, rate: lowestDay.attendanceRate } : null,
        highestDay: highestDay ? { day: highestDay.day, rate: highestDay.attendanceRate } : null,
      },
      gradeComparison,
      sectionComparison,
      atRiskRegister,
      broadsheet,
      individualData,
    };
  }
}

module.exports = AttendanceService;
