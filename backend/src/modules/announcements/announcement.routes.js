const express = require('express');
const {
  listAnnouncements,
  getStats,
  getAnnouncementById,
  createAnnouncement,
  updateAnnouncement,
  togglePin,
  toggleStatus,
  acknowledgeAnnouncement,
  getAcknowledgements,
  deleteAnnouncement,
} = require('./announcement.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const authorizeRoles = require('../../middlewares/role.middleware');
const { attachParentScope } = require('../../middlewares/parent.scope');
const { attachTeacherScope } = require('../../middlewares/teacher.scope');

const router = express.Router();

router.use(authMiddleware);
router.use(attachParentScope);
router.use(attachTeacherScope);

// General Listings & Analytics
router.get('/', listAnnouncements);
router.get('/stats', getStats);

// Announcement Detail & Acknowledgement Audit
router.get('/:id', getAnnouncementById);
router.get(
  '/:id/acknowledgements',
  authorizeRoles('School Admin', 'Admin', 'Teacher', 'Staff'),
  getAcknowledgements
);

// Management (Create, Edit, Pin, Status, Delete)
router.post(
  '/',
  authorizeRoles('School Admin', 'Admin', 'Teacher', 'Staff'),
  createAnnouncement
);
router.put(
  '/:id',
  authorizeRoles('School Admin', 'Admin', 'Teacher', 'Staff'),
  updateAnnouncement
);
router.patch(
  '/:id/pin',
  authorizeRoles('School Admin', 'Admin'),
  togglePin
);
router.patch(
  '/:id/status',
  authorizeRoles('School Admin', 'Admin', 'Teacher', 'Staff'),
  toggleStatus
);
router.delete(
  '/:id',
  authorizeRoles('School Admin', 'Admin', 'Teacher'),
  deleteAnnouncement
);

// User Acknowledgement Action (Parents, Students, Staff, Teachers)
router.post('/:id/acknowledge', acknowledgeAnnouncement);

module.exports = router;
