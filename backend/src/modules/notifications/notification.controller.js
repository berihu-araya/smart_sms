const NotificationRepository = require('./notification.repository');
const { db } = require('../../config/database');

const repository = new NotificationRepository(db);
const AUDIENCES = ['ALL', 'STUDENTS'];

async function listNotifications(req, res, next) {
  try {
    const data = await repository.listForUser(req.user);
    return res.status(200).json({ success: true, message: 'Notifications loaded successfully', data });
  } catch (error) {
    return next(error);
  }
}

async function createNotification(req, res, next) {
  const { title, body, audience = 'ALL', gradeId = null, sectionId = null, publishedAt = null } = req.body || {};
  if (!title?.trim() || !body?.trim() || !AUDIENCES.includes(audience)) {
    return res.status(400).json({ success: false, message: 'Title, body, and a valid audience are required', data: null });
  }

  try {
    const data = await repository.create({
      title: title.trim(),
      body: body.trim(),
      audience,
      gradeId,
      sectionId,
      publishedAt,
      schoolId: req.user.school_id,
      createdBy: req.user.sub,
    });
    return res.status(201).json({ success: true, message: 'Notification created successfully', data });
  } catch (error) {
    return next(error);
  }
}

module.exports = { listNotifications, createNotification };