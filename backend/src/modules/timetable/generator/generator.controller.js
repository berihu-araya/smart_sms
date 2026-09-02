const { db } = require('../../../config/database');
const TimetableGeneratorService = require('./generator.service');
const { validateTimetableId } = require('../timetable.validation');

const generatorService = new TimetableGeneratorService(db);

async function autoGenerateTimetable(req, res, next) {
  try {
    const { id } = req.params;
    const { isValid, error } = validateTimetableId(id);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: error,
        data: null,
      });
    }

    const {
      clear_existing,
      clearExisting,
      enforce_availability,
      enforceAvailability,
      match_room_types,
      matchRoomTypes,
    } = req.body || {};

    const result = await generatorService.generateSchedule(id, {
      clearExisting: clear_existing !== undefined ? Boolean(clear_existing) : clearExisting !== undefined ? Boolean(clearExisting) : true,
      enforceAvailability: enforce_availability !== undefined ? Boolean(enforce_availability) : enforceAvailability !== undefined ? Boolean(enforceAvailability) : true,
      matchRoomTypes: match_room_types !== undefined ? Boolean(match_room_types) : matchRoomTypes !== undefined ? Boolean(matchRoomTypes) : true,
      userId: req.user?.sub || req.user?.id,
    });

    return res.status(200).json({
      success: true,
      message: `Timetable auto-generated successfully (${result.totalLessonsPlaced}/${result.totalLessonsRequired} lessons scheduled - ${result.coveragePercentage}% coverage)`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  autoGenerateTimetable,
};
