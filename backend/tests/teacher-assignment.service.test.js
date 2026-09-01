const test = require('node:test');
const assert = require('node:assert/strict');

const {
  ClassTeacherService,
  ClassTeacherConflictError,
} = require('../src/modules/class-teachers/class-teacher.service');

const {
  StaffRoleAssignmentService,
  StaffRoleAssignmentConflictError,
} = require('../src/modules/staff-roles/staff-role.service');

test('ClassTeacherService rejects a second active class teacher in the same section and year', async () => {
  const repo = {
    findActiveAssignment: async () => ({ id: 'existing-assignment' }),
    create: async (payload) => payload,
    deactivateExisting: async () => true,
    findTeacherById: async () => ({ id: 'teacher-1' }),
    findSectionById: async () => ({ id: 'section-1' }),
    findAcademicYearById: async () => ({ id: 'year-1' }),
  };

  const service = new ClassTeacherService(repo);

  await assert.rejects(
    () => service.assignClassTeacher({ teacher_id: 'teacher-2', section_id: 'section-1', academic_year_id: 'year-1' }),
    (error) => {
      assert.equal(error instanceof ClassTeacherConflictError, true);
      assert.match(error.message, /already assigned/i);
      return true;
    }
  );
});

test('StaffRoleAssignmentService rejects duplicate school leader assignment in the same academic year', async () => {
  const repo = {
    getRoleById: async () => ({ id: 'role-1', scope_type: 'school' }),
    getTeacherById: async () => ({ id: 'teacher-1' }),
    getAcademicYearById: async () => ({ id: 'year-1' }),
    findActiveAssignment: async () => ({ id: 'existing-role-assignment' }),
    createAssignment: async (payload) => payload,
    deactivateExistingAssignments: async () => true,
  };

  const service = new StaffRoleAssignmentService(repo);

  await assert.rejects(
    () => service.assignRole({ staff_role_id: 'role-1', teacher_id: 'teacher-2', academic_year_id: 'year-1' }),
    (error) => {
      assert.equal(error instanceof StaffRoleAssignmentConflictError, true);
      assert.match(error.message, /already assigned/i);
      return true;
    }
  );
});
