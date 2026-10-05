const { db } = require('../../../config/database');
const AvailabilityRepository = require('./availability.repository');
const { AvailabilityService } = require('./availability.service');
const { validateBatchAvailabilityInput, isValidUuid } = require('./availability.validation');

const repository = new AvailabilityRepository(db);
const service = new AvailabilityService(repository);

async function getTeacherAvailability(req, res, next) {
  try {
    const { teacherId } = req.params;
    const { academic_year_id, academicYearId } = req.query;

    const yearId = academic_year_id || academicYearId;
    if (!teacherId || !isValidUuid(teacherId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid Teacher ID is required',
        data: null,
      });
    }

    if (!yearId || !isValidUuid(yearId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid Academic Year ID is required as query parameter',
        data: null,
      });
    }

    const slots = await service.getTeacherAvailability(teacherId, yearId);
    return res.status(200).json({
      success: true,
      message: 'Teacher availability retrieved successfully',
      data: slots,
    });
  } catch (error) {
    next(error);
  }
}

async function updateTeacherAvailability(req, res, next) {
  try {
    const { data, errors } = validateBatchAvailabilityInput(req.body);
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        data: { errors },
      });
    }

    const results = await service.setTeacherAvailability(
      data.teacher_id,
      data.academic_year_id,
      data.slots
    );

    return res.status(200).json({
      success: true,
      message: 'Teacher availability updated successfully',
      data: results,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getTeacherAvailability,
  updateTeacherAvailability,
};
