const { db } = require('../../config/database');
const { ClassTeacherService, ClassTeacherConflictError, ClassTeacherValidationError } = require('./class-teacher.service');
const ClassTeacherRepository = require('./class-teacher.repository');

const classTeacherService = new ClassTeacherService(new ClassTeacherRepository(db));

async function listClassTeachers(req, res, next) {
  try {
    const data = await classTeacherService.listAssignments({
      search: req.query.search || '',
      section_id: req.query.section_id || req.query.sectionId || '',
      academic_year_id: req.query.academic_year_id || req.query.academicYearId || '',
      teacher_id: req.query.teacher_id || req.query.teacherId || '',
      status: req.query.status || 'ACTIVE',
      limit: Number(req.query.limit || 20),
      offset: Number(req.query.offset || 0),
    });

    return res.status(200).json({ success: true, message: 'Class teachers loaded successfully.', data });
  } catch (error) {
    return next(error);
  }
}

async function assignClassTeacher(req, res, next) {
  try {
    const data = await classTeacherService.assignClassTeacher(req.body);
    return res.status(201).json({ success: true, message: 'Class teacher assigned successfully.', data });
  } catch (error) {
    return next(error);
  }
}

async function getClassTeacherBySection(req, res, next) {
  try {
    const data = await classTeacherService.getActiveClassTeacherForSection(req.params.sectionId);
    return res.status(200).json({ success: true, message: 'Class teacher loaded successfully.', data });
  } catch (error) {
    return next(error);
  }
}

async function deactivateClassTeacher(req, res, next) {
  try {
    const data = await classTeacherService.deactivateAssignment(req.params.id);
    return res.status(200).json({ success: true, message: 'Class teacher assignment deactivated successfully.', data });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listClassTeachers,
  assignClassTeacher,
  getClassTeacherBySection,
  deactivateClassTeacher,
};
