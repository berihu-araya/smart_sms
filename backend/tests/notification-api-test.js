/**
 * Verification Script: Backend Notifications Module
 * Tests database operations, repository methods, read-state tracking,
 * batch operations, unread counters, and KPI stats.
 */

const { db } = require('../src/config/database');
const NotificationRepository = require('../src/modules/notifications/notification.repository');

async function runTests() {
  console.log('🚀 Starting Backend Notifications Verification...\n');
  const repo = new NotificationRepository(db);

  try {
    // 1. Fetch or ensure school and test user
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

    const userRes = await db.query(
      `SELECT u.id, u.email, r.name as role
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE (u.school_id = $1 OR u.school_id IS NULL) AND u.deleted_at IS NULL
       LIMIT 1`,
      [schoolId]
    );

    if (userRes.rows.length === 0) {
      console.log('⚠ No active users found, skipping live repository test.');
      return;
    }

    const testUser = userRes.rows[0];
    const userContext = {
      sub: testUser.id,
      id: testUser.id,
      email: testUser.email,
      role: testUser.role,
      school_id: schoolId,
    };

    console.log(`✓ Test School ID: ${schoolId}`);
    console.log(`✓ Test User: ${testUser.email} (Role: ${testUser.role})`);

    // 2. Test Notification Creation with Rich Metadata
    console.log('\n--- 1. Testing Notification Creation with Action Links ---');
    const created = await repo.create({
      schoolId,
      title: 'Midterm Examination Results Released',
      body: 'Mathematics and Science midterm grades are now officially published on your gradebook.',
      type: 'EXAM',
      priority: 'HIGH',
      audience: 'ALL',
      actionUrl: '/dashboard/marks',
      actionLabel: 'Check Gradebook',
      channel: 'IN_APP',
      metadata: { term: 'Midterm', semester: 1 },
      createdBy: testUser.id,
    });

    console.log(`✓ Created notification ID: ${created.id}`);
    console.log(`  Title: "${created.title}", Type: ${created.type}, Priority: ${created.priority}`);
    console.log(`  Action URL: ${created.action_url} [${created.action_label}]`);

    // 3. Test Unread Counter
    console.log('\n--- 2. Testing Fast Unread Counter for Header Bell ---');
    const unreadBefore = await repo.getUnreadCount(userContext);
    console.log(`✓ Unread notification count: ${unreadBefore.count}`);
    if (unreadBefore.count < 1) {
      throw new Error('Expected at least 1 unread notification after creation');
    }

    // 4. Test Notification Listing with Filters
    console.log('\n--- 3. Testing Notification Feed & Filtering ---');
    const feed = await repo.listForUser(userContext, { page: 1, limit: 10 });
    console.log(`✓ Total items returned: ${feed.total} (Page ${feed.page} of ${feed.totalPages})`);
    const found = feed.items.find((item) => item.id === created.id);
    if (!found) {
      throw new Error('Created notification not found in user feed');
    }
    console.log(`✓ Found created notification in feed. Read status: ${found.is_read} (Expected false)`);
    if (found.is_read !== false) {
      throw new Error(`Expected is_read to be false, got ${found.is_read}`);
    }

    // Filter by type: 'EXAM'
    const examFilter = await repo.listForUser(userContext, { type: 'EXAM' });
    const foundInExam = examFilter.items.find((item) => item.id === created.id);
    if (!foundInExam) {
      throw new Error('Filter by type: EXAM did not return the notification');
    }
    console.log(`✓ Successfully verified type filter: found in ${examFilter.items.length} exam notification(s)`);

    // 5. Test Mark Single Notification as Read
    console.log('\n--- 4. Testing Mark as Read (UPSERT) ---');
    const readResult = await repo.markAsRead(created.id, userContext);
    console.log(`✓ Marked notification as read. is_read = ${readResult.is_read}, read_at = ${readResult.read_at}`);

    // Verify unread count decreased or notification has is_read = true in feed
    const feedAfterRead = await repo.listForUser(userContext, { status: 'READ' });
    const foundInRead = feedAfterRead.items.find((item) => item.id === created.id);
    if (!foundInRead || !foundInRead.is_read) {
      throw new Error('Notification did not transition to READ state in query');
    }
    console.log(`✓ Verified: Notification now reports is_read = true in READ status filter.`);

    // 6. Test KPI Stats
    console.log('\n--- 5. Testing KPI Stats Aggregation ---');
    const stats = await repo.getStats(userContext);
    console.log(`✓ Total Notifications: ${stats.total}`);
    console.log(`✓ Unread Notifications: ${stats.unread}`);
    console.log(`✓ Urgent Unread: ${stats.urgentUnread}`);
    console.log(`✓ Academic Total: ${stats.academicTotal}`);

    // 7. Test Batch Mark All as Read
    console.log('\n--- 6. Testing Batch Mark All as Read ---');
    // Create another notification first
    await repo.create({
      schoolId,
      title: 'Tuition Fee Invoice Ready',
      body: 'Second installment invoice is due on October 30.',
      type: 'FINANCE',
      priority: 'NORMAL',
      audience: 'ALL',
      actionUrl: '/dashboard/fees',
      actionLabel: 'View Invoice',
      createdBy: testUser.id,
    });

    const markAllRes = await repo.markAllAsRead(userContext);
    console.log(`✓ Batch mark all result: processed.`);
    const unreadAfterBatch = await repo.getUnreadCount(userContext);
    console.log(`✓ Unread count after mark all: ${unreadAfterBatch.count} (Expected 0)`);
    if (unreadAfterBatch.count !== 0) {
      throw new Error(`Expected 0 unread notifications after markAllAsRead, got ${unreadAfterBatch.count}`);
    }

    // 8. Test Archive / Dismiss Notification
    console.log('\n--- 7. Testing Archive Notification ---');
    await repo.archiveNotification(created.id, userContext);
    const feedAfterArchive = await repo.listForUser(userContext, { page: 1, limit: 10 });
    const foundArchived = feedAfterArchive.items.find((item) => item.id === created.id);
    if (foundArchived) {
      throw new Error('Archived notification is still visible in active user feed');
    }
    console.log(`✓ Verified: Archived notification is completely hidden from user feed.`);

    console.log('\n🎉 ALL BACKEND NOTIFICATION TESTS PASSED WITH 100% SUCCESS!\n');
  } catch (err) {
    console.error('❌ Notification test failed with error:', err);
    process.exit(1);
  } finally {
    await db.end();
  }
}

runTests();
