/**
 * Authorization Guards Middleware
 *
 * Factory functions for creating authorization guard middleware.
 * Guards verify not just that a user has a certain role, but that they have
 * permission to access/modify the specific resource in the request.
 *
 * Usage:
 *   router.get('/:id', authorizeSchoolAccess(), getTimetable);
 *   router.post('/marks', authorizeTeacherGradeStudent(), createMarks);
 *   router.get('/attendance', authorizeTeacherViewAttendance(), listAttendance);
 */

const { AppError } = require('../utils/error.handler');

/**
 * Verify that user has access to the school in the request
 * Extracts school_id from:
 * 1. req.params.schoolId (if provided)
 * 2. req.body.school_id (if provided)
 * 3. Current user's school (from token/auth)
 *
 * @returns {Function} Express middleware
 */
const authorizeSchoolAccess = () => async (req, res, next) => {
  try {
    const authService = req.app.get('authorizationService');
    if (!authService) {
      return next(new AppError('Authorization service not configured', 500));
    }

    const userId = req.user.sub;
    const schoolId =
      req.params.schoolId || req.body.school_id || req.user.school_id;

    if (!schoolId) {
      return next(
        new AppError('School context not found in request or user session', 400)
      );
    }

    const hasAccess = await authService.canUserAccessSchool(userId, schoolId);
    if (!hasAccess) {
      return next(
        new AppError(
          'You do not have permission to access this school',
          403
        )
      );
    }

    // Attach school_id to request for use in controllers
    req.school_id = schoolId;
    next();
  } catch (error) {
    next(new AppError(`Authorization check failed: ${error.message}`, 500));
  }
};

/**
 * Verify that a teacher can teach a specific subject
 * Extracts subject_id from req.params.subjectId or req.body.subject_id
 *
 * @returns {Function} Express middleware
 */
const authorizeTeacherSubject = () => async (req, res, next) => {
  try {
    const authService = req.app.get('authorizationService');
    if (!authService) {
      return next(new AppError('Authorization service not configured', 500));
    }

    // Only teachers need this check
    if (req.user.role !== 'Teacher') {
      return next();
    }

    const userId = req.user.sub;
    const subjectId =
      req.params.subjectId || req.body.subject_id;

    if (!subjectId) {
      return next(new AppError('Subject ID not found in request', 400));
    }

    const canTeach = await authService.canTeacherTeachSubject(userId, subjectId);
    if (!canTeach) {
      return next(
        new AppError(
          'You are not assigned to teach this subject',
          403
        )
      );
    }

    next();
  } catch (error) {
    next(new AppError(`Teacher subject authorization failed: ${error.message}`, 500));
  }
};

/**
 * Verify that a teacher is assigned to a specific section
 * Extracts section_id from req.params.sectionId or req.body.section_id
 *
 * @returns {Function} Express middleware
 */
const authorizeTeacherSection = () => async (req, res, next) => {
  try {
    const authService = req.app.get('authorizationService');
    if (!authService) {
      return next(new AppError('Authorization service not configured', 500));
    }

    // Only teachers need this check
    if (req.user.role !== 'Teacher') {
      return next();
    }

    const userId = req.user.sub;
    const sectionId =
      req.params.sectionId || req.body.section_id;

    if (!sectionId) {
      return next(new AppError('Section ID not found in request', 400));
    }

    const canTeach = await authService.canTeacherTeachSection(userId, sectionId);
    if (!canTeach) {
      return next(
        new AppError(
          'You are not assigned to teach this section',
          403
        )
      );
    }

    next();
  } catch (error) {
    next(new AppError(`Teacher section authorization failed: ${error.message}`, 500));
  }
};

/**
 * Verify that a teacher can access a specific student
 * Extracts student_id from req.params.studentId or req.body.student_id
 *
 * @returns {Function} Express middleware
 */
const authorizeTeacherStudent = () => async (req, res, next) => {
  try {
    const authService = req.app.get('authorizationService');
    if (!authService) {
      return next(new AppError('Authorization service not configured', 500));
    }

    // Only teachers need this check
    if (req.user.role !== 'Teacher') {
      return next();
    }

    const userId = req.user.sub;
    const studentId =
      req.params.studentId || req.params.id || req.body.student_id;

    if (!studentId) {
      return next(new AppError('Student ID not found in request', 400));
    }

    const canAccess = await authService.canTeacherAccessStudent(userId, studentId);
    if (!canAccess) {
      return next(
        new AppError(
          'You do not have permission to access this student',
          403
        )
      );
    }

    next();
  } catch (error) {
    next(new AppError(`Teacher-student authorization failed: ${error.message}`, 500));
  }
};

/**
 * Verify that a parent is linked to a specific student
 * Extracts student_id from req.params.studentId, req.params.id, or req.body.student_id
 *
 * @returns {Function} Express middleware
 */
