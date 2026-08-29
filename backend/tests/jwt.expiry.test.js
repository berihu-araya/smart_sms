const test = require('node:test');
const assert = require('node:assert/strict');

const originalJWTSecret = process.env.JWT_SECRET;
const originalJWTExpiresIn = process.env.JWT_EXPIRES_IN;
const originalDatabaseHost = process.env.DATABASE_HOST;
const originalDatabasePort = process.env.DATABASE_PORT;
const originalDatabaseUser = process.env.DATABASE_USER;
const originalDatabasePassword = process.env.DATABASE_PASSWORD;
const originalDatabaseName = process.env.DATABASE_NAME;

process.env.JWT_SECRET = 'test-secret';
process.env.DATABASE_HOST = 'localhost';
process.env.DATABASE_PORT = '5432';
process.env.DATABASE_USER = 'postgres';
process.env.DATABASE_PASSWORD = 'postgres';
process.env.DATABASE_NAME = 'smart_sms_test';

delete process.env.JWT_EXPIRES_IN;

delete require.cache[require.resolve('../src/config/env')];

try {
  test('JWT default expiry should keep a user logged in for a full session', () => {
    const env = require('../src/config/env');
    assert.equal(env.jwtExpiresIn, '30d');
  });
} finally {
  if (originalJWTSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = originalJWTSecret;
  if (originalJWTExpiresIn === undefined) delete process.env.JWT_EXPIRES_IN; else process.env.JWT_EXPIRES_IN = originalJWTExpiresIn;
  if (originalDatabaseHost === undefined) delete process.env.DATABASE_HOST; else process.env.DATABASE_HOST = originalDatabaseHost;
  if (originalDatabasePort === undefined) delete process.env.DATABASE_PORT; else process.env.DATABASE_PORT = originalDatabasePort;
  if (originalDatabaseUser === undefined) delete process.env.DATABASE_USER; else process.env.DATABASE_USER = originalDatabaseUser;
  if (originalDatabasePassword === undefined) delete process.env.DATABASE_PASSWORD; else process.env.DATABASE_PASSWORD = originalDatabasePassword;
  if (originalDatabaseName === undefined) delete process.env.DATABASE_NAME; else process.env.DATABASE_NAME = originalDatabaseName;
  delete require.cache[require.resolve('../src/config/env')];
}
