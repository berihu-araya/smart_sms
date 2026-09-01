const { db } = require('../../config/database');
const { StaffRoleAssignmentService } = require('./staff-role.service');
const StaffRoleRepository = require('./staff-role.repository');

const staffRoleRepository = new StaffRoleRepository(db);
const staffRoleService = new StaffRoleAssignmentService(staffRoleRepository);

async function listRoles(req, res, next) {
  try {
    const data = await staffRoleRepository.findAllRoles();
    return res.status(200).json({ success: true, message: 'Staff roles loaded successfully.', data });
  } catch (error) {
    return next(error);
  }
}

async function listRoleAssignments(req, res, next) {
  try {
    const data = await staffRoleRepository.findAllAssignments({
      role_id: req.query.role_id || req.query.roleId || '',
      teacher_id: req.query.teacher_id || req.query.teacherId || '',
      academic_year_id: req.query.academic_year_id || req.query.academicYearId || '',
      unit_id: req.query.unit_id || req.query.unitId || '',
      section_id: req.query.section_id || req.query.sectionId || '',
      status: req.query.status || 'ACTIVE',
      limit: Number(req.query.limit || 20),
      offset: Number(req.query.offset || 0),
    });

    return res.status(200).json({ success: true, message: 'Staff role assignments loaded successfully.', data });
  } catch (error) {
    return next(error);
  }
}

async function assignStaffRole(req, res, next) {
  try {
    const data = await staffRoleService.assignRole(req.body);
    return res.status(201).json({ success: true, message: 'Staff role assigned successfully.', data });
  } catch (error) {
    return next(error);
  }
}

async function getRoleAssignmentsByTeacher(req, res, next) {
  try {
    const data = await staffRoleRepository.findAssignmentsByTeacher(req.params.teacherId);
    return res.status(200).json({ success: true, message: 'Teacher role assignments loaded successfully.', data });
  } catch (error) {
    return next(error);
  }
}

async function deactivateRoleAssignment(req, res, next) {
  try {
    const data = await staffRoleRepository.deactivateAssignment(req.params.id);
    return res.status(200).json({ success: true, message: 'Staff role assignment deactivated successfully.', data });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listRoles,
  listRoleAssignments,
  assignStaffRole,
  getRoleAssignmentsByTeacher,
  deactivateRoleAssignment,
};
