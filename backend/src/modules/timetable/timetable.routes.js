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

const router = express.Router();

router.use(authMiddleware);

// --- Timetable Header & Role-Specific Routes ---
router.get('/', listTimetables);
router.get('/active', getActiveTimetable);
router.get('/my-schedule', getMySchedule);
router.get('/:id', getTimetableById);

router.post('/', authorizeRoles('School Admin', 'Admin', 'Staff'), createTimetable);
router.put('/:id', authorizeRoles('School Admin', 'Admin', 'Staff'), updateTimetable);
router.delete('/:id', authorizeRoles('School Admin', 'Admin'), deleteTimetable);
router.post('/:id/clone', authorizeRoles('School Admin', 'Admin', 'Staff'), cloneTimetable);
router.post('/:id/publish', authorizeRoles('School Admin', 'Admin'), publishTimetable);
router.post('/:id/archive', authorizeRoles('School Admin', 'Admin'), archiveTimetable);
router.post('/:id/validate', authorizeRoles('School Admin', 'Admin', 'Staff', 'Teacher'), validateTimetable);
router.post('/:id/auto-generate', authorizeRoles('School Admin', 'Admin', 'Staff'), autoGenerateTimetable);

// --- Timetable Entry Routes ---
router.get('/:id/entries', listEntries);
router.post('/:id/entries', authorizeRoles('School Admin', 'Admin', 'Staff'), createEntry);
router.post('/:id/entries/check-conflict', authorizeRoles('School Admin', 'Admin', 'Staff'), checkEntryConflict);

router.put('/entries/:entryId', authorizeRoles('School Admin', 'Admin', 'Staff'), updateEntry);
router.delete('/entries/:entryId', authorizeRoles('School Admin', 'Admin'), deleteEntry);

module.exports = router;
