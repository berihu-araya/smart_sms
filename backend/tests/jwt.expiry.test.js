const test = require('node:test');
const assert = require('node:assert/strict');

test('JWT default expiry should keep a user logged in for a full session', (t) => {
  const originalEnv = { ...process.env };

  process.env.JWT_SECRET = 'test-secret';
  process.env.DATABASE_HOST = 'localhost';
  process.env.DATABASE_PORT = '5432';
  process.env.DATABASE_USER = 'postgres';
  process.env.DATABASE_PASSWORD = 'postgres';
  process.env.DATABASE_NAME = 'smart_sms_test';
  delete process.env.JWT_EXPIRES_IN;

  delete require.cache[require.resolve('../src/config/env')];
  const env = require('../src/config/env');

  assert.equal(env.jwtExpiresIn, '30d');

  // Restore env
  process.env = originalEnv;
  delete require.cache[require.resolve('../src/config/env')];
});
