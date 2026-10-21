const AttendanceRepository = require('./attendance.repository');
const AttendanceService = require('./attendance.service');
const {
  validateSheetQuery,
  validateBulkAttendanceInput,
  validateReportQuery,
  isValidUUID,
  isValidDate,
} = require('./attendance.validation');
const { db } = require('../../config/database');
const triggerService = require('../notifications/notification-trigger.service');

const attendanceService = new AttendanceService(new AttendanceRepository(db));

async function getRosterSheet(req, res, next) {
  const role = (req.user?.role || '').toLowerCase().trim();
  if (role === 'student') {
    return res.status(403).json({ success: false, message: 'Students can only access their own attendance history', data: null });
  }

  const query = validateSheetQuery(req.query);

  if (Object.keys(query.errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: query.errors,
    });
  }

  if (role === 'teacher' && req.teacherScope) {
    const canAccess = req.teacherScope.canAccessSection(query.sectionId);
    if (!canAccess) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this class section as a subject teacher or class teacher',
        data: null,
      });
    }
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
  const role = (req.user?.role || '').toLowerCase().trim();
  const input = validateBulkAttendanceInput(req.body);

  if (Object.keys(input.errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: input.errors,
    });
  }

  if (role === 'teacher' && req.teacherScope) {
    const canAccess = req.teacherScope.canAccessSection(input.sectionId);
    if (!canAccess) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this class section as a subject teacher or class teacher',
        data: null,
      });
    }
  }

  try {
    const recordedBy = req.user ? (req.user.id || req.user.sub) : null;
    const data = await attendanceService.saveBulkAttendance({
      sectionId: input.sectionId,
      date: input.date,
      academicYearId: input.academicYearId,
      recordedBy,
      records: input.records,
    });

    // Asynchronously dispatch automated absence and late arrival alerts
    triggerService.triggerAttendanceAlerts({
      schoolId: req.user?.school_id,
      date: input.date,
      records: input.records,
      recordedBy,
    }).catch((err) => {
      console.error('[AttendanceController] Notification dispatch error:', err);
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
  const role = (req.user?.role || '').toLowerCase().trim();
  const date = req.query.date;
  const sectionId = req.query.sectionId;

  if (!isValidDate(date)) {
    return res.status(400).json({
      success: false,
      message: 'Valid date (YYYY-MM-DD) is required',
      data: null,
    });
  }

  if (role === 'teacher' && req.teacherScope && sectionId) {
    const canAccess = req.teacherScope.canAccessSection(sectionId);
    if (!canAccess) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this class section as a subject teacher or class teacher',
        data: null,
      });
    }
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
  const role = (req.user?.role || '').toLowerCase().trim();
  if (role === 'student') {
    return res.status(403).json({ success: false, message: 'Students can only access their own attendance history', data: null });
  }

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

  // Parent RBAC: Parent can only view matrix for sections their children are enrolled in
  if (role === 'parent') {
    const allowedSections = req.parentScope?.child_section_ids || [];
    if (!allowedSections.includes(sectionId)) {
      return res.status(403).json({
        success: false,
        message: "Access denied: You are only authorized to view attendance matrix for your children's class sections",
        data: null,
      });
    }
  }

  // Teacher RBAC: Teacher can only view matrix for assigned sections
  if (role === 'teacher' && req.teacherScope) {
    const canAccess = req.teacherScope.canAccessSection(sectionId);
    if (!canAccess) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this class section as a subject teacher or class teacher',
        data: null,
      });
    }
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
  let studentId = req.params.studentId;
  const role = (req.user?.role || '').toLowerCase().trim();

  if (role === 'parent') {
    if (studentId === 'me') {
      studentId = req.parentScope?.child_student_ids[0];
      if (!studentId) {
        return res.status(200).json({
          success: true,
          message: 'No children linked to parent',
          data: { student: null, attendance: [], history: [], stats: {} },
        });
      }
    } else if (!req.parentScope?.child_student_ids.includes(studentId)) {
      return res.status(403).json({
        success: false,
        message: 'Parents can only access attendance of their own linked children',
        data: null,
      });
    }
  }

  if (!isValidUUID(studentId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid student ID format',
      data: null,
    });
  }

  try {
    if (role === 'teacher' && req.teacherScope) {
      const studentRes = await db.query(
        `SELECT section_id FROM students WHERE (id = $1 OR user_id = $1) AND deleted_at IS NULL LIMIT 1`,
        [studentId]
      );
      const student = studentRes.rows[0] || null;
      if (student && !req.teacherScope.canAccessStudent(student.section_id)) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to view attendance for this student',
          data: null,
        });
      }
    }

    const limit = Number(req.query.limit || 100);
    const offset = Number(req.query.offset || 0);
    const academicYearId = req.query.academicYearId && isValidUUID(req.query.academicYearId) ? req.query.academicYearId : (req.query.academicYearId === 'all' ? 'all' : null);

    const data = await attendanceService.getStudentAttendance(studentId, { academicYearId, limit, offset });

    return res.status(200).json({
      success: true,
      message: 'Student attendance history loaded',
      data: {
        history: data.history || [],
        attendance: data.history || [],
        stats: data.stats || {},
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function getMyChildrenAttendance(req, res, next) {
  try {
    const children = req.parentScope?.children || [];
    if (!children.length) {
      return res.status(200).json({
        success: true,
        message: 'No children linked to parent',
        data: [],
      });
    }

    const limit = Number(req.query.limit || 100);
    const offset = Number(req.query.offset || 0);
    const academicYearId = req.query.academicYearId && isValidUUID(req.query.academicYearId) ? req.query.academicYearId : (req.query.academicYearId === 'all' ? 'all' : null);

    const results = await Promise.all(
      children.map(async (child) => {
        const historyData = await attendanceService.getStudentAttendance(child.id, { academicYearId, limit, offset });
        const list = historyData.history || [];
        return {
          student: child,
          history: list,
          attendance: list,
          stats: historyData.stats || {},
        };
      })
    );

    return res.status(200).json({
      success: true,
      message: 'Children attendance loaded successfully',
      data: results,
    });
  } catch (error) {
    return next(error);
  }
}

async function getOwnAttendance(req, res, next) {
  if (!req.studentScope?.student_id) {
    return res.status(403).json({
      success: false,
      message: 'Student profile is not linked to this account',
      data: null,
    });
  }

  try {
    const limit = Number(req.query.limit || 30);
    const offset = Number(req.query.offset || 0);
    const academicYearId = req.query.academicYearId && isValidUUID(req.query.academicYearId) ? req.query.academicYearId : (req.query.academicYearId === 'all' ? 'all' : null);
    const data = await attendanceService.getStudentAttendance(
      req.studentScope.student_id,
      { academicYearId, limit, offset }
    );

    return res.status(200).json({
      success: true,
      message: 'Your attendance history loaded',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function getAttendanceReport(req, res, next) {
  const role = (req.user?.role || '').toLowerCase().trim();
  const userSub = req.user?.sub;
  const userEmail = (req.user?.email || '').trim().toLowerCase();
  const schoolId = req.user?.school_id || null;

  const {
    academicYearId,
    gradeId,
    sectionId,
    studentId,
    startDate,
    endDate,
    period,
    errors,
  } = validateReportQuery(req.query);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: errors,
    });
  }

  try {
    let mode = 'cohort';
    let targetStudentId = studentId;
    let accessibleSectionIds = null;

    if (role.includes('student') && !role.includes('admin')) {
      const studentRes = await db.query(
        `SELECT id FROM students
         WHERE (user_id = $1 OR (email IS NOT NULL AND LOWER(email) = LOWER($2)))
           AND deleted_at IS NULL
         LIMIT 1`,
        [userSub, userEmail]
      );

      if (!studentRes.rows.length) {
        return res.status(200).json({
          success: true,
          message: 'Student profile not linked',
          data: {
            mode: 'individual',
            kpis: { overallAttendanceRate: 0, totalMarkedDays: 0 },
            individualData: null,
            broadsheet: [],
            atRiskRegister: [],
          },
        });
      }

      mode = 'individual';
      targetStudentId = studentRes.rows[0].id;
    } else if (role.includes('parent')) {
      const childIds = req.parentScope?.child_student_ids || [];
      if (studentId) {
        if (!childIds.includes(studentId)) {
          return res.status(403).json({
            success: false,
            message: 'Parents can only view reports for their own children',
            data: null,
          });
        }
        targetStudentId = studentId;
      } else {
        targetStudentId = childIds[0] || null;
      }

      if (!targetStudentId) {
        return res.status(200).json({
          success: true,
          message: 'No children linked to parent',
          data: {
            mode: 'individual',
            kpis: { overallAttendanceRate: 0, totalMarkedDays: 0 },
            individualData: null,
            broadsheet: [],
            atRiskRegister: [],
          },
        });
      }

      mode = 'individual';
    } else if (role.includes('teacher') && !role.includes('admin')) {
      const teacherId = req.teacherScope?.teacher_id;
      if (!teacherId) {
        return res.status(403).json({
          success: false,
          message: 'Teacher profile is not linked or has no active assignments',
          data: null,
        });
      }

      accessibleSectionIds = req.teacherScope?.all_accessible_section_ids || [];
      if (sectionId) {
        if (!accessibleSectionIds.includes(sectionId)) {
          return res.status(403).json({
            success: false,
            message: 'You are not assigned to manage or teach this section',
            data: null,
          });
        }
      }
    }

    const data = await attendanceService.generateAttendanceReport({
      schoolId,
      academicYearId,
      gradeId,
      sectionId,
      startDate,
      endDate,
      period,
      accessibleSectionIds,
      targetStudentId,
      mode,
    });

    return res.status(200).json({
      success: true,
      message: 'Attendance reports generated successfully',
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
  getMyChildrenAttendance,
  getOwnAttendance,
  getAttendanceReport,
};
