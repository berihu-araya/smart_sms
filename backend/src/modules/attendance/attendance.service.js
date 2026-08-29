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

  async getStudentAttendance(studentId, { limit = 30, offset = 0 } = {}) {
    return await this.repository.getStudentAttendanceHistory(studentId, { limit, offset });
  }
}

module.exports = AttendanceService;
