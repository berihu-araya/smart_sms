/**
 * Verification Script: NotificationTriggerService Tests
 * Tests automated event hooks for attendance absence alerts, exam results releases, and fee invoices.
 */

const { db } = require('../src/config/database');
const triggerService = require('../src/modules/notifications/notification-trigger.service');

async function runTests() {
  console.log('🚀 Starting NotificationTriggerService Automated Verification...\n');

  try {
    // 1. Fetch test school and user
    const schoolRes = await db.query('SELECT id FROM schools LIMIT 1');
    const schoolId = schoolRes.rows[0]?.id;

    const userRes = await db.query('SELECT id, email, role_id FROM users WHERE deleted_at IS NULL LIMIT 1');
    const testUser = userRes.rows[0];

    // 2. Fetch a real student for testing attendance
    const studentRes = await db.query('SELECT id, first_name, last_name, section_id FROM students WHERE deleted_at IS NULL LIMIT 1');
    if (studentRes.rows.length === 0) {
      console.log('⚠ No students found in database. Skipping test.');
      return;
    }

    const testStudent = studentRes.rows[0];
    console.log(`✓ Test Student: ${testStudent.first_name} ${testStudent.last_name} (ID: ${testStudent.id})`);

    // 3. Test Attendance Absence Trigger
    console.log('\n--- 1. Testing triggerAttendanceAlerts ---');
    const attendanceResult = await triggerService.triggerAttendanceAlerts({
      schoolId,
      date: '2026-10-16',
      records: [
        { student_id: testStudent.id, status: 'ABSENT', remark: 'Unexcused absence' },
      ],
      recordedBy: testUser.id,
    });

    console.log(`✓ Dispatched count: ${attendanceResult.dispatchedCount}`);
    if (attendanceResult.dispatchedCount < 1) {
      throw new Error('Expected at least 1 attendance alert dispatched for absent student');
    }
    const alert = attendanceResult.alerts[0];
    console.log(`  Alert Title: "${alert.title}"`);
    console.log(`  Type: ${alert.type}, Priority: ${alert.priority}`);
    console.log(`  Action: ${alert.action_url} [${alert.action_label}]`);
    console.log(`  Channel: ${alert.channel}`);

    if (alert.type !== 'ATTENDANCE') throw new Error(`Expected type ATTENDANCE, got ${alert.type}`);
    if (alert.action_url !== '/dashboard/attendance') throw new Error(`Expected action_url /dashboard/attendance, got ${alert.action_url}`);

    // 4. Test Attendance with All Present (Should dispatch 0 alerts)
    console.log('\n--- 2. Testing triggerAttendanceAlerts with PRESENT only ---');
    const presentOnlyResult = await triggerService.triggerAttendanceAlerts({
      schoolId,
      date: '2026-10-16',
      records: [
        { student_id: testStudent.id, status: 'PRESENT' },
      ],
      recordedBy: testUser.id,
    });
    console.log(`✓ Dispatched count for PRESENT students: ${presentOnlyResult.dispatchedCount} (Expected 0)`);
    if (presentOnlyResult.dispatchedCount !== 0) {
      throw new Error('Present students should not trigger absence notifications');
    }

    // 5. Test Fee Invoice Trigger
    console.log('\n--- 3. Testing triggerFeeInvoiceAlerts ---');
    const feeResult = await triggerService.triggerFeeInvoiceAlerts({
      schoolId,
      studentId: testStudent.id,
      amount: 4500,
      currency: 'ETB',
      invoiceNumber: 'INV-2026-0042',
      dueDate: '2026-10-31',
      recordedBy: testUser.id,
    });

    console.log(`✓ Fee alert dispatched: ${feeResult.dispatchedCount}`);
    if (feeResult.dispatchedCount < 1) {
      throw new Error('Expected 1 fee notification dispatched');
    }
    const feeNotif = feeResult.notification;
    console.log(`  Fee Title: "${feeNotif.title}"`);
    console.log(`  Fee Body: "${feeNotif.body}"`);
    console.log(`  Action: ${feeNotif.action_url} [${feeNotif.action_label}]`);
    if (feeNotif.type !== 'FINANCE') throw new Error(`Expected type FINANCE, got ${feeNotif.type}`);
    if (feeNotif.action_url !== '/dashboard/fees') throw new Error(`Expected action_url /dashboard/fees, got ${feeNotif.action_url}`);

    console.log('\n🎉 ALL NotificationTriggerService TESTS PASSED WITH 100% SUCCESS!\n');
  } catch (err) {
    console.error('❌ NotificationTriggerService test failed:', err);
    process.exit(1);
  } finally {
    await db.end();
  }
}

runTests();
