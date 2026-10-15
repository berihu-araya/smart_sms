const AnnouncementRepository = require('./announcement.repository');
const { db } = require('../../config/database');
const {
  validateCreateAnnouncement,
  validateUpdateAnnouncement,
  VALID_STATUSES,
} = require('./announcement.validation');

const repository = new AnnouncementRepository(db);

/**
 * List announcements with filtering, pagination, and RBAC scoping.
 */
async function listAnnouncements(req, res, next) {
  try {
    const data = await repository.list(req.query, {
      user: req.user,
      parentScope: req.parentScope,
      teacherScope: req.teacherScope,
    });
    return res.status(200).json({
      success: true,
      message: 'Announcements loaded successfully',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Get dashboard KPI counters for announcements.
 */
async function getStats(req, res, next) {
  try {
    const data = await repository.getStats({
      user: req.user,
    });
    return res.status(200).json({
      success: true,
      message: 'Announcement stats loaded successfully',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Get single announcement details.
 */
async function getAnnouncementById(req, res, next) {
  try {
    const data = await repository.findById(req.params.id, {
      user: req.user,
    });

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found',
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Announcement loaded successfully',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Create a new announcement.
 */
async function createAnnouncement(req, res, next) {
  try {
    const validation = validateCreateAnnouncement(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.errors[0] || 'Invalid announcement data',
        errors: validation.errors,
        data: null,
      });
    }

    // Role-specific creation constraints
    const role = (req.user?.role || '').toLowerCase().trim();
    if (role === 'teacher') {
      const allowedTeacherAudiences = ['ALL', 'STUDENTS', 'PARENTS'];
      if (!allowedTeacherAudiences.includes(validation.sanitized.audience)) {
        return res.status(403).json({
          success: false,
          message: 'Teachers can only target Students, Parents, or All School',
          data: null,
        });
      }
    }

    const data = await repository.create(validation.sanitized, {
      user: req.user,
    });

    // Auto-sync to notifications table so mobile/inbox feeds reflect published announcement
    if (data.status === 'PUBLISHED') {
      db.query(
        `INSERT INTO notifications (school_id, grade_id, section_id, audience, title, body, published_at, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          req.user.school_id,
          data.grade_id || null,
          data.section_id || null,
          data.audience || 'ALL',
          data.title,
          data.content,
          data.published_at || new Date().toISOString(),
          req.user.sub,
        ]
      ).catch((err) => console.error('Notification auto-sync error:', err.message));
    }

    return res.status(201).json({
      success: true,
      message: 'Announcement published successfully',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Update an announcement.
 */
async function updateAnnouncement(req, res, next) {
  try {
    const existing = await repository.findById(req.params.id, { user: req.user });
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found',
        data: null,
      });
    }

    const role = (req.user?.role || '').toLowerCase().trim();
    const isAdmin = ['admin', 'school admin'].includes(role);
    if (!isAdmin && existing.created_by !== req.user.sub) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit announcements that you created',
        data: null,
      });
    }

    const validation = validateUpdateAnnouncement(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.errors[0] || 'Invalid update data',
        errors: validation.errors,
        data: null,
      });
    }

    const data = await repository.update(req.params.id, validation.sanitized, {
      user: req.user,
    });

    return res.status(200).json({
      success: true,
      message: 'Announcement updated successfully',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Toggle pin status.
 */
async function togglePin(req, res, next) {
  try {
    const data = await repository.togglePin(req.params.id, req.user.school_id);
    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found',
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      message: data.is_pinned ? 'Announcement pinned to top' : 'Announcement unpinned',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Toggle or set status (e.g. DRAFT, PUBLISHED, ARCHIVED).
 */
async function toggleStatus(req, res, next) {
  const status = (req.body?.status || '').toUpperCase().trim();
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({
      success: false,
      message: `Status must be one of: ${VALID_STATUSES.join(', ')}`,
      data: null,
    });
  }

  try {
    const data = await repository.toggleStatus(req.params.id, status, req.user.school_id);
    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found',
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Announcement status changed to ${status}`,
      data,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Acknowledge an announcement (Parents / Students / Staff).
 */
async function acknowledgeAnnouncement(req, res, next) {
  try {
    const data = await repository.acknowledge(req.params.id, req.user.sub);
    return res.status(200).json({
      success: true,
      message: 'Announcement acknowledged successfully',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Get audit list of who acknowledged an announcement.
 */
async function getAcknowledgements(req, res, next) {
  try {
    const data = await repository.getAcknowledgements(req.params.id, req.user.school_id);
    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found',
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Acknowledgements loaded successfully',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Soft delete an announcement.
 */
async function deleteAnnouncement(req, res, next) {
  try {
    const existing = await repository.findById(req.params.id, { user: req.user });
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found',
        data: null,
      });
    }

    const role = (req.user?.role || '').toLowerCase().trim();
    const isAdmin = ['admin', 'school admin'].includes(role);
    if (!isAdmin && existing.created_by !== req.user.sub) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete announcements that you created',
        data: null,
      });
    }

    const success = await repository.delete(req.params.id, req.user.school_id);
    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found',
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Announcement deleted successfully',
      data: null,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
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
};
