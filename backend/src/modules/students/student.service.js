const { STUDENT_STATUSES } = require('./student.model');
const ParentRepository = require('../parents/parent.repository');
const { db } = require('../../config/database');

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
  constructor(repository, parentRepository = null) {
    this.repository = repository;
    this.parentRepository = parentRepository || new ParentRepository(db);
  }

  async listStudents({ search = '', limit = 20, offset = 0 } = {}) {
    const data = await this.repository.findAll({ search, limit, offset });

    return {
      page: Math.floor(offset / limit) + 1,
      limit,
      total: data.total,
      totalPages: Math.ceil(data.total / limit) || 1,
      items: data.items,
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
    // If parent data is provided, handle atomic parent registration
    if (payload.parent && !payload.parentId) {
      const client = await db.connect();
      try {
        await client.query('BEGIN');

        let parentId = null;

        // Check if a parent with this exact phone number already exists
        if (payload.parent.phone) {
          const existingParent = await this.parentRepository.findByPhone(payload.parent.phone, client);
          if (existingParent) {
            parentId = existingParent.id;
          }
        }

        // If no existing parent by phone, create a new parent record
        if (!parentId) {
          const createdParent = await this.parentRepository.create(payload.parent, client);
          parentId = createdParent.id;
        }

        // Prepare student payload with linked parentId
        const studentPayload = {
          ...payload,
          parentId,
        };

        const student = await this.repository.createStudent(studentPayload, client);
        await client.query('COMMIT');

        // Return full student data including parent info
        return await this.repository.findById(student.id);
      } catch (error) {
        await client.query('ROLLBACK');
        if (error.code === '23505') {
          throw new StudentConflictError('A student with this admission number already exists');
        }
        throw error;
      } finally {
        client.release();
      }
    }

    // Standard creation if parentId was already chosen directly
    try {
      const student = await this.repository.createStudent(payload);
      if (!student) {
        throw new StudentConflictError('Unable to create student');
      }
      return await this.repository.findById(student.id);
    } catch (error) {
      if (error.code === '23505') {
        throw new StudentConflictError('A student with this admission number already exists');
      }
      throw error;
    }
  }

  async updateStudent(id, payload) {
    const existing = await this.repository.findById(id);

    if (!existing) {
      throw new StudentNotFoundError();
    }

    // If updating parent info alongside student
    if (payload.parent) {
      const client = await db.connect();
      try {
        await client.query('BEGIN');

        let parentId = existing.parent_id || payload.parent_id;

        if (parentId) {
          // Update existing parent
          await this.parentRepository.update(parentId, {
            full_name: payload.parent.fullName,
            phone: payload.parent.phone,
            email: payload.parent.email,
            occupation: payload.parent.occupation,
            address: payload.parent.address,
            relationship: payload.parent.relationship,
          }, client);
        } else {
          // Create new parent and associate
          const createdParent = await this.parentRepository.create(payload.parent, client);
          parentId = createdParent.id;
          payload.parent_id = parentId;
        }

        const { parent, ...studentFields } = payload;
        if (parentId) {
          studentFields.parent_id = parentId;
        }

        await this.repository.updateStudent(id, studentFields, client);
        await client.query('COMMIT');

        return await this.repository.findById(id);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }

    const { parent, ...studentFields } = payload;
    const updatedStudent = await this.repository.updateStudent(id, studentFields);
    return await this.repository.findById(id);
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
        id: student.id,
        admissionNumber: student.admission_number,
        firstName: student.first_name,
        lastName: student.last_name,
        gender: student.gender,
        dateOfBirth: student.date_of_birth,
        admissionDate: student.admission_date,
        address: student.address,
        email: student.email || null,
        phone: student.phone || null,
        status: student.status,
        createdAt: student.created_at,
        updatedAt: student.updated_at,
      },
      guardian: {
        id: student.parent_id || null,
        name: student.parent_name || null,
        phone: student.parent_phone || null,
        email: student.parent_email || null,
        occupation: student.parent_occupation || null,
        address: student.parent_address || null,
        relationship: student.parent_relationship || 'GUARDIAN',
      },
      academicInfo: {
        gradeId: student.grade_id || null,
        gradeName: student.grade_name || null,
        gradeDescription: student.grade_description || null,
        sectionId: student.section_id || null,
        sectionName: student.section_name || null,
        roomNumber: student.section_room_number || null,
        currentStatus: student.status,
      },
    };
  }

  async getStudentGuardian(id) {
    const student = await this.getStudentById(id);

    return {
      studentId: student.id,
      guardian: {
        id: student.parent_id || null,
        name: student.parent_name || null,
        phone: student.parent_phone || null,
        email: student.parent_email || null,
        occupation: student.parent_occupation || null,
        address: student.parent_address || null,
        relationship: student.parent_relationship || 'GUARDIAN',
      },
    };
  }
}

module.exports = {
  StudentService,
  StudentNotFoundError,
  StudentConflictError,
};
