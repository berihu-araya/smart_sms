const express = require('express');
const {
  listRoles,
  listRoleAssignments,
  assignStaffRole,
  getRoleAssignmentsByTeacher,
  deactivateRoleAssignment,
} = require('./staff-role.controller');

const router = express.Router();

router.get('/', listRoles);
router.get('/assignments', listRoleAssignments);
router.post('/assignments', assignStaffRole);
router.get('/assignments/teacher/:teacherId', getRoleAssignmentsByTeacher);
router.patch('/assignments/:id/deactivate', deactivateRoleAssignment);

module.exports = router;
