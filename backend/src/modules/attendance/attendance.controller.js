const AttendanceRepository = require('./attendance.repository');
const AttendanceService = require('./attendance.service');
const {
  validateSheetQuery,
  validateBulkAttendanceInput,
  isValidUUID,
  isValidDate,
} = require('./attendance.validation');
const { db } = require('../../config/database');

const attendanceService = new AttendanceService(new AttendanceRepository(db));

async function getRosterSheet(req, res, next) {
  const query = validateSheetQuery(req.query);

  if (Object.keys(query.errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: query.errors,
    });
  }

  try {
    const data = await attendanceService.getSectionRosterSheet({
      sectionId: query.sectionId,
      date: query.date,
    });

    return res.status(200).json({
      success: true,
      message: 'Attendance roster loaded successfully',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function recordBulkAttendance(req, res, next) {
  const input = validateBulkAttendanceInput(req.body);

  if (Object.keys(input.errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: input.errors,
    });
  }

  try {
    const recordedBy = req.user ? req.user.id : null;
    const data = await attendanceService.saveBulkAttendance({
      sectionId: input.sectionId,
      date: input.date,
      academicYearId: input.academicYearId,
      recordedBy,
      records: input.records,
    });

    return res.status(200).json({
      success: true,
      message: 'Attendance recorded successfully',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function getDailySummary(req, res, next) {
  const date = req.query.date;
  const sectionId = req.query.sectionId;

  if (!isValidDate(date)) {
    return res.status(400).json({
      success: false,
      message: 'Valid date (YYYY-MM-DD) is required',
      data: null,
    });
  }

  try {
    const data = await attendanceService.getDailySummary({
      date,
      sectionId: sectionId && isValidUUID(sectionId) ? sectionId : null,
    });

    return res.status(200).json({
      success: true,
      message: 'Attendance summary loaded successfully',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function getMonthlyMatrix(req, res, next) {
  const sectionId = req.query.sectionId;
  const now = new Date();
  const year = Number(req.query.year || now.getFullYear());
  const month = Number(req.query.month || (now.getMonth() + 1));

  if (!sectionId || !isValidUUID(sectionId)) {
    return res.status(400).json({
      success: false,
      message: 'Valid sectionId is required',
      data: null,
    });
  }

  if (isNaN(year) || year < 2000 || year > 2100 || isNaN(month) || month < 1 || month > 12) {
    return res.status(400).json({
      success: false,
      message: 'Valid year and month (1-12) are required',
      data: null,
    });
  }

  try {
    const data = await attendanceService.getMonthlyMatrix({ sectionId, year, month });
    return res.status(200).json({
      success: true,
      message: 'Monthly attendance matrix loaded successfully',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function getStudentAttendance(req, res, next) {
  const studentId = req.params.studentId;

  if (!isValidUUID(studentId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid student ID format',
      data: null,
    });
  }

  try {
    const limit = Number(req.query.limit || 30);
    const offset = Number(req.query.offset || 0);

    const data = await attendanceService.getStudentAttendance(studentId, { limit, offset });

    return res.status(200).json({
      success: true,
      message: 'Student attendance history loaded',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getRosterSheet,
  recordBulkAttendance,
  getDailySummary,
  getMonthlyMatrix,
  getStudentAttendance,
};