const authorizeParentStudent = () => async (req, res, next) => {
  try {
    const authService = req.app.get('authorizationService');
    if (!authService) {
      return next(new AppError('Authorization service not configured', 500));
    }

    // Only parents need this check
    if (req.user.role !== 'Parent') {
      return next();
    }

    const parentId = req.user.sub;
    const studentId =
      req.params.studentId || req.params.id || req.body.student_id;

    if (!studentId) {
      return next(new AppError('Student ID not found in request', 400));
    }

    const isParent = await authService.isParentOfStudent(parentId, studentId);
    if (!isParent) {
      return next(
        new AppError(
          'You do not have permission to access this student',
          403
        )
      );
    }

    next();
  } catch (error) {
    next(new AppError(`Parent-student authorization failed: ${error.message}`, 500));
  }
};

/**
 * Verify that a teacher can grade a student in a specific subject
 * Extracts: student_id, subject_id from params/body
 *
 * @returns {Function} Express middleware
 */
const authorizeTeacherGradeStudent = () => async (req, res, next) => {
  try {
    const authService = req.app.get('authorizationService');
    if (!authService) {
      return next(new AppError('Authorization service not configured', 500));
    }

    // Only teachers need this check
    if (req.user.role !== 'Teacher') {
      return next();
    }

    const userId = req.user.sub;
    const studentId = req.params.studentId || req.body.student_id;
    const subjectId = req.params.subjectId || req.body.subject_id;

    if (!studentId || !subjectId) {
      return next(new AppError('Student ID and Subject ID required', 400));
    }

    const canGrade = await authService.canTeacherGradeStudent(
      userId,
      studentId,
      subjectId
    );
    if (!canGrade) {
      return next(
        new AppError(
          'You do not have permission to grade this student in this subject',
          403
        )
      );
    }

    next();
  } catch (error) {
    next(new AppError(`Teacher grading authorization failed: ${error.message}`, 500));
  }
};

/**
 * Verify that a student can view marks record
 * Extracts marks_id from req.params.marksId or req.params.id
 *
 * @returns {Function} Express middleware
 */
const authorizeStudentViewMarks = () => async (req, res, next) => {
  try {
    const authService = req.app.get('authorizationService');
    if (!authService) {
      return next(new AppError('Authorization service not configured', 500));
    }

    // Only students need this check
    if (req.user.role !== 'Student') {
      return next();
    }

    const studentId = req.user.sub;
    const marksId = req.params.marksId || req.params.id;

    if (!marksId) {
      return next(new AppError('Marks ID not found in request', 400));
    }

    const canView = await authService.canStudentViewMarks(studentId, marksId);
    if (!canView) {
      return next(
        new AppError(
          'You do not have permission to view these marks',
          403
        )
      );
    }

    next();
  } catch (error) {
    next(new AppError(`Student marks authorization failed: ${error.message}`, 500));
  }
};

/**
 * Verify that a parent can view marks for their child
 * Extracts marks_id from req.params.marksId or req.params.id
 *
 * @returns {Function} Express middleware
 */
const authorizeParentViewMarks = () => async (req, res, next) => {
  try {
    const authService = req.app.get('authorizationService');
    if (!authService) {
      return next(new AppError('Authorization service not configured', 500));
    }

    // Only parents need this check
    if (req.user.role !== 'Parent') {
      return next();
    }

    const parentId = req.user.sub;
    const marksId = req.params.marksId || req.params.id;

    if (!marksId) {
      return next(new AppError('Marks ID not found in request', 400));
    }

    const canView = await authService.canParentViewMarks(parentId, marksId);
    if (!canView) {
      return next(
        new AppError(
          'You do not have permission to view these marks',
          403
        )
      );
    }

    next();
  } catch (error) {
    next(new AppError(`Parent marks authorization failed: ${error.message}`, 500));
  }
};

/**
 * Combined guard: Verify role AND school access
 * Useful for most protected endpoints
 *
 * @param {...string} allowedRoles - Roles that are allowed
 * @returns {Function} Express middleware
 */
const authorizeRoleAndSchool = (...allowedRoles) => async (req, res, next) => {
  try {
    // First check role
    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          `This action requires one of these roles: ${allowedRoles.join(', ')}`,
          403
        )
      );
    }

    // Then check school access
    const authService = req.app.get('authorizationService');
    if (!authService) {
      return next(new AppError('Authorization service not configured', 500));
    }

    const schoolId = req.params.schoolId || req.user.school_id;
    if (!schoolId) {
      return next(new AppError('School context not found', 400));
    }

    const hasAccess = await authService.canUserAccessSchool(
      req.user.sub,
      schoolId
    );
    if (!hasAccess) {
      return next(
        new AppError('You do not have permission to access this school', 403)
      );
    }

    req.school_id = schoolId;
    next();
  } catch (error) {
    next(new AppError(`Role and school authorization failed: ${error.message}`, 500));
  }
};

module.exports = {
  authorizeSchoolAccess,
  authorizeTeacherSubject,
  authorizeTeacherSection,
  authorizeTeacherStudent,
  authorizeParentStudent,
  authorizeTeacherGradeStudent,
  authorizeStudentViewMarks,
  authorizeParentViewMarks,
  authorizeRoleAndSchool,
};
