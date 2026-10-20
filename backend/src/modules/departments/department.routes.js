const express = require('express');
const { db } = require('../../config/database');
const DepartmentRepository = require('./department.repository');
const DepartmentService = require('./department.service');
const DepartmentController = require('./department.controller');
const AuditService = require('../../services/audit.service');
const authMiddleware = require('../../middlewares/auth.middleware');
const authorizeRoles = require('../../middlewares/role.middleware');

const router = express.Router();

const auditService = new AuditService(db);
const departmentRepository = new DepartmentRepository(db);
const departmentService = new DepartmentService(departmentRepository, auditService);
const departmentController = new DepartmentController(departmentService);

router.use(authMiddleware);

// List departments (Admins, Teachers, Staff can view)
router.get('/', (req, res, next) => departmentController.listDepartments(req, res, next));

// Eligible HOD candidates
router.get('/hod-candidates', authorizeRoles('School Admin', 'Admin'), (req, res, next) =>
  departmentController.getHodCandidates(req, res, next)
);

// Department detail
router.get('/:id', (req, res, next) => departmentController.getDepartment(req, res, next));

// Create department (Admin only)
router.post('/', authorizeRoles('School Admin', 'Admin'), (req, res, next) =>
  departmentController.createDepartment(req, res, next)
);

// Update department (Admin only)
router.put('/:id', authorizeRoles('School Admin', 'Admin'), (req, res, next) =>
  departmentController.updateDepartment(req, res, next)
);

// Delete department (Admin only)
router.delete('/:id', authorizeRoles('School Admin', 'Admin'), (req, res, next) =>
  departmentController.deleteDepartment(req, res, next)
);

// Assign teacher to department
router.post('/assign-teacher', authorizeRoles('School Admin', 'Admin'), (req, res, next) =>
  departmentController.assignTeacher(req, res, next)
);

module.exports = router;
