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

  async getStudentAttendance(studentId, { limit = 30, offset = 0 } = {}) {
    return await this.repository.getStudentAttendanceHistory(studentId, { limit, offset });
  }
}

module.exports = AttendanceService;
