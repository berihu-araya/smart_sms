const { describe, it, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const env = require('../src/config/env');
const { db } = require('../src/config/database');
const authMiddleware = require('../src/middlewares/auth.middleware');

describe('Auth Middleware Security & User Status Verification Tests', () => {
  it('blocks suspended user accounts with HTTP 403 Forbidden', async () => {
    // 1. Create a suspended test user in DB
    const roleRes = await db.query("SELECT id FROM roles WHERE LOWER(name) = 'student' LIMIT 1");
    const roleId = roleRes.rows[0].id;
    const testEmail = `suspended.test.${Date.now()}@smart-sms.com`;

    const userRes = await db.query(
      `INSERT INTO users (first_name, last_name, email, password_hash, role_id, status)
       VALUES ('Suspended', 'Student', $1, 'hashedpassword123', $2, 'SUSPENDED')
       RETURNING id, email, status`,
      [testEmail, roleId]
    );
    const userId = userRes.rows[0].id;

    // 2. Sign token for this suspended user
    const token = jwt.sign(
      { sub: userId, email: testEmail, role: 'Student' },
      env.jwtSecret,
      { expiresIn: '1h' }
    );

    // 3. Mock Express req, res, next
    const req = {
      headers: { authorization: `Bearer ${token}` },
    };

    let statusCode = null;
    let responseBody = null;
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        responseBody = data;
        return this;
      },
    };

    let nextCalled = false;
    const next = () => { nextCalled = true; };

    await authMiddleware(req, res, next);

    // 4. Clean up test record
    await db.query('DELETE FROM users WHERE id = $1', [userId]);

    assert.equal(nextCalled, false, 'next() must NOT be called for suspended user');
    assert.equal(statusCode, 403, 'Must return HTTP 403');
    assert.equal(responseBody.success, false);
    assert.match(responseBody.message, /suspended/i);
  });

  it('blocks deleted user accounts with HTTP 401 Unauthorized', async () => {
    const roleRes = await db.query("SELECT id FROM roles WHERE LOWER(name) = 'teacher' LIMIT 1");
    const roleId = roleRes.rows[0].id;
    const testEmail = `deleted.test.${Date.now()}@smart-sms.com`;

    const userRes = await db.query(
      `INSERT INTO users (first_name, last_name, email, password_hash, role_id, status, deleted_at)
       VALUES ('Deleted', 'Teacher', $1, 'hashedpassword123', $2, 'ACTIVE', CURRENT_TIMESTAMP)
       RETURNING id, email`,
      [testEmail, roleId]
    );
    const userId = userRes.rows[0].id;

    const token = jwt.sign(
      { sub: userId, email: testEmail, role: 'Teacher' },
      env.jwtSecret,
      { expiresIn: '1h' }
    );

    const req = {
      headers: { authorization: `Bearer ${token}` },
    };

    let statusCode = null;
    let responseBody = null;
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        responseBody = data;
        return this;
      },
    };

    let nextCalled = false;
    const next = () => { nextCalled = true; };

    await authMiddleware(req, res, next);

    await db.query('DELETE FROM users WHERE id = $1', [userId]);

    assert.equal(nextCalled, false, 'next() must NOT be called for deleted user');
    assert.equal(statusCode, 401, 'Must return HTTP 401');
    assert.equal(responseBody.success, false);
    assert.match(responseBody.message, /deactivated or removed/i);
  });

  after(async () => {
    await db.end();
  });
});
