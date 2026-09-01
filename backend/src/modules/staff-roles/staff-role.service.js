class StaffRoleAssignmentConflictError extends Error {
  constructor(message = 'This role assignment already exists') {
    super(message);
    this.name = 'StaffRoleAssignmentConflictError';
    this.status = 409;
  }
}

class StaffRoleAssignmentValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'StaffRoleAssignmentValidationError';
    this.status = 400;
  }
}

class StaffRoleAssignmentService {
  constructor(repository) {
    this.repository = repository;
  }

  async assignRole(payload) {
    if (!payload.staff_role_id || !payload.teacher_id || !payload.academic_year_id) {
      throw new StaffRoleAssignmentValidationError('Role, teacher and academic year are required');
    }

    const role = await this.repository.getRoleById(payload.staff_role_id);
    if (!role) {
      throw new StaffRoleAssignmentValidationError('Staff role not found');
    }

    const roleLabel = role.name || 'Selected role';

    const teacher = await this.repository.getTeacherById(payload.teacher_id);
    if (!teacher) {
      throw new StaffRoleAssignmentValidationError('Teacher not found');
    }

    const academicYear = await this.repository.getAcademicYearById(payload.academic_year_id);
    if (!academicYear) {
      throw new StaffRoleAssignmentValidationError('Academic year not found');
    }

    if (role.scope_type === 'school') {
      const existing = await this.repository.findActiveAssignment({
        academic_year_id: payload.academic_year_id,
        staff_role_id: payload.staff_role_id,
      });

      if (existing) {
        throw new StaffRoleAssignmentConflictError(
          `A ${roleLabel} assignment is already assigned for this academic year. Only one active assignment is allowed.`
        );
      }
    }

    if (role.scope_type === 'unit') {
      if (!payload.unit_id) {
        throw new StaffRoleAssignmentValidationError('Unit is required for unit-scoped roles');
      }

      const existing = await this.repository.findActiveAssignment({
        academic_year_id: payload.academic_year_id,
        staff_role_id: payload.staff_role_id,
        unit_id: payload.unit_id,
      });

      if (existing) {
        throw new StaffRoleAssignmentConflictError(
          `A ${roleLabel} assignment is already assigned for this unit in the selected academic year. Only one active assignment is allowed.`
        );
      }
    }

    if (role.scope_type === 'section') {
      if (!payload.section_id) {
        throw new StaffRoleAssignmentValidationError('Section is required for section-scoped roles');
      }

      const existing = await this.repository.findActiveAssignment({
        academic_year_id: payload.academic_year_id,
        staff_role_id: payload.staff_role_id,
        section_id: payload.section_id,
      });

      if (existing) {
        throw new StaffRoleAssignmentConflictError(
          `A ${roleLabel} assignment is already assigned for this section in the selected academic year. Only one active assignment is allowed.`
        );
      }
    }

    const created = await this.repository.createAssignment({
      ...payload,
      status: payload.status || 'ACTIVE',
      assignment_date: payload.assignment_date || null,
    });

    return created;
  }
}

module.exports = {
  StaffRoleAssignmentService,
  StaffRoleAssignmentConflictError,
  StaffRoleAssignmentValidationError,
};
