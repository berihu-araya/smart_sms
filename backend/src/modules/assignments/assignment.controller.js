const AssignmentRepository = require('./assignment.repository');
const AssignmentService = require('./assignment.service');
const {
  isValidUUID,
  validateCreateAssignmentInput,
  validateUpdateAssignmentInput,
  validateSubmissionInput,
  validateGradeSubmissionInput,
} = require('./assignment.validation');
const { db } = require('../../config/database');

const assignmentService = new AssignmentService(new AssignmentRepository(db));

async function listAssignments(req, res, next) {
  try {
    const scope = await assignmentService.resolveUserScope(req.user);

    const {
      search,
      academicYearId,
      gradeId,
      sectionId,
      subjectId,
      teacherId,
      status,
      limit,
      offset,
      childStudentId,
    } = req.query;

    let targetStudentId = scope.isStudent ? scope.studentId : null;
    let targetChildIds = scope.isParent ? (childStudentId ? [childStudentId] : scope.childStudentIds) : null;
    let targetTeacherId = scope.isTeacher ? scope.teacherId : teacherId || null;

    const data = await assignmentService.listAssignments({
      search: search || '',
      academicYearId: academicYearId && isValidUUID(academicYearId) ? academicYearId : null,
      gradeId: gradeId && isValidUUID(gradeId) ? gradeId : null,
      sectionId: sectionId && isValidUUID(sectionId) ? sectionId : null,
      subjectId: subjectId && isValidUUID(subjectId) ? subjectId : null,
      teacherId: targetTeacherId && isValidUUID(targetTeacherId) ? targetTeacherId : null,
      status: status || null,
      studentId: targetStudentId,
      childStudentIds: targetChildIds,
      schoolId: req.user?.school_id || null,
      limit: Number(limit || 50),
      offset: Number(offset || 0),
    });

    return res.status(200).json({
      success: true,
      message: 'Assignments loaded successfully',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function getStats(req, res, next) {
  try {
    const scope = await assignmentService.resolveUserScope(req.user);

    const stats = await assignmentService.getStats({
      schoolId: req.user?.school_id || null,
      teacherId: scope.isTeacher ? scope.teacherId : null,
      studentId: scope.isStudent ? scope.studentId : null,
    });

    return res.status(200).json({
      success: true,
      message: 'Assignment statistics loaded',
      data: stats,
    });
  } catch (error) {
    return next(error);
  }
}

async function getAssignmentById(req, res, next) {
  const { id } = req.params;
  if (!isValidUUID(id)) {
    return res.status(400).json({ success: false, message: 'Invalid assignment ID', data: null });
  }

  try {
    const scope = await assignmentService.resolveUserScope(req.user);
    const data = await assignmentService.getAssignmentById(id, scope.studentId);

    return res.status(200).json({
      success: true,
      message: 'Assignment details loaded',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function createAssignment(req, res, next) {
  const input = validateCreateAssignmentInput(req.body);

  if (Object.keys(input.errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: input.errors,
    });
  }

  try {
    const scope = await assignmentService.resolveUserScope(req.user);
    const data = await assignmentService.createAssignment(input, req.user, scope.teacherId);

    return res.status(201).json({
      success: true,
      message: 'Assignment created successfully',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function updateAssignment(req, res, next) {
  const { id } = req.params;
  if (!isValidUUID(id)) {
    return res.status(400).json({ success: false, message: 'Invalid assignment ID', data: null });
  }

  const { errors, payload } = validateUpdateAssignmentInput(req.body);
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: errors,
    });
  }

  try {
    const data = await assignmentService.updateAssignment(id, payload);
    return res.status(200).json({
      success: true,
      message: 'Assignment updated successfully',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function toggleStatus(req, res, next) {
  const { id } = req.params;
  if (!isValidUUID(id)) {
    return res.status(400).json({ success: false, message: 'Invalid assignment ID', data: null });
  }

  const status = req.body.status;
  if (!status || !['DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED'].includes(status.toUpperCase())) {
    return res.status(400).json({
      success: false,
      message: 'Status must be DRAFT, PUBLISHED, CLOSED, or ARCHIVED',
      data: null,
    });
  }

  try {
    const data = await assignmentService.toggleStatus(id, status);
    return res.status(200).json({
      success: true,
      message: `Assignment marked as ${status.toUpperCase()}`,
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function deleteAssignment(req, res, next) {
  const { id } = req.params;
  if (!isValidUUID(id)) {
    return res.status(400).json({ success: false, message: 'Invalid assignment ID', data: null });
  }

  try {
    const data = await assignmentService.deleteAssignment(id);
    return res.status(200).json({
      success: true,
      message: 'Assignment deleted successfully',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function listSubmissions(req, res, next) {
  const { id } = req.params;
  if (!isValidUUID(id)) {
    return res.status(400).json({ success: false, message: 'Invalid assignment ID', data: null });
  }

  try {
    const { sectionId, status, search } = req.query;
    const data = await assignmentService.listSubmissions(id, {
      sectionId: sectionId && isValidUUID(sectionId) ? sectionId : null,
      status: status || null,
      search: search || '',
    });

    return res.status(200).json({
      success: true,
      message: 'Submissions roster loaded',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function getMySubmission(req, res, next) {
  const { id } = req.params;
  if (!isValidUUID(id)) {
    return res.status(400).json({ success: false, message: 'Invalid assignment ID', data: null });
  }

  try {
    const scope = await assignmentService.resolveUserScope(req.user);
    if (!scope.studentId) {
      return res.status(403).json({
        success: false,
        message: 'You must have a linked student account to view personal submissions',
        data: null,
      });
    }

    const data = await assignmentService.getMySubmission(id, scope.studentId);
    return res.status(200).json({
      success: true,
      message: 'My submission loaded',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function submitAssignment(req, res, next) {
  const { id } = req.params;
  if (!isValidUUID(id)) {
    return res.status(400).json({ success: false, message: 'Invalid assignment ID', data: null });
  }

  const validation = validateSubmissionInput(req.body);
  if (Object.keys(validation.errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Submission validation failed',
      data: validation.errors,
    });
  }

  try {
    const scope = await assignmentService.resolveUserScope(req.user);
    if (!scope.studentId) {
      return res.status(403).json({
        success: false,
        message: 'You must have a linked student account to submit assignments',
        data: null,
      });
    }

    const data = await assignmentService.submitAssignment(
      id,
      validation,
      scope.studentId,
      req.user.school_id
    );

    return res.status(200).json({
      success: true,
      message: 'Assignment submitted successfully',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function gradeSubmission(req, res, next) {
  const { submissionId } = req.params;
  if (!isValidUUID(submissionId)) {
    return res.status(400).json({ success: false, message: 'Invalid submission ID', data: null });
  }

  const validation = validateGradeSubmissionInput(req.body, req.body.maxMarks || 1000);
  if (Object.keys(validation.errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Grading validation failed',
      data: validation.errors,
    });
  }

  try {
    const scope = await assignmentService.resolveUserScope(req.user);
    const data = await assignmentService.gradeSubmission(
      submissionId,
      validation,
      scope.teacherId
    );

    return res.status(200).json({
      success: true,
      message: 'Submission graded successfully',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listAssignments,
  getStats,
  getAssignmentById,
  createAssignment,
  updateAssignment,
  toggleStatus,
  deleteAssignment,
  listSubmissions,
  getMySubmission,
  submitAssignment,
  gradeSubmission,
};
