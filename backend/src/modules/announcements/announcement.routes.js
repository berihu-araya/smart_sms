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

/**
 * Guard: Every request to this module requires a valid school context in the JWT.
 * If school_id is missing (stale token from a session before this field was added),
 * return a clear 401 telling the user to re-authenticate.
 */
router.use((req, res, next) => {
  if (!req.user?.school_id) {
    return res.status(401).json({
      success: false,
      message: 'Session expired or school context missing. Please log out and log in again.',
      data: null,
    });
  }
  return next();
});

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
