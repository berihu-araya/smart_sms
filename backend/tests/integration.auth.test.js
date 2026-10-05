const assert = require('node:assert/strict');
const { db } = require('../src/config/database');
const AuthRepository = require('../src/modules/auth/auth.repository');
const { AuthService } = require('../src/modules/auth/auth.service');
const env = require('../src/config/env');

async function run() {
  const service = new AuthService(new AuthRepository(db), env);
  const roles = ['School Admin', 'Teacher', 'Student', 'Parent', 'Staff'];

  for (const role of roles) {
    const email = `test.${role.toLowerCase().replace(/\s+/g, '')}.${Date.now()}@smart-sms.com`;
    await db.query(
      `
      INSERT INTO account_registrations
        (first_name, last_name, email, role_name)
      VALUES ($1, $2, $3, $4)
      `,
      ['Test', role, email, role]
    );

    const res = await service.register({
      firstName: 'Test',
      lastName: role,
      email,
      phone: '+251911000000',
      role,
      password: 'password123',
    });

    console.log(`Registered user for role [${role}]:`, res.user.email, '-> Role:', res.user.role);

    // Verify login
    const loginRes = await service.login({ email, password: 'password123' });
    if (loginRes.user.role !== role) {
      throw new Error(`Role mismatch for ${role}: expected ${role}, got ${loginRes.user.role}`);
    }

    // Clean up
    await db.query('DELETE FROM users WHERE id = $1', [res.user.id]);
    await db.query('DELETE FROM account_registrations WHERE email = $1', [email]);
  }

  const registeredEmail = `test.match.${Date.now()}@smart-sms.com`;
  const differentEmail = `test.other.${Date.now()}@smart-sms.com`;
  await db.query(
    `INSERT INTO account_registrations (first_name, last_name, email, role_name)
     VALUES ($1, $2, $3, $4)`,
    ['Registered', 'Teacher', registeredEmail, 'Teacher']
  );

  await assert.rejects(
    service.register({
      firstName: 'Different',
      lastName: 'Teacher',
      email: differentEmail,
      role: 'Teacher',
      password: 'password123',
    }),
    (error) => error.status === 403
  );

  const firstAccount = await service.register({
    firstName: 'Registered',
    lastName: 'Teacher',
    email: registeredEmail,
    role: 'Teacher',
    password: 'password123',
  });

  await db.query('DELETE FROM users WHERE id = $1', [firstAccount.user.id]);
  await assert.rejects(
    service.register({
      firstName: 'Registered',
      lastName: 'Teacher',
      email: registeredEmail,
      role: 'Teacher',
      password: 'password123',
    }),
    (error) => error.status === 403
  );

  await db.query('DELETE FROM account_registrations WHERE email IN ($1, $2)', [registeredEmail, differentEmail]);

  // Also clean up any lingering test users
  await db.query("DELETE FROM users WHERE email LIKE 'test.%@smart-sms.com'");
  await db.query("DELETE FROM account_registrations WHERE email LIKE 'test.%@smart-sms.com'");

  console.log('ALL ROLE REGISTRATION & LOGIN TESTS PASSED SUCCESSFULLY!');
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
