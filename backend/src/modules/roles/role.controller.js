const RoleRepository = require('./role.repository');
const RoleService = require('./role.service');
const AuditService = require('../../services/audit.service');
const { isValidUUID } = require('../users/user.validation');
const { db } = require('../../config/database');

const auditService = new AuditService(db);
const roleRepository = new RoleRepository(db);
const roleService = new RoleService(roleRepository, auditService);

function getUserContext(req) {
  return {
    userId: req.user?.id,
    schoolId: req.user?.school_id,
    ip: req.ip || req.connection?.remoteAddress,
    userAgent: req.get('user-agent'),
  };
}

async function listRoles(req, res, next) {
  try {
    const data = await roleService.listRoles();
    return res.status(200).json({
      success: true,
      message: 'Roles loaded successfully',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function getRoleById(req, res, next) {
  if (!isValidUUID(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid role ID', data: null });
  }

  try {
    const data = await roleService.getRole(req.params.id);
    return res.status(200).json({
      success: true,
      message: 'Role details loaded',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function createRole(req, res, next) {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Role name is required' });
    }
    const userContext = getUserContext(req);
    const data = await roleService.createRole({ name, description }, userContext);
    return res.status(201).json({
      success: true,
      message: 'Role created successfully',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function deleteRole(req, res, next) {
  if (!isValidUUID(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid role ID', data: null });
  }

  try {
    const userContext = getUserContext(req);
    await roleService.deleteRole(req.params.id, userContext);
    return res.status(200).json({
      success: true,
      message: 'Role deleted successfully',
    });
  } catch (error) {
    return next(error);
  }
}

async function getRolePermissions(req, res, next) {
  if (!isValidUUID(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid role ID', data: null });
  }

  try {
    const data = await roleService.getRolePermissions(req.params.id);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function updateRolePermissions(req, res, next) {
  if (!isValidUUID(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid role ID', data: null });
  }

  try {
    const { permissions } = req.body;
    if (!Array.isArray(permissions)) {
      return res.status(400).json({ success: false, message: 'permissions must be an array' });
    }
    const userContext = getUserContext(req);
    const data = await roleService.updateRolePermissions(req.params.id, permissions, userContext);
    return res.status(200).json({
      success: true,
      message: 'Role permissions updated successfully',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listRoles,
  getRoleById,
  createRole,
  deleteRole,
  getRolePermissions,
  updateRolePermissions,
};
