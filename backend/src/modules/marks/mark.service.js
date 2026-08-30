class MarkService {
  constructor(repository, examRepository) {
    this.repository = repository;
    this.examRepository = examRepository;
  }

  async getMarksSheet({ examId, subjectId, sectionId, teacherId = null }) {
    const exam = await this.examRepository.findById(examId);
    if (!exam) {
      const error = new Error('Exam not found');
      error.status = 404;
      throw error;
    }

    if (teacherId) {
      const allowedAssignment = await this.repository.isTeacherAssignedToMarksScope({
        teacherId,
        subjectId,
        sectionId,
      });

      if (!allowedAssignment) {
        const error = new Error('You are not assigned to this class/subject exam');
        error.status = 403;
        throw error;
      }
    }

    const students = await this.repository.getMarksSheet(examId, subjectId, sectionId);

    return {
      exam: {
        id: exam.id,
        title: exam.title,
        examType: exam.exam_type,
        maxMarks: Number(exam.max_marks || 100),
        weightPercentage: Number(exam.weight_percentage || 100),
      },
      subjectId,
      sectionId,
      totalStudents: students.length,
      students: students.map((s) => ({
        ...s,
        score: Number(s.score || 0),
      })),
    };
  }

  async saveBatchMarks({ examId, subjectId, sectionId, teacherId, marks }) {
    const exam = await this.examRepository.findById(examId);
    if (!exam) {
      const error = new Error('Exam not found');
      error.status = 404;
      throw error;
    }

    if (teacherId) {
      const allowedAssignment = await this.repository.isTeacherAssignedToMarksScope({
        teacherId,
        subjectId,
        sectionId,
      });

      if (!allowedAssignment) {
        const error = new Error('You are not assigned to this class/subject exam');
        error.status = 403;
        throw error;
      }
    }

    const maxAllowed = Number(exam.max_marks || 100);

    // Validate scores do not exceed max marks
    for (const item of marks) {
      if (!item.isAbsent && item.score > maxAllowed) {
        const error = new Error(`Score ${item.score} exceeds maximum allowed marks of ${maxAllowed}`);
        error.status = 400;
        throw error;
      }
    }

    const saved = await this.repository.batchUpsertMarks({
      examId,
      subjectId,
      sectionId,
      teacherId,
      marks,
    });

    return {
      examId,
      subjectId,
      sectionId,
      count: saved.length,
    };
  }

  async getStudentMarks(studentId, params) {
    return await this.repository.getStudentMarks(studentId, params);
  }
}

module.exports = MarkService;
