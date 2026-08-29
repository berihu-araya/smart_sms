class ExamService {
  constructor(repository) {
    this.repository = repository;
  }

  async listExams({ search = '', academicYearId = null, gradeId = null, limit = 50, offset = 0 } = {}) {
    return await this.repository.findAll({ search, academicYearId, gradeId, limit, offset });
  }

  async getExamById(id) {
    const exam = await this.repository.findById(id);
    if (!exam) {
      const error = new Error('Exam not found');
      error.status = 404;
      throw error;
    }
    return exam;
  }

  async createExam(payload) {
    return await this.repository.create(payload);
  }

  async updateExam(id, payload) {
    await this.getExamById(id);
    return await this.repository.update(id, payload);
  }

  async togglePublish(id, isPublished) {
    await this.getExamById(id);
    return await this.repository.update(id, { isPublished });
  }

  async deleteExam(id) {
    await this.getExamById(id);
    return await this.repository.softDelete(id);
  }
}

module.exports = ExamService;
