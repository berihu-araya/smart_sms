const AuthRepository = require('./auth.repository');
const { AuthService } = require('./auth.service');
const {
  validateLoginInput,
  validateForgotPasswordInput,
  validateResetPasswordInput,
  validateChangePasswordInput,
} = require('./auth.validation');
const { db } = require('../../config/database');
const env = require('../../config/env');

const authService = new AuthService(new AuthRepository(db), env);

async function login(req, res, next) {
  const input = validateLoginInput(req.body);

  if (Object.keys(input.errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: input.errors,
    });
  }

  try {
    const data = await authService.login(input);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function forgotPassword(req, res, next) {
  const input = validateForgotPasswordInput(req.body);

  if (Object.keys(input.errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: input.errors,
    });
  }

  try {
    const data = await authService.sendPasswordReset(input);

    return res.status(200).json({
      success: true,
      message: 'If an account exists, reset instructions have been sent.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function resetPassword(req, res, next) {
  const input = validateResetPasswordInput(req.body);

  if (Object.keys(input.errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: input.errors,
    });
  }

  try {
    await authService.resetPassword(input);

    return res.status(200).json({
      success: true,
      message: 'Password has been reset successfully.',
      data: null,
    });
  } catch (error) {
    return next(error);
  }
}

async function changePassword(req, res, next) {
  const input = validateChangePasswordInput(req.body);

  if (Object.keys(input.errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: input.errors,
    });
  }

  try {
    await authService.changePassword({
      userId: req.user.sub,
      currentPassword: input.currentPassword,
      newPassword: input.newPassword,
    });

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully.',
      data: null,
    });
  } catch (error) {
    return next(error);
  }
}

async function getProfile(req, res, next) {
  try {
    const data = await authService.getProfile(req.user.sub);

    return res.status(200).json({
      success: true,
      message: 'Profile loaded successfully.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function updateProfileImage(req, res, next) {
  const { profileImage } = req.body || {};
  const imagePattern = /^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=\s]+$/;

  if (profileImage !== null && (
    typeof profileImage !== 'string'
    || profileImage.length > 7000000
    || !imagePattern.test(profileImage)
  )) {
    return res.status(400).json({
      success: false,
      message: 'Profile image must be a PNG, JPEG, or WebP file smaller than 5 MB.',
      data: null,
    });
  }

  try {
    const data = await authService.updateProfileImage(req.user.sub, profileImage);

    return res.status(200).json({
      success: true,
      message: 'Profile image updated successfully.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  login,
  forgotPassword,
  resetPassword,
  changePassword,
  getProfile,
  updateProfileImage,
};
