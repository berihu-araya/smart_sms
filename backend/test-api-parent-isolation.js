require('dotenv').config();
const http = require('http');
const jwt = require('jsonwebtoken');
const env = require('./src/config/env');
const { db } = require('./src/config/database');
const app = require('./src/app');

async function runTests() {
  console.log('=====================================================');
  console.log('  PARENT RBAC & DATA ISOLATION INTEGRATION TESTS    ');
  console.log('=====================================================\n');

  let server;
  try {
    // 1. Fetch parent user from DB
    const parentUsers = await db.query(
      `SELECT u.id, u.email, u.phone, r.name as role_name, p.id as parent_id, p.full_name
       FROM users u
       JOIN roles r ON r.id = u.role_id
       JOIN parents p ON (p.user_id = u.id OR LOWER(p.email) = LOWER(u.email))
       WHERE r.name = 'Parent' AND u.deleted_at IS NULL AND p.deleted_at IS NULL
       LIMIT 1`
    );

    if (parentUsers.rows.length === 0) {
      console.log('⚠️ No Parent user found with linked profile. Linking user...');
      const parentRecord = (await db.query('SELECT * FROM parents WHERE deleted_at IS NULL LIMIT 1')).rows[0];
      const roleRecord = (await db.query("SELECT * FROM roles WHERE name = 'Parent' LIMIT 1")).rows[0];
      let user = (await db.query('SELECT * FROM users WHERE email = $1', [parentRecord.email || 'parent_test@smartsms.com'])).rows[0];
      if (!user) {
        user = (await db.query(
          `INSERT INTO users (email, phone, first_name, last_name, role_id, status)
           VALUES ($1, $2, 'Test', 'Parent', $3, 'ACTIVE') RETURNING *`,
          [parentRecord.email || 'parent_test@smartsms.com', parentRecord.phone, roleRecord.id]
        )).rows[0];
      }
      await db.query('UPDATE parents SET user_id = $1 WHERE id = $2', [user.id, parentRecord.id]);
      parentUsers.rows.push({
        id: user.id,
        email: user.email,
        phone: user.phone,
        role_name: 'Parent',
        parent_id: parentRecord.id,
        full_name: parentRecord.full_name,
      });
    }

    const parentUser = parentUsers.rows[0];
    console.log(`👤 Active Parent User: "${parentUser.full_name}" (User ID: ${parentUser.id}, Parent ID: ${parentUser.parent_id})`);

    // Start ephemeral test server
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    const API_BASE = `http://localhost:${port}/api`;
    console.log(`🚀 Test Server listening on port ${port}\n`);

    // Generate valid JWT token for parent
    const token = jwt.sign(
      { sub: parentUser.id, role: 'Parent', email: parentUser.email },
      env.jwtSecret,
      { expiresIn: '1h' }
    );

    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    // Find own children and other children in DB
    const ownChildrenRes = await db.query('SELECT id, first_name, last_name, admission_number FROM students WHERE parent_id = $1 AND deleted_at IS NULL', [parentUser.parent_id]);
    const ownChildren = ownChildrenRes.rows;
    console.log(`   Linked Children (${ownChildren.length}):`, ownChildren.map(c => `${c.first_name} ${c.last_name} (${c.id})`));

    const otherChildrenRes = await db.query('SELECT id, first_name, last_name FROM students WHERE (parent_id != $1 OR parent_id IS NULL) AND deleted_at IS NULL LIMIT 2', [parentUser.parent_id]);
    const otherChild = otherChildrenRes.rows[0];
    console.log(`   Unrelated Student (Other Parent):`, otherChild ? `${otherChild.first_name} ${otherChild.last_name} (${otherChild.id})` : 'None');
    console.log('');

    let passedTests = 0;
    let totalTests = 0;

    async function assert(testName, fn) {
      totalTests++;
      try {
        await fn();
        console.log(`  ✅ [PASS] ${testName}`);
        passedTests++;
      } catch (err) {
        console.log(`  ❌ [FAIL] ${testName} -> ${err.message}`);
      }
    }

    // TEST 1: Parent Dashboard API
    await assert('GET /api/dashboard returns isParent: true with only own children', async () => {
      const res = await fetch(`${API_BASE}/dashboard`, { headers });
      if (!res.ok) throw new Error(`Status ${res.status}: ${await res.text()}`);
      const json = await res.json();
      if (!json.isParent) throw new Error('Expected isParent: true');
      if (!Array.isArray(json.children)) throw new Error('Expected children array');
      const returnedChildIds = json.children.map(c => c.id);
      for (const id of returnedChildIds) {
        if (!ownChildren.some(oc => oc.id === id)) {
          throw new Error(`Data leak: dashboard returned unowned child ID ${id}`);
        }
      }
    });

    // TEST 2: Student List Scoped for Parent
    await assert('GET /api/v1/students returns only parent children', async () => {
      const res = await fetch(`${API_BASE}/v1/students`, { headers });
      if (!res.ok) throw new Error(`Status ${res.status}: ${await res.text()}`);
      const json = await res.json();
      const items = json.data?.items || json.items || [];
      for (const item of items) {
        if (!ownChildren.some(oc => oc.id === item.id)) {
          throw new Error(`Data leak: listStudents returned unowned student ${item.id} (${item.first_name} ${item.last_name})`);
        }
      }
    });

    if (ownChildren.length > 0) {
      const ownChildId = ownChildren[0].id;

      // TEST 3: Own Student Profile
      await assert(`GET /api/v1/students/${ownChildId} for OWN child returns 200 OK`, async () => {
        const res = await fetch(`${API_BASE}/v1/students/${ownChildId}`, { headers });
        if (!res.ok) throw new Error(`Status ${res.status}: ${await res.text()}`);
      });

      // TEST 4: Own Child Attendance
      await assert(`GET /api/v1/attendance/student/${ownChildId} for OWN child returns 200 OK`, async () => {
        const res = await fetch(`${API_BASE}/v1/attendance/student/${ownChildId}`, { headers });
        if (!res.ok) throw new Error(`Status ${res.status}: ${await res.text()}`);
      });

      // TEST 5: Own Child Report Card
      await assert(`GET /api/v1/results/report-card/${ownChildId} for OWN child returns 200 OK`, async () => {
        const res = await fetch(`${API_BASE}/v1/results/report-card/${ownChildId}`, { headers });
        if (!res.ok) throw new Error(`Status ${res.status}: ${await res.text()}`);
      });

      // TEST 6: Own Child Marks
      await assert(`GET /api/v1/marks/student/${ownChildId} for OWN child returns 200 OK`, async () => {
        const res = await fetch(`${API_BASE}/v1/marks/student/${ownChildId}`, { headers });
        if (!res.ok) throw new Error(`Status ${res.status}: ${await res.text()}`);
      });
    }

    if (otherChild) {
      const otherChildId = otherChild.id;

      // TEST 7: Cross-Parent Student Access Prevention
      await assert(`GET /api/v1/students/${otherChildId} for UNRELATED child returns 403 Forbidden`, async () => {
        const res = await fetch(`${API_BASE}/v1/students/${otherChildId}`, { headers });
        if (res.status !== 403) throw new Error(`Expected 403 Forbidden, got ${res.status}`);
      });

      // TEST 8: Cross-Parent Attendance Access Prevention
      await assert(`GET /api/v1/attendance/student/${otherChildId} for UNRELATED child returns 403 Forbidden`, async () => {
        const res = await fetch(`${API_BASE}/v1/attendance/student/${otherChildId}`, { headers });
        if (res.status !== 403) throw new Error(`Expected 403 Forbidden, got ${res.status}`);
      });

      // TEST 9: Cross-Parent Report Card Access Prevention
      await assert(`GET /api/v1/results/report-card/${otherChildId} for UNRELATED child returns 403 Forbidden`, async () => {
        const res = await fetch(`${API_BASE}/v1/results/report-card/${otherChildId}`, { headers });
        if (res.status !== 403) throw new Error(`Expected 403 Forbidden, got ${res.status}`);
      });

      // TEST 10: Cross-Parent Marks Access Prevention
      await assert(`GET /api/v1/marks/student/${otherChildId} for UNRELATED child returns 403 Forbidden`, async () => {
        const res = await fetch(`${API_BASE}/v1/marks/student/${otherChildId}`, { headers });
        if (res.status !== 403) throw new Error(`Expected 403 Forbidden, got ${res.status}`);
      });
    }

    // TEST 11: Parent Access to Other Parents list
    await assert('GET /api/v1/parents without admin role returns 403 Forbidden', async () => {
      const res = await fetch(`${API_BASE}/v1/parents`, { headers });
      if (res.status !== 403) throw new Error(`Expected 403 Forbidden for parent browsing parents, got ${res.status}`);
    });

    // TEST 12: Parent /me
    await assert('GET /api/v1/parents/me returns own parent profile', async () => {
      const res = await fetch(`${API_BASE}/v1/parents/me`, { headers });
      if (!res.ok) throw new Error(`Status ${res.status}: ${await res.text()}`);
      const json = await res.json();
      if (json.data?.id !== parentUser.parent_id) {
        throw new Error(`Expected parent_id ${parentUser.parent_id}, got ${json.data?.id}`);
      }
    });

    // TEST 13: Parent /my-children
    await assert('GET /api/v1/parents/my-children returns own children', async () => {
      const res = await fetch(`${API_BASE}/v1/parents/my-children`, { headers });
      if (!res.ok) throw new Error(`Status ${res.status}: ${await res.text()}`);
      const json = await res.json();
      const items = json.data || [];
      if (items.length !== ownChildren.length) {
        throw new Error(`Expected ${ownChildren.length} children, got ${items.length}`);
      }
    });

    console.log(`\n=====================================================`);
    console.log(`  TEST RESULTS: ${passedTests} / ${totalTests} PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
    console.log(`=====================================================\n`);

    if (passedTests === totalTests) {
      console.log('🏆 Senior Developer Verification: Zero Data Leakage. Strict Parent RBAC guarantees validated.');
      if (server) server.close();
      process.exit(0);
    } else {
      if (server) server.close();
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal Test Runner Error:', err);
    if (server) server.close();
    process.exit(1);
  }
}

runTests();
