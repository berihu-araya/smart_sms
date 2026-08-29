const SettingRepository = require('./setting.repository');
const SettingService = require('./setting.service');
const { validateUpdateSettingsInput } = require('./setting.validation');
const { db } = require('../../config/database');

const settingService = new SettingService(new SettingRepository(db));

async function getSettings(req, res, next) {
  try {
    const data = await settingService.getSettings();
    return res.status(200).json({
      success: true,
      message: 'School settings loaded',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function updateSettings(req, res, next) {
  const input = validateUpdateSettingsInput(req.body);

  if (Object.keys(input.errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: input.errors,
    });
  }

  try {
    const data = await settingService.updateSettings(input);
    return res.status(200).json({
      success: true,
      message: 'School settings updated successfully',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getSettings,
  updateSettings,
};
