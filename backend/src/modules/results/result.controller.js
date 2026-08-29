const ResultRepository = require('./result.repository');
const ResultService = require('./result.service');
const { isValidUUID } = require('../exams/exam.validation');
const { db } = require('../../config/database');

const resultService = new ResultService(new ResultRepository(db));

async function getSectionResults(req, res, next) {
  const sectionId = req.query.sectionId;

  if (!sectionId || !isValidUUID(sectionId)) {
    return res.status(400).json({
      success: false,
      message: 'Valid sectionId is required',
      data: null,
    });
  }

  try {
    const data = await resultService.calculateSectionResults({
      sectionId,
      academicYearId: req.query.academicYearId && isValidUUID(req.query.academicYearId) ? req.query.academicYearId : null,
      term: req.query.term || null,
    });

    return res.status(200).json({
      success: true,
      message: 'Section results computed successfully',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function getStudentReportCard(req, res, next) {
  const studentId = req.params.studentId;

  if (!isValidUUID(studentId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid student ID format',
      data: null,
    });
  }

  try {
    const data = await resultService.getReportCard(studentId, {
      academicYearId: req.query.academicYearId && isValidUUID(req.query.academicYearId) ? req.query.academicYearId : null,
      term: req.query.term || null,
    });

    return res.status(200).json({
      success: true,
      message: 'Student report card generated',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getSectionResults,
  getStudentReportCard,
};
