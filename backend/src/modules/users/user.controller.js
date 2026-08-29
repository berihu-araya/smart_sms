const UserRepository = require('./user.repository');
const UserService = require('./user.service');
const AuthRepository = require('../auth/auth.repository');
const {
  validateCreateUserInput,
  validateUpdateUserInput,
  isValidUUID,
} = require('./user.validation');
const { db } = require('../../config/database');

const userService = new UserService(new UserRepository(db), new AuthRepository(db));

async function listUsers(req, res, next) {
  try {
    const data = await userService.listUsers({
      search: req.query.search || '',
      roleId: req.query.roleId && isValidUUID(req.query.roleId) ? req.query.roleId : null,
      limit: Number(req.query.limit || 50),
      offset: Number(req.query.offset || 0),
    });

    return res.status(200).json({
      success: true,
      message: 'Users loaded successfully',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function getUserById(req, res, next) {
  if (!isValidUUID(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid user ID', data: null });
  }

  try {
    const data = await userService.getUserById(req.params.id);
    return res.status(200).json({
      success: true,
      message: 'User details loaded',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function createUser(req, res, next) {
  const input = validateCreateUserInput(req.body);

  if (Object.keys(input.errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: input.errors,
    });
  }

  try {
    const data = await userService.createUser(input);
    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function updateUser(req, res, next) {
  if (!isValidUUID(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid user ID', data: null });
  }

  const input = validateUpdateUserInput(req.body);
  if (Object.keys(input.errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: input.errors,
    });
  }

  try {
    const data = await userService.updateUser(req.params.id, input);
    return res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function toggleUserStatus(req, res, next) {
  if (!isValidUUID(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid user ID', data: null });
  }

  const status = req.body.status;
  if (!['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status', data: null });
  }

  try {
    const data = await userService.toggleUserStatus(req.params.id, status);
    return res.status(200).json({
      success: true,
      message: `User status updated to ${status}`,
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function resetPassword(req, res, next) {
  if (!isValidUUID(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid user ID', data: null });
  }

  const newPassword = req.body.password;
  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters', data: null });
  }

  try {
    await userService.resetPassword(req.params.id, newPassword);
    return res.status(200).json({
      success: true,
      message: 'Password reset successfully',
      data: null,
    });
  } catch (error) {
    return next(error);
  }
}

async function deleteUser(req, res, next) {
  if (!isValidUUID(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid user ID', data: null });
  }

  try {
    await userService.deleteUser(req.params.id);
    return res.status(200).json({
      success: true,
      message: 'User deleted successfully',
      data: null,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  toggleUserStatus,
  resetPassword,
  deleteUser,
};
