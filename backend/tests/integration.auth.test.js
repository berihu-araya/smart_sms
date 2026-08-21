const { db } = require('../src/config/database');
const AuthRepository = require('../src/modules/auth/auth.repository');
const { AuthService } = require('../src/modules/auth/auth.service');
const env = require('../src/config/env');

async function run() {
  const service = new AuthService(new AuthRepository(db), env);
  const roles = ['School Admin', 'Teacher', 'Student', 'Parent', 'Staff'];

  for (const role of roles) {
    const email = `test.${role.toLowerCase().replace(/\s+/g, '')}.${Date.now()}@smart-sms.com`;
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
  }

  // Also clean up any lingering test users
  await db.query("DELETE FROM users WHERE email LIKE 'test.%@smart-sms.com'");

  console.log('ALL ROLE REGISTRATION & LOGIN TESTS PASSED SUCCESSFULLY!');
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
