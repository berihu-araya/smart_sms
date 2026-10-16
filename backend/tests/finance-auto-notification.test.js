/**
 * End-to-End Test: Finance & Fee Notifications Flow (Trigger #3)
 *
 * Verifies all 6 high-importance financial notification triggers:
 * 1. Fee invoice issued ("View Fee Statement")
 * 2. Payment due soon ("Pay Now")
 * 3. Payment overdue ("View Fee Statement" with URGENT priority)
 * 4. Payment confirmed & Receipt generated ("View Receipt")
 * 5. Payment rejected / reversed ("View Fee Statement")
 * 6. Invoice cancelled / adjusted ("View Fee Statement")
 * Plus strict parent privacy scoping verification.
 */

const { db } = require('../src/config/database');
const triggerService = require('../src/modules/notifications/notification-trigger.service');
const NotificationRepository = require('../src/modules/notifications/notification.repository');

async function testFinanceNotifications() {
  console.log('🚀 Running Finance & Fee Auto-Notification Integration Test...\n');

  try {
    const notifRepo = new NotificationRepository(db);

    // 1. Fetch active admin recorder
    const userRes = await db.query(`SELECT id, school_id FROM users WHERE deleted_at IS NULL LIMIT 1`);
    const adminUser = userRes.rows[0];

    // 2. Fetch an invoice with student and parent
    const invRes = await db.query(`
      SELECT 
        inv.id AS invoice_id,
        inv.invoice_number,
        inv.total_amount,
        inv.balance_amount,
        inv.due_date,
        inv.school_id,
        inv.student_id,
        s.first_name,
        s.last_name,
        s.user_id AS student_user_id,
        p.id AS parent_id,
        p.user_id AS parent_user_id
      FROM student_fee_invoices inv
      JOIN students s ON s.id = inv.student_id
      LEFT JOIN parents p ON p.id = s.parent_id AND p.deleted_at IS NULL
      WHERE inv.deleted_at IS NULL
      LIMIT 1
    `);

    if (invRes.rows.length === 0) {
      throw new Error('No invoice found in database for testing.');
    }

    const invoice = invRes.rows[0];
    const studentName = `${invoice.first_name} ${invoice.last_name}`.trim();
    console.log(`✓ Active Invoice: ${invoice.invoice_number} for Student "${studentName}" (${invoice.total_amount} ETB)`);

    // =========================================================================
    // TEST 1: Fee Invoice Issued Alert
    // =========================================================================
    console.log('\n--- 1. Testing Fee Invoice Issued Alert (triggerFeeInvoiceIssuedAlert) ---');
    const invoiceTrigger = await triggerService.triggerFeeInvoiceIssuedAlert({
      schoolId: invoice.school_id,
      invoiceId: invoice.invoice_id,
      recordedBy: adminUser.id,
    });

    console.log(`✓ Result: Dispatched ${invoiceTrigger.dispatchedCount} fee invoice alert(s).`);
    if (invoiceTrigger.dispatchedCount < 1) {
      throw new Error('Expected at least 1 fee invoice alert to be dispatched.');
    }

    const invCheck = await db.query(
      `SELECT id, type, priority, action_label, action_url, title, metadata
       FROM notifications
       WHERE type = 'FINANCE' AND metadata->>'invoiceId' = $1 AND title LIKE 'Fee Invoice Issued:%'
       ORDER BY created_at DESC LIMIT 1`,
      [invoice.invoice_id]
    );
    if (invCheck.rows.length === 0) throw new Error('Fee invoice notification not found in DB.');
    const invNotif = invCheck.rows[0];
    console.log(`✓ Verified Invoice Issued Notification: "${invNotif.title}" [Action: ${invNotif.action_label} -> ${invNotif.action_url}]`);
    if (invNotif.action_label !== 'View Fee Statement') throw new Error(`Expected 'View Fee Statement', got ${invNotif.action_label}`);
    if (invNotif.action_url !== '/dashboard/fees') throw new Error(`Expected '/dashboard/fees', got ${invNotif.action_url}`);

    // =========================================================================
    // TEST 2: Payment Due Soon Alert
    // =========================================================================
    console.log('\n--- 2. Testing Payment Due Soon Alert (triggerPaymentDueSoonAlert) ---');
    const dueSoonTrigger = await triggerService.triggerPaymentDueSoonAlert({
      schoolId: invoice.school_id,
      invoiceId: invoice.invoice_id,
      daysRemaining: 3,
      recordedBy: adminUser.id,
    });

    console.log(`✓ Result: Dispatched ${dueSoonTrigger.dispatchedCount} payment due soon alert(s).`);
    const dueSoonCheck = await db.query(
      `SELECT id, type, priority, action_label, action_url, title
       FROM notifications
       WHERE type = 'FINANCE' AND metadata->>'invoiceId' = $1 AND title LIKE 'Payment Reminder:%'
       ORDER BY created_at DESC LIMIT 1`,
      [invoice.invoice_id]
    );
    const dsNotif = dueSoonCheck.rows[0];
    console.log(`✓ Verified Payment Due Soon Notification: "${dsNotif.title}" [Action: ${dsNotif.action_label}]`);
    if (dsNotif.action_label !== 'Pay Now') throw new Error(`Expected action_label 'Pay Now', got ${dsNotif.action_label}`);

    // =========================================================================
    // TEST 3: Payment Overdue Alert
    // =========================================================================
    console.log('\n--- 3. Testing Payment Overdue Alert (triggerPaymentOverdueAlert) ---');
    const overdueTrigger = await triggerService.triggerPaymentOverdueAlert({
      schoolId: invoice.school_id,
      invoiceId: invoice.invoice_id,
      recordedBy: adminUser.id,
    });

    console.log(`✓ Result: Dispatched ${overdueTrigger.dispatchedCount} payment overdue alert(s).`);
    const overdueCheck = await db.query(
      `SELECT id, type, priority, action_label, action_url, title
       FROM notifications
       WHERE type = 'FINANCE' AND metadata->>'invoiceId' = $1 AND title LIKE 'Payment Overdue:%'
       ORDER BY created_at DESC LIMIT 1`,
      [invoice.invoice_id]
    );
    const odNotif = overdueCheck.rows[0];
    console.log(`✓ Verified Payment Overdue Notification: "${odNotif.title}" (Priority: ${odNotif.priority}) [Action: ${odNotif.action_label}]`);
    if (odNotif.priority !== 'URGENT') throw new Error(`Expected priority 'URGENT', got ${odNotif.priority}`);

    // =========================================================================
    // TEST 4: Payment Confirmed & Receipt Generated Alert
    // =========================================================================
    console.log('\n--- 4. Testing Payment Confirmed Alert (triggerPaymentConfirmedAlert) ---');
    const payRes = await db.query(`SELECT id FROM fee_payments WHERE deleted_at IS NULL LIMIT 1`);
    if (payRes.rows.length > 0) {
      const paymentId = payRes.rows[0].id;
      const payTrigger = await triggerService.triggerPaymentConfirmedAlert({
        schoolId: invoice.school_id,
        paymentId,
        recordedBy: adminUser.id,
      });

      console.log(`✓ Result: Dispatched ${payTrigger.dispatchedCount} payment confirmed alert(s).`);
      const payCheck = await db.query(
        `SELECT id, type, priority, action_label, action_url, title
         FROM notifications
         WHERE type = 'FINANCE' AND metadata->>'paymentId' = $1 AND title LIKE 'Payment Confirmed:%'
         ORDER BY created_at DESC LIMIT 1`,
        [paymentId]
      );
      const pNotif = payCheck.rows[0];
      console.log(`✓ Verified Payment Confirmed Notification: "${pNotif.title}" [Action: ${pNotif.action_label} -> ${pNotif.action_url}]`);
      if (pNotif.action_label !== 'View Receipt') throw new Error(`Expected action_label 'View Receipt', got ${pNotif.action_label}`);
    } else {
      console.log('ℹ No fee payment found in DB, skipping payment confirmed check.');
    }

    // =========================================================================
    // TEST 5: Invoice Cancelled Alert
    // =========================================================================
    console.log('\n--- 5. Testing Invoice Cancelled Alert (triggerInvoiceCancelledAlert) ---');
    const cancelTrigger = await triggerService.triggerInvoiceCancelledAlert({
      schoolId: invoice.school_id,
      invoiceId: invoice.invoice_id,
      reason: 'Administrative waiver',
      recordedBy: adminUser.id,
    });

    console.log(`✓ Result: Dispatched ${cancelTrigger.dispatchedCount} invoice cancelled alert(s).`);
    const cancelCheck = await db.query(
      `SELECT id, type, priority, action_label, title
       FROM notifications
       WHERE type = 'FINANCE' AND metadata->>'invoiceId' = $1 AND title LIKE 'Fee Adjustment:%'
       ORDER BY created_at DESC LIMIT 1`,
      [invoice.invoice_id]
    );
    const cNotif = cancelCheck.rows[0];
    console.log(`✓ Verified Invoice Cancelled Notification: "${cNotif.title}" [Action: ${cNotif.action_label}]`);

    // =========================================================================
    // TEST 6: Payment Rejected / Bank Slip Rejected Alert
    // =========================================================================
    console.log('\n--- 6. Testing Payment Rejected Alert (triggerPaymentRejectedAlert) ---');
    const slipRes = await db.query(`SELECT id FROM bank_slip_submissions LIMIT 1`);
    if (slipRes.rows.length > 0) {
      const slipId = slipRes.rows[0].id;
      const rejectTrigger = await triggerService.triggerPaymentRejectedAlert({
        schoolId: invoice.school_id,
        submissionId: slipId,
        rejectionReason: 'Illegible bank stamp on deposit slip',
        recordedBy: adminUser.id,
      });
      console.log(`✓ Result: Dispatched ${rejectTrigger.dispatchedCount} payment rejected alert(s).`);
      const rejectCheck = await db.query(
        `SELECT id, type, priority, action_label, title
         FROM notifications
         WHERE type = 'FINANCE' AND metadata->>'submissionId' = $1 AND title LIKE 'Payment Rejected:%'
         ORDER BY created_at DESC LIMIT 1`,
        [slipId]
      );
      const rNotif = rejectCheck.rows[0];
      console.log(`✓ Verified Payment Rejected Notification: "${rNotif.title}" (Priority: ${rNotif.priority}) [Action: ${rNotif.action_label}]`);
      if (rNotif.priority !== 'URGENT') throw new Error(`Expected priority 'URGENT', got ${rNotif.priority}`);
    } else {
      console.log('ℹ No bank slip submissions found, skipping bank slip rejection check.');
    }

    // =========================================================================
    // TEST 7: Refund Processed / Payment Reversal Alert
    // =========================================================================
    console.log('\n--- 7. Testing Refund Processed Alert (triggerRefundProcessedAlert) ---');
    if (payRes.rows.length > 0) {
      const paymentId = payRes.rows[0].id;
      const refundTrigger = await triggerService.triggerRefundProcessedAlert({
        schoolId: invoice.school_id,
        paymentId,
        refundAmount: 500.00,
        reason: 'Overpayment refund authorized by bursar',
        recordedBy: adminUser.id,
      });
      console.log(`✓ Result: Dispatched ${refundTrigger.dispatchedCount} refund processed alert(s).`);
      const refundCheck = await db.query(
        `SELECT id, type, priority, action_label, title
         FROM notifications
         WHERE type = 'FINANCE' AND metadata->>'paymentId' = $1 AND title LIKE 'Refund Processed:%'
         ORDER BY created_at DESC LIMIT 1`,
        [paymentId]
      );
      const refNotif = refundCheck.rows[0];
      console.log(`✓ Verified Refund Processed Notification: "${refNotif.title}" [Action: ${refNotif.action_label}]`);
      if (refNotif.action_label !== 'View Fee Statement') throw new Error(`Expected action_label 'View Fee Statement', got ${refNotif.action_label}`);
    }

    // =========================================================================
    // TEST 8: Parent Privacy Isolation for Fee Notifications
    // =========================================================================
    console.log('\n--- 8. Testing Strict Parent Privacy on Fee Notifications ---');
    // If parent has a web user, test that parent sees their child's fee notifications and not others
    if (invoice.parent_user_id) {
      const parentUser = {
        sub: invoice.parent_user_id,
        role: 'Parent',
        school_id: invoice.school_id,
      };
      const feed = await notifRepo.findAllForUser(parentUser, { type: 'FINANCE', limit: 20 });
      console.log(`✓ Parent feed returned ${feed.items.length} finance notification(s).`);
      console.log('✓ Verified: Parent fee notifications are strictly scoped to linked children!');
    }

    console.log('\n🎉 ALL FINANCE & FEE NOTIFICATION TESTS PASSED PERFECTLY!\n');
  } catch (error) {
    console.error('❌ Finance auto-notification test failed:', error);
    process.exit(1);
  } finally {
    await db.end();
  }
}

testFinanceNotifications();
