const { db } = require('../../../config/database');

class AvailabilityService {
  constructor(repository) {
    this.repository = repository;
  }

  async getTeacherAvailability(teacherId, academicYearId) {
    const slots = await this.repository.findByTeacher(teacherId, academicYearId);
    return slots;
  }

  async setTeacherAvailability(teacherId, academicYearId, slots = []) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      const results = await this.repository.batchUpsert(
        teacherId,
        academicYearId,
        slots,
        client
      );
      await client.query('COMMIT');
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async checkSlotAvailability(teacherId, academicYearId, dayOfWeek, periodId) {
    return this.repository.isTeacherAvailable(teacherId, academicYearId, dayOfWeek, periodId);
  }
}

module.exports = {
  AvailabilityService,
};
