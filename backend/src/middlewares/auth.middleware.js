const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { db } = require('../config/database');

let cachedDefaultSchoolId = null;

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
    if (payload.sub && !req.user.id) {
      req.user.id = payload.sub;
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
