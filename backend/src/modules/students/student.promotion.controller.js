const StudentPromotionService = require('./student.promotion.service');
const { db } = require('../../config/database');

const promotionService = new StudentPromotionService(db);

async function previewPromotions(req, res, next) {
  try {
    const sourceAcademicYearId = req.query.sourceAcademicYearId || req.query.academic_year_id;
    const gradeId = req.query.gradeId || req.query.grade_id;
    const sectionId = req.query.sectionId || req.query.section_id || null;
    const schoolId = req.user?.school_id || null;

    if (!sourceAcademicYearId || !gradeId) {
      return res.status(400).json({
        success: false,
        message: 'Both sourceAcademicYearId and gradeId are required query parameters.',
      });
    }

    const preview = await promotionService.previewPromotions({
      schoolId,
      sourceAcademicYearId,
      gradeId,
      sectionId,
    });

    return res.status(200).json({
      success: true,
      message: 'Promotion candidates preview loaded successfully.',
      data: preview,
    });
  } catch (error) {
    return next(error);
  }
}

async function executeBatchPromotion(req, res, next) {
  try {
    const { sourceAcademicYearId, targetAcademicYearId, promotions } = req.body;
    const schoolId = req.user?.school_id || null;
    const userId = req.user?.id || null;

    if (!sourceAcademicYearId || !targetAcademicYearId) {
      return res.status(400).json({
        success: false,
        message: 'Both sourceAcademicYearId and targetAcademicYearId are required in the payload.',
      });
    }

    if (!Array.isArray(promotions) || promotions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'promotions must be a non-empty array of student promotion specifications.',
      });
    }

    const result = await promotionService.executeBatchPromotion({
      schoolId,
      userId,
      sourceAcademicYearId,
      targetAcademicYearId,
      promotions,
    });

    return res.status(200).json({
      success: true,
      message: `Batch promotion executed successfully. Processed ${result.summary.totalProcessed} student(s).`,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

async function getStudentAcademicHistory(req, res, next) {
  try {
    const studentId = req.params.id;
    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: 'Student ID is required',
      });
    }

    const history = await promotionService.getStudentAcademicHistory(studentId);

    return res.status(200).json({
      success: true,
      message: 'Student academic history loaded successfully.',
      data: history,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  previewPromotions,
  executeBatchPromotion,
  getStudentAcademicHistory,
};
