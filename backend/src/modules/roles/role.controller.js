const RoleRepository = require('./role.repository');
const RoleService = require('./role.service');
const { isValidUUID } = require('../users/user.validation');
const { db } = require('../../config/database');

const roleService = new RoleService(new RoleRepository(db));

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
    const data = await roleService.getRoleById(req.params.id);
    return res.status(200).json({
      success: true,
      message: 'Role details loaded',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listRoles,
  getRoleById,
};
