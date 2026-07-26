const { TEACHER_STATUSES } = require('./teacher.model');

class TeacherNotFoundError extends Error {
  constructor(message = 'Teacher not found') {
    super(message);
    this.name = 'TeacherNotFoundError';
    this.status = 404;
  }
}

class TeacherConflictError extends Error {
  constructor(message = 'Teacher already exists') {
    super(message);
    this.name = 'TeacherConflictError';
    this.status = 409;
  }
}

class TeacherService {
  constructor(repository) {
    this.repository = repository;
  }

  async listTeachers({ search = '', limit = 20, offset = 0 } = {}) {
    const teachers = await this.repository.findAll({ search, limit, offset });

    return {
      page: Math.floor(offset / limit) + 1,
      limit,
      items: teachers,
    };
  }

  async getTeacherById(id) {
    const teacher = await this.repository.findById(id);

    if (!teacher) {
      throw new TeacherNotFoundError();
    }

    return teacher;
  }

  async createTeacher(payload) {
    const teacher = await this.repository.create(payload);

    if (!teacher) {
      throw new TeacherConflictError('Unable to create teacher');
    }

    return teacher;
  }

  async updateTeacher(id, payload) {
    const existing = await this.repository.findById(id);

    if (!existing) {
      throw new TeacherNotFoundError();
    }

    const updatedTeacher = await this.repository.update(id, payload);

    return updatedTeacher;
  }

  async deleteTeacher(id) {
    const existing = await this.repository.findById(id);

    if (!existing) {
      throw new TeacherNotFoundError();
    }

    const deletedTeacher = await this.repository.softDelete(id);

    return deletedTeacher;
  }

  async activateTeacher(id) {
    const teacher = await this.repository.updateStatus(id, TEACHER_STATUSES.ACTIVE);

    if (!teacher) {
      throw new TeacherNotFoundError();
    }

    return teacher;
  }

  async terminateTeacher(id) {
    const teacher = await this.repository.updateStatus(id, TEACHER_STATUSES.TERMINATED);

    if (!teacher) {
      throw new TeacherNotFoundError();
    }

    return teacher;
  }

  async setTeacherOnLeave(id) {
    const teacher = await this.repository.updateStatus(id, TEACHER_STATUSES.ON_LEAVE);

    if (!teacher) {
      throw new TeacherNotFoundError();
    }

    return teacher;
  }

  async getTeacherProfile(id) {
    const teacher = await this.getTeacherById(id);

    return {
      teacher: {
        id: teacher.id,
        employeeNumber: teacher.employee_number,
        firstName: teacher.first_name,
        lastName: teacher.last_name,
        gender: teacher.gender,
        dateOfBirth: teacher.date_of_birth,
        email: teacher.email,
        phone: teacher.phone,
        address: teacher.address,
      },
      employmentInfo: {
        qualification: teacher.qualification,
        designation: teacher.designation,
        department: teacher.department,
        joiningDate: teacher.joining_date,
        currentStatus: teacher.status,
      },
    };
  }
}

module.exports = {
  TeacherService,
  TeacherNotFoundError,
  TeacherConflictError,
};

