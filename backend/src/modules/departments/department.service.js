class DepartmentService {
  constructor(departmentRepository, auditService = null) {
    this.departmentRepository = departmentRepository;
    this.auditService = auditService;
  }

  async listDepartments(filters) {
    return this.departmentRepository.findAll(filters);
  }

  async getDepartment(id) {
    const dept = await this.departmentRepository.findById(id);
    if (!dept) {
      const error = new Error('Department not found');
      error.status = 404;
      throw error;
    }
    const faculty = await this.departmentRepository.getDepartmentFaculty(id);
    return { ...dept, faculty };
  }

  async createDepartment(payload, userContext = null) {
    if (!payload.name || !payload.name.trim()) {
      const error = new Error('Department name is required');
      error.status = 400;
      throw error;
    }
    if (!payload.code || !payload.code.trim()) {
      const error = new Error('Department code is required');
      error.status = 400;
      throw error;
    }

    const created = await this.departmentRepository.create(payload);

    if (this.auditService && userContext) {
      await this.auditService.log({
        schoolId: userContext.schoolId || created.school_id,
        userId: userContext.userId,
        action: 'DEPARTMENT_CREATED',
        resourceType: 'DEPARTMENT',
        resourceId: created.id,
        newValues: created,
        ipAddress: userContext.ip,
        userAgent: userContext.userAgent,
      }).catch(err => console.error('Audit log error:', err));
    }

    return created;
  }

  async updateDepartment(id, payload, userContext = null) {
    const existing = await this.departmentRepository.findById(id);
    if (!existing) {
      const error = new Error('Department not found');
      error.status = 404;
      throw error;
    }

    const updated = await this.departmentRepository.update(id, payload);

    if (this.auditService && userContext) {
      await this.auditService.log({
        schoolId: userContext.schoolId || existing.school_id,
        userId: userContext.userId,
        action: 'DEPARTMENT_UPDATED',
        resourceType: 'DEPARTMENT',
        resourceId: id,
        oldValues: existing,
        newValues: updated,
        ipAddress: userContext.ip,
        userAgent: userContext.userAgent,
      }).catch(err => console.error('Audit log error:', err));
    }

    return updated;
  }

  async deleteDepartment(id, userContext = null) {
    const existing = await this.departmentRepository.findById(id);
    if (!existing) {
      const error = new Error('Department not found');
      error.status = 404;
      throw error;
    }

    const deleted = await this.departmentRepository.delete(id);

    if (this.auditService && userContext) {
      await this.auditService.log({
        schoolId: userContext.schoolId || existing.school_id,
        userId: userContext.userId,
        action: 'DEPARTMENT_DELETED',
        resourceType: 'DEPARTMENT',
        resourceId: id,
        oldValues: existing,
        ipAddress: userContext.ip,
        userAgent: userContext.userAgent,
      }).catch(err => console.error('Audit log error:', err));
    }

    return deleted;
  }

  async getHodCandidates(schoolId) {
    return this.departmentRepository.getHodCandidates(schoolId);
  }

  async assignTeacher(teacherId, departmentId) {
    return this.departmentRepository.assignTeacherToDepartment(teacherId, departmentId);
  }
}

module.exports = DepartmentService;
