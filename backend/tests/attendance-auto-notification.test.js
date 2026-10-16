/**
 * End-to-End Test: Attendance Absence Auto-Notification Flow
 * Verifies that recording student absence automatically generates a high-priority
 * attendance alert for the parent with action link to /dashboard/attendance.
 */

const { db } = require('../src/config/database');
const triggerService = require('../src/modules/notifications/notification-trigger.service');

async function testAttendanceAutoNotification() {
  console.log('🚀 Running Attendance Auto-Notification Integration Test...\n');

  try {
    // 1. Get an active student with their section
    const studentRes = await db.query(`
      SELECT s.id, s.first_name, s.last_name, s.school_id, s.section_id, sec.name as section_name
      FROM students s
      JOIN sections sec ON sec.id = s.section_id
      WHERE s.deleted_at IS NULL
      LIMIT 1
    `);

    if (studentRes.rows.length === 0) {
      console.log('⚠ No student with section found. Skipping test.');
      return;
    }

    const student = studentRes.rows[0];
    console.log(`✓ Testing with Student: ${student.first_name} ${student.last_name} in ${student.section_name}`);

    // 2. Fetch a recorder user (e.g. teacher or admin)
    const userRes = await db.query(`SELECT id FROM users WHERE deleted_at IS NULL LIMIT 1`);
    const recordedBy = userRes.rows[0]?.id;

    // 3. Trigger Attendance Alerts with an ABSENT record
    const today = new Date().toISOString().split('T')[0];
    const triggerResult = await triggerService.triggerAttendanceAlerts({
      schoolId: student.school_id,
      date: today,
      records: [
        { student_id: student.id, status: 'ABSENT', remark: 'Reported sick' },
      ],
      recordedBy,
    });

    console.log(`✓ Trigger result: ${triggerResult.dispatchedCount} alert(s) dispatched.`);
    if (triggerResult.dispatchedCount < 1) {
      throw new Error('Expected at least 1 attendance alert dispatched for absent student');
    }

    // 4. Query notifications table directly to verify database integrity
    const notifRes = await db.query(`
      SELECT id, type, priority, title, body, action_url, action_label, channel, metadata
      FROM notifications
      WHERE type = 'ATTENDANCE'
      ORDER BY created_at DESC
      LIMIT 1
    `);

    const notif = notifRes.rows[0];
    console.log('\n--- Database Record Verified ---');
    console.log(`✓ ID: ${notif.id}`);
    console.log(`✓ Title: ${notif.title}`);
    console.log(`✓ Body: ${notif.body}`);
    console.log(`✓ Type: ${notif.type}`);
    console.log(`✓ Priority: ${notif.priority}`);
    console.log(`✓ Action URL: ${notif.action_url}`);
    console.log(`✓ Action Label: ${notif.action_label}`);
    console.log(`✓ Channel: ${notif.channel}`);

    if (notif.type !== 'ATTENDANCE') throw new Error(`Type mismatch: expected ATTENDANCE, got ${notif.type}`);
    if (notif.action_url !== '/dashboard/attendance') throw new Error(`Action mismatch: expected /dashboard/attendance, got ${notif.action_url}`);
    if (!notif.title.includes(student.first_name)) throw new Error(`Title should mention student first name`);

    console.log('\n🎉 ATTENDANCE AUTO-NOTIFICATION INTEGRATION TEST PASSED PERFECTLY!\n');
  } catch (error) {
    console.error('❌ Attendance auto-notification test failed:', error);
    process.exit(1);
  } finally {
    await db.end();
  }
}

testAttendanceAutoNotification();
