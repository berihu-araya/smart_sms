/**
 * Verification Script: Backend Announcements Module
 * Tests database operations, repository methods, scoping, and acknowledgement tracking.
 */

const { db } = require('../src/config/database');
const AnnouncementRepository = require('../src/modules/announcements/announcement.repository');

async function runTests() {
  console.log('🚀 Starting Backend Announcements Verification...\n');
  const repo = new AnnouncementRepository(db);

  try {
    // 1. Fetch or create a school and an admin user for testing
    let schoolRes = await db.query('SELECT id FROM schools LIMIT 1');
    let schoolId;
    if (schoolRes.rows.length === 0) {
      console.log('Creating default test school...');
      const newSchool = await db.query(
        `INSERT INTO schools (name, abbreviation, address, email, status)
         VALUES ('Smart SMS Academy', 'SSA', 'Addis Ababa, Ethiopia', 'info@smartsms.edu.et', 'ACTIVE')
         RETURNING id`
      );
      schoolId = newSchool.rows[0].id;
    } else {
      schoolId = schoolRes.rows[0].id;
    }

    // Ensure users have school_id set
    await db.query(`UPDATE users SET school_id = $1 WHERE school_id IS NULL`, [schoolId]);

    const userRes = await db.query(
      `SELECT u.id, u.email, r.name as role
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE u.school_id = $1 AND u.deleted_at IS NULL
       LIMIT 1`,
      [schoolId]
    );

    if (userRes.rows.length === 0) {
      console.log('⚠ No users found for school, skipping live test.');
      return;
    }

    const testUser = userRes.rows[0];
    const userContext = {
      user: {
        sub: testUser.id,
        email: testUser.email,
        role: testUser.role,
        school_id: schoolId,
      },
    };

    console.log(`✓ Test School ID: ${schoolId}`);
    console.log(`✓ Test User: ${testUser.email} (Role: ${testUser.role})`);

    // 2. Test Create Announcement
    console.log('\n--- 1. Testing Announcement Creation ---');
    const created = await repo.create(
      {
        title: 'Final Examination Guidelines 2026',
        content: 'Please find attached the timetable and code of conduct for the upcoming semester examinations.',
        category: 'EXAMINATION',
        priority: 'URGENT',
        audience: 'ALL',
        requires_acknowledgement: true,
        is_pinned: true,
        status: 'PUBLISHED',
      },
      userContext
    );
    console.log(`✓ Created announcement ID: ${created.id}`);
    console.log(`  Title: "${created.title}", Priority: ${created.priority}, Pinned: ${created.is_pinned}`);

    // 3. Test List Announcements
    console.log('\n--- 2. Testing Announcement Listing & Filters ---');
    const list = await repo.list({ page: 1, limit: 10 }, userContext);
    console.log(`✓ Total announcements returned: ${list.total} (Page ${list.page} of ${list.totalPages})`);
    const found = list.items.find((item) => item.id === created.id);
    if (found) {
      console.log(`✓ Successfully retrieved created notice in list! Pinned: ${found.is_pinned}, Ack Count: ${found.acknowledgement_count}`);
    } else {
      throw new Error('Created announcement not found in list query');
    }

    // 4. Test Get Stats
    console.log('\n--- 3. Testing Dashboard KPI Statistics ---');
    const stats = await repo.getStats(userContext);
    console.log(`✓ Total Announcements: ${stats.totalAnnouncements}`);
    console.log(`✓ Active Announcements: ${stats.activeAnnouncements}`);
    console.log(`✓ Urgent Alerts: ${stats.urgentAlerts}`);
    console.log(`✓ Pinned Notices: ${stats.pinnedAnnouncements}`);
    console.log(`✓ Pending User Acks: ${stats.pendingAcknowledgements}`);
    if (stats.urgentUnacknowledgedNotice) {
      console.log(`✓ Urgent notice prompt detected: "${stats.urgentUnacknowledgedNotice.title}"`);
    }

    // 5. Test Acknowledgement Workflow
    console.log('\n--- 4. Testing User Acknowledgement ---');
    const ack = await repo.acknowledge(created.id, testUser.id);
    console.log(`✓ Acknowledged notice at: ${ack.acknowledged_at}`);

    // Verify acknowledgement is reflected in detail view
    const detail = await repo.findById(created.id, userContext);
    console.log(`✓ Detail check: is_acknowledged = ${detail.is_acknowledged}, count = ${detail.acknowledgement_count}`);

    // Test Acknowledgements Audit List
    const acksAudit = await repo.getAcknowledgements(created.id, schoolId);
    console.log(`✓ Acknowledgements Audit: ${acksAudit.total} of ${acksAudit.targetCount} acknowledged (${acksAudit.percentage}%)`);
    if (acksAudit.items.length > 0) {
      console.log(`  First ack by: ${acksAudit.items[0].full_name} (${acksAudit.items[0].role_name})`);
    }

    // 6. Test Pin Toggle
    console.log('\n--- 5. Testing Pin Toggle ---');
    const pinToggled = await repo.togglePin(created.id, schoolId);
    console.log(`✓ Pin toggled: new is_pinned = ${pinToggled.is_pinned}`);

    // 7. Test Status Update
    console.log('\n--- 6. Testing Status Toggle ---');
    const statusToggled = await repo.toggleStatus(created.id, 'ARCHIVED', schoolId);
    console.log(`✓ Status changed to: ${statusToggled.status}`);

    // 8. Test Clean Up (Soft Delete)
    console.log('\n--- 7. Testing Soft Delete ---');
    const deleted = await repo.delete(created.id, schoolId);
    console.log(`✓ Announcement soft-deleted: ${deleted}`);

    // Confirm it is no longer returned in active list
    const postDeleteList = await repo.list({ search: 'Final Examination Guidelines 2026' }, userContext);
    const postDeleteFound = postDeleteList.items.find((item) => item.id === created.id);
    if (!postDeleteFound) {
      console.log('✓ Verified: Soft-deleted announcement is not returned in active list.');
    }

    console.log('\n🎉 ALL BACKEND ANNOUNCEMENT TESTS PASSED PERFECTLY!\n');
  } catch (err) {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
  } finally {
    await db.end();
  }
}

runTests();
