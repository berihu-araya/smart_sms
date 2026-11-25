const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { db } = require('../config/database');

let cachedDefaultSchoolId = null;

// High-speed in-memory LRU status cache (30s TTL) to prevent DB hammering while preventing suspended user access
const userStatusCache = new Map();
const USER_CACHE_TTL_MS = 30 * 1000;

async function checkUserActiveStatus(userId) {
  if (!userId) return null;
  const now = Date.now();
  const cached = userStatusCache.get(userId);
  if (cached && now - cached.timestamp < USER_CACHE_TTL_MS) {
    return cached.record;
  }

  try {
    const res = await db.query(
      'SELECT id, status, deleted_at, school_id FROM users WHERE id = $1',
      [userId]
    );
    const record = res.rows[0] || null;
    userStatusCache.set(userId, { record, timestamp: now });
    return record;
  } catch (err) {
    return null;
  }
}

async function getDefaultSchoolId() {
  if (cachedDefaultSchoolId) return cachedDefaultSchoolId;
  try {
    const res = await db.query(
      'SELECT id FROM schools WHERE deleted_at IS NULL ORDER BY created_at ASC LIMIT 1'
    );
    if (res.rows[0]?.id) {
      cachedDefaultSchoolId = res.rows[0].id;
    }
  } catch (err) {
    // ignore
  }
  return cachedDefaultSchoolId;
}

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Authorization header is missing or invalid',
      data: null,
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    req.user = payload;
    const userId = payload.sub || req.user.id;
    if (userId && !req.user.id) {
      req.user.id = userId;
    }

    // Verify user account has not been deleted or suspended in database
    const userRecord = await checkUserActiveStatus(userId);
    if (userRecord) {
      if (userRecord.deleted_at) {
        return res.status(401).json({
          success: false,
          message: 'User account has been deactivated or removed',
          data: null,
        });
      }
      if (userRecord.status && userRecord.status.toUpperCase() !== 'ACTIVE') {
        return res.status(403).json({
          success: false,
          message: `Account is ${userRecord.status.toLowerCase()}. Please contact your school administrator.`,
          data: null,
        });
      }
      if (userRecord.school_id && !req.user.school_id) {
        req.user.school_id = userRecord.school_id;
      }
      req.user.status = userRecord.status;
    }

    if (!req.user.school_id) {
      req.user.school_id = await getDefaultSchoolId();
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
      data: null,
    });
  }
}

module.exports = authMiddleware;
