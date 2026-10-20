const AnalyticsRepository = require('./analytics.repository');
const AnalyticsService = require('./analytics.service');
const { db } = require('../../config/database');

const analyticsService = new AnalyticsService(new AnalyticsRepository(db));

async function getInstitutionalAnalytics(req, res, next) {
  try {
    const schoolId = req.user?.school_id || null;
    const academicYearId = req.query.academicYearId || null;

    const data = await analyticsService.getInstitutionalAnalytics({
      schoolId,
      academicYearId,
    });

    return res.status(200).json({
      success: true,
      message: 'Executive institutional analytics loaded successfully',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getInstitutionalAnalytics,
};
