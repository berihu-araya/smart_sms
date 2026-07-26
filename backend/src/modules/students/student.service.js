const { STUDENT_STATUSES } = require('./student.model');

class StudentNotFoundError extends Error {
  constructor(message = 'Student not found') {
    super(message);
    this.name = 'StudentNotFoundError';
    this.status = 404;
  }
}

class StudentConflictError extends Error {
  constructor(message = 'Student already exists') {
    super(message);
    this.name = 'StudentConflictError';
    this.status = 409;
  }
}

class StudentService {
  constructor(repository) {
    this.repository = repository;
  }

  async listStudents({ search = '', limit = 20, offset = 0 } = {}) {
    const students = await this.repository.findAll({ search, limit, offset });

    return {
      page: Math.floor(offset / limit) + 1,
      limit,
      items: students,
    };
  }

  async getStudentById(id) {
    const student = await this.repository.findById(id);

    if (!student) {
      throw new StudentNotFoundError();
    }

    return student;
  }

  async createStudent(payload) {
    const student = await this.repository.createStudent(payload);

    if (!student) {
      throw new StudentConflictError('Unable to create student');
    }

    return student;
  }

  async updateStudent(id, payload) {
    const existing = await this.repository.findById(id);

    if (!existing) {
      throw new StudentNotFoundError();
    }

    const updatedStudent = await this.repository.updateStudent(id, payload);

    return updatedStudent;
  }

  async deleteStudent(id) {
    const existing = await this.repository.findById(id);

    if (!existing) {
      throw new StudentNotFoundError();
    }

    const deletedStudent = await this.repository.softDelete(id);

    return deletedStudent;
  }

  async activateStudent(id) {
    const student = await this.repository.updateStatus(id, STUDENT_STATUSES.ACTIVE);

    if (!student) {
      throw new StudentNotFoundError();
    }

    return student;
  }

  async suspendStudent(id) {
    const student = await this.repository.updateStatus(id, STUDENT_STATUSES.SUSPENDED);

    if (!student) {
      throw new StudentNotFoundError();
    }

    return student;
  }

  async getStudentProfile(id) {
    const student = await this.getStudentById(id);

    return {
      student: {
        ...student,
        email: student.email || null,
        phone: student.phone || null,
      },
      guardian: {
        name: student.parent_name || null,
        phone: student.parent_phone || null,
        email: student.parent_email || null,
        address: student.parent_address || null,
      },
      academicInfo: {
        gradeId: student.grade_id || null,
        gradeName: student.grade_name || null,
        section: student.section_name || null,
        sectionId: student.section_id || null,
        room: student.section_room_number || null,
        currentStatus: student.status,
      },
    };
  }

  async getStudentGuardian(id) {
    const student = await this.getStudentById(id);

    return {
      studentId: student.id,
      guardian: {
        name: student.parent_name || null,
        phone: student.parent_phone || null,
        email: student.parent_email || null,
        address: student.parent_address || null,
      },
    };
  }
}

module.exports = {
  StudentService,
  StudentNotFoundError,
  StudentConflictError,
};

