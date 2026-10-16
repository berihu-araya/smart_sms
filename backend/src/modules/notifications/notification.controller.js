const NotificationRepository = require('./notification.repository');
const { db } = require('../../config/database');

const repository = new NotificationRepository(db);

const AUDIENCES = ['ALL', 'STUDENTS', 'TEACHERS', 'PARENTS', 'STAFF'];
const TYPES = ['GENERAL', 'ACADEMIC', 'ATTENDANCE', 'EXAM', 'FINANCE', 'TRANSPORT', 'SYSTEM'];
const PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];

/**
 * GET /api/v1/notifications
 * Lists notifications for the authenticated user with filters and pagination.
 */
async function listNotifications(req, res, next) {
  try {
    const {
      page = 1,
      limit = 20,
      type = null,
      status = 'ALL',
      priority = null,
      search = null,
      dateRange = null,
    } = req.query || {};

    const data = await repository.listForUser(req.user, {
      page,
      limit,
      type,
      status,
      priority,
      search,
      dateRange,
    });

    return res.status(200).json({
      success: true,
      message: 'Notifications loaded successfully',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/v1/notifications/unread-count
 * Returns the unread notification count for the header bell badge.
 */
async function getUnreadCount(req, res, next) {
  try {
    const data = await repository.getUnreadCount(req.user);
    return res.status(200).json({
      success: true,
      message: 'Unread count retrieved',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/v1/notifications/stats
 * Aggregates summary KPIs for the Notification Center top stat cards.
 */
async function getStats(req, res, next) {
  try {
    const data = await repository.getStats(req.user);
    return res.status(200).json({
      success: true,
      message: 'Notification metrics loaded',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * PATCH /api/v1/notifications/:id/read
 * Marks a single notification as read for the user.
 */
async function markAsRead(req, res, next) {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Notification ID is required',
        data: null,
      });
    }

    const data = await repository.markAsRead(id, req.user);
    return res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /api/v1/notifications/read-all
 * Marks all notifications as read for the authenticated user.
 */
async function markAllAsRead(req, res, next) {
  try {
    const data = await repository.markAllAsRead(req.user);
    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * DELETE /api/v1/notifications/:id
 * Dismisses / archives a notification from the authenticated user's view.
 */
async function archiveNotification(req, res, next) {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Notification ID is required',
        data: null,
      });
    }

    const data = await repository.archiveNotification(id, req.user);
    return res.status(200).json({
      success: true,
      message: 'Notification archived successfully',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /api/v1/notifications
 * Administrative manual notification creation and dispatch.
 */
async function createNotification(req, res, next) {
  const {
    title,
    body,
    type = 'GENERAL',
    priority = 'NORMAL',
    audience = 'ALL',
    gradeId = null,
    sectionId = null,
    actionUrl = null,
    actionLabel = null,
    channel = 'IN_APP',
    metadata = {},
    recipientUserId = null,
    publishedAt = null,
  } = req.body || {};

  if (!title?.trim() || !body?.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Title and body are required fields',
      data: null,
    });
  }

  const normalizedAudience = audience.toUpperCase();
  if (!AUDIENCES.includes(normalizedAudience)) {
    return res.status(400).json({
      success: false,
      message: `Audience must be one of: ${AUDIENCES.join(', ')}`,
      data: null,
    });
  }

  const normalizedType = type.toUpperCase();
  if (!TYPES.includes(normalizedType)) {
    return res.status(400).json({
      success: false,
      message: `Type must be one of: ${TYPES.join(', ')}`,
      data: null,
    });
  }

  const normalizedPriority = priority.toUpperCase();
  if (!PRIORITIES.includes(normalizedPriority)) {
    return res.status(400).json({
      success: false,
      message: `Priority must be one of: ${PRIORITIES.join(', ')}`,
      data: null,
    });
  }

  try {
    const data = await repository.create({
      title: title.trim(),
      body: body.trim(),
      type: normalizedType,
      priority: normalizedPriority,
      audience: normalizedAudience,
      gradeId: gradeId || null,
      sectionId: sectionId || null,
      actionUrl: actionUrl?.trim() || null,
      actionLabel: actionLabel?.trim() || null,
      channel: channel || 'IN_APP',
      metadata: typeof metadata === 'object' ? metadata : {},
      recipientUserId: recipientUserId || null,
      publishedAt: publishedAt || null,
      schoolId: req.user.school_id,
      createdBy: req.user.sub || req.user.id,
    });

    return res.status(201).json({
      success: true,
      message: 'Notification created and dispatched successfully',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listNotifications,
  getUnreadCount,
  getStats,
  markAsRead,
  markAllAsRead,
  archiveNotification,
  createNotification,
};