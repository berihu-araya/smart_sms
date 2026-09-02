const express = require('express');
const {
  listTimetables,
  getTimetableById,
  createTimetable,
  updateTimetable,
  deleteTimetable,
  cloneTimetable,
  validateTimetable,
  listEntries,
  createEntry,
  updateEntry,
  deleteEntry,
  checkEntryConflict,
} = require('./timetable.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const authorizeRoles = require('../../middlewares/role.middleware');

const router = express.Router();

router.use(authMiddleware);

// --- Timetable Header Routes ---
router.get('/', listTimetables);
router.get('/:id', getTimetableById);

router.post('/', authorizeRoles('School Admin', 'Admin', 'Staff'), createTimetable);
router.put('/:id', authorizeRoles('School Admin', 'Admin', 'Staff'), updateTimetable);
router.delete('/:id', authorizeRoles('School Admin', 'Admin'), deleteTimetable);
router.post('/:id/clone', authorizeRoles('School Admin', 'Admin', 'Staff'), cloneTimetable);
router.post('/:id/validate', authorizeRoles('School Admin', 'Admin', 'Staff', 'Teacher'), validateTimetable);

// --- Timetable Entry Routes ---
router.get('/:id/entries', listEntries);
router.post('/:id/entries', authorizeRoles('School Admin', 'Admin', 'Staff'), createEntry);
router.post('/:id/entries/check-conflict', authorizeRoles('School Admin', 'Admin', 'Staff'), checkEntryConflict);

router.put('/entries/:entryId', authorizeRoles('School Admin', 'Admin', 'Staff'), updateEntry);
router.delete('/entries/:entryId', authorizeRoles('School Admin', 'Admin'), deleteEntry);

module.exports = router;
