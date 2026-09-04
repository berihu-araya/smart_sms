const express = require('express');
const {
  listTimetables,
  getTimetableById,
  getActiveTimetable,
  getMySchedule,
  createTimetable,
  updateTimetable,
  deleteTimetable,
  cloneTimetable,
  publishTimetable,
  archiveTimetable,
  validateTimetable,
  listEntries,
  createEntry,
  updateEntry,
  deleteEntry,
  checkEntryConflict,
} = require('./timetable.controller');
const { autoGenerateTimetable } = require('./generator/generator.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const authorizeRoles = require('../../middlewares/role.middleware');
const {
  authorizeSchoolAccess,
} = require('../../middlewares/authorization.guard');

const router = express.Router();

router.use(authMiddleware);

// --- Timetable Header & Role-Specific Routes ---
// LIST: School Admin/Staff see all; Teachers/Students/Parents see filtered list
router.get('/', authorizeRoles('School Admin', 'Admin', 'Staff', 'Teacher', 'Student', 'Parent'), listTimetables);

// GET ACTIVE: Any authenticated user can get the active timetable
router.get('/active', getActiveTimetable);

// MY SCHEDULE: Only Teachers, Students, and Parents can view their own schedules
router.get('/my-schedule', authorizeRoles('Teacher', 'Student', 'Parent'), getMySchedule);

// GET BY ID: Anyone can view a specific timetable's details
router.get('/:id', getTimetableById);

// CREATE: Only School Admin and Staff
router.post('/', authorizeRoles('School Admin', 'Admin', 'Staff'), createTimetable);

// UPDATE: Only School Admin and Staff
router.put('/:id', authorizeRoles('School Admin', 'Admin', 'Staff'), updateTimetable);

// DELETE: Only School Admin and Admin
router.delete('/:id', authorizeRoles('School Admin', 'Admin'), deleteTimetable);

// CLONE: Only School Admin and Staff
router.post('/:id/clone', authorizeRoles('School Admin', 'Admin', 'Staff'), cloneTimetable);

// PUBLISH: Only School Admin and Admin
router.post('/:id/publish', authorizeRoles('School Admin', 'Admin'), publishTimetable);

// ARCHIVE: Only School Admin and Admin
router.post('/:id/archive', authorizeRoles('School Admin', 'Admin'), archiveTimetable);

// VALIDATE: School Admin, Staff, and Teachers can validate
router.post('/:id/validate', authorizeRoles('School Admin', 'Admin', 'Staff', 'Teacher'), validateTimetable);

// AUTO-GENERATE: Only School Admin and Staff
router.post('/:id/auto-generate', authorizeRoles('School Admin', 'Admin', 'Staff'), autoGenerateTimetable);

// --- Timetable Entry Routes ---
// LIST ENTRIES: Teachers/Students/Parents see filtered; Admins see all
router.get('/:id/entries', authorizeRoles('School Admin', 'Admin', 'Staff', 'Teacher', 'Student', 'Parent'), listEntries);

// CREATE ENTRY: Only School Admin and Staff
router.post('/:id/entries', authorizeRoles('School Admin', 'Admin', 'Staff'), createEntry);


// CHECK CONFLICT: Only School Admin and Staff
router.post('/:id/entries/check-conflict', authorizeRoles('School Admin', 'Admin', 'Staff'), checkEntryConflict);

// UPDATE ENTRY: Only School Admin and Staff
router.put('/entries/:entryId', authorizeRoles('School Admin', 'Admin', 'Staff'), updateEntry);

// DELETE ENTRY: Only School Admin and Admin
router.delete('/entries/:entryId', authorizeRoles('School Admin', 'Admin'), deleteEntry);

module.exports = router;
