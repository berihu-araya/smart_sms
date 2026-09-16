const ExamRepository = require('./exam.repository');
const ExamService = require('./exam.service');
const {
  validateCreateExamInput,
  validateUpdateExamInput,
  isValidUUID,
} = require('./exam.validation');
const { db } = require('../../config/database');

const examService = new ExamService(new ExamRepository(db));

async function listExams(req, res, next) {
  try {
    const role = (req.user?.role || '').toLowerCase();
    let gradeId = req.studentScope?.grade_id || null;
    let gradeIds = null;
    const isStudent = role === 'student';
    const isParent = role === 'parent';
    const isTeacher = role.includes('teacher') && !role.includes('admin');

    if (isParent) {
      gradeIds = req.parentScope?.child_grade_ids || [];
      if (req.query.gradeId && isValidUUID(req.query.gradeId)) {
        if (gradeIds.includes(req.query.gradeId)) {
          gradeId = req.query.gradeId;
          gradeIds = null;
        } else {
          return res.status(200).json({
            success: true,
            message: 'Exams loaded successfully',
            data: [],
          });
        }
      }
    }

    if (isTeacher) {
      if (!req.teacherScope || !req.teacherScope.teacher_id) {
        return res.status(403).json({
          success: false,
          message: 'Teacher is not assigned to any class subjects',
          data: [],
        });
      }
      if (req.query.gradeId && isValidUUID(req.query.gradeId)) {
        if (!req.teacherScope.canAccessGrade(req.query.gradeId)) {
          return res.status(200).json({
            success: true,
            message: 'Exams loaded successfully',
            data: [],
          });
        }
      }
    }

    const data = await examService.listExams({
      search: req.query.search || '',
      academicYearId: req.query.academicYearId && isValidUUID(req.query.academicYearId) ? req.query.academicYearId : null,
      gradeId: isStudent ? gradeId : (gradeId || (req.query.gradeId && isValidUUID(req.query.gradeId) ? req.query.gradeId : null)),
      gradeIds: isParent ? gradeIds : null,
      teacherScope: isTeacher ? req.teacherScope : null,
      publishedOnly: isStudent || isParent,
      limit: Number(req.query.limit || 50),
      offset: Number(req.query.offset || 0),
    });

    return res.status(200).json({
      success: true,
      message: 'Exams loaded successfully',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function getExamById(req, res, next) {
  if (!isValidUUID(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid exam ID', data: null });
  }

  try {
    const data = await examService.getExamById(req.params.id);
    const role = (req.user?.role || '').toLowerCase();

    if (role === 'parent') {
      const parentGrades = req.parentScope?.child_grade_ids || [];
      if (!parentGrades.includes(data.grade_id) || !data.is_published) {
        return res.status(403).json({
          success: false,
          message: 'Parents can only access published exams of their children\'s grades',
          data: null,
        });
      }
    }

    if (role.includes('teacher') && !role.includes('admin') && req.teacherScope) {
      const canAccess = req.teacherScope.canAccessGrade(data.grade_id) || req.teacherScope.canAccessSubject(data.subject_id);
      if (!canAccess) {
        return res.status(403).json({
          success: false,
          message: 'Teachers can only access exams for their assigned grades and subjects',
          data: null,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Exam details loaded',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function createExam(req, res, next) {
  const input = validateCreateExamInput(req.body);

  if (Object.keys(input.errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: input.errors,
    });
  }

  const role = (req.user?.role || '').toLowerCase();
  if (role.includes('teacher') && !role.includes('admin') && req.teacherScope) {
    const canAccessGrade = req.teacherScope.canAccessGrade(input.gradeId);
    const canAccessSubject = req.teacherScope.canAccessSubject(input.subjectId);
    if (!canAccessGrade || !canAccessSubject) {
      return res.status(403).json({
        success: false,
        message: 'Teachers can only create exams for their assigned grades and subjects',
        data: null,
      });
    }
  }

  try {
    const data = await examService.createExam(input);
    return res.status(201).json({
      success: true,
      message: 'Exam created successfully',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function updateExam(req, res, next) {
  if (!isValidUUID(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid exam ID', data: null });
  }

  const input = validateUpdateExamInput(req.body);
  if (Object.keys(input.errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: input.errors,
    });
  }

  try {
    const existing = await examService.getExamById(req.params.id);
    const role = (req.user?.role || '').toLowerCase();
    if (role.includes('teacher') && !role.includes('admin') && req.teacherScope) {
      const canAccessGrade = req.teacherScope.canAccessGrade(existing.grade_id);
      const canAccessSubject = req.teacherScope.canAccessSubject(existing.subject_id);
      if (!canAccessGrade || !canAccessSubject) {
        return res.status(403).json({
          success: false,
          message: 'Teachers can only edit exams for their assigned grades and subjects',
          data: null,
        });
      }
      if (input.gradeId && !req.teacherScope.canAccessGrade(input.gradeId)) {
        return res.status(403).json({
          success: false,
          message: 'Teachers cannot move exams to unassigned grades',
          data: null,
        });
      }
      if (input.subjectId && !req.teacherScope.canAccessSubject(input.subjectId)) {
        return res.status(403).json({
          success: false,
          message: 'Teachers cannot assign exams to unassigned subjects',
          data: null,
        });
      }
    }

    const data = await examService.updateExam(req.params.id, input);
    return res.status(200).json({
      success: true,
      message: 'Exam updated successfully',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function togglePublishExam(req, res, next) {
  if (!isValidUUID(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid exam ID', data: null });
  }

  try {
    const existing = await examService.getExamById(req.params.id);
    const role = (req.user?.role || '').toLowerCase();
    if (role.includes('teacher') && !role.includes('admin') && req.teacherScope) {
      const canAccessGrade = req.teacherScope.canAccessGrade(existing.grade_id);
      const canAccessSubject = req.teacherScope.canAccessSubject(existing.subject_id);
      if (!canAccessGrade || !canAccessSubject) {
        return res.status(403).json({
          success: false,
          message: 'Teachers can only publish exams for their assigned grades and subjects',
          data: null,
        });
      }
    }

    const isPublished = Boolean(req.body.isPublished);
    const data = await examService.togglePublish(req.params.id, isPublished);
    return res.status(200).json({
      success: true,
      message: `Exam ${isPublished ? 'published' : 'unpublished'} successfully`,
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function deleteExam(req, res, next) {
  if (!isValidUUID(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid exam ID', data: null });
  }

  try {
    const data = await examService.deleteExam(req.params.id);
    return res.status(200).json({
      success: true,
      message: 'Exam deleted successfully',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listExams,
  getExamById,
  createExam,
  updateExam,
  togglePublishExam,
  deleteExam,
};
