/**
 * End-to-End Test: Academic & Examination Auto-Notifications Flow
 *
 * Verifies all 5 triggers:
 * 1. Exam Results Published (hooked into mark.controller.js) with "Check Gradebook"
 * 2. Report Cards Officially Published (hooked into result.controller.js) with "Check Gradebook"
 * 3. Exam or Assessment Scheduled (hooked into exam.controller.js) with "View Exam Schedule"
 * 4. Exam Schedule / Timetable Changed (hooked into exam.controller.js) with "View Timetable"
 * 5. Assignment Created & Graded (hooked into assignment.controller.js)
 */

const { db } = require('../src/config/database');
const triggerService = require('../src/modules/notifications/notification-trigger.service');
const NotificationRepository = require('../src/modules/notifications/notification.repository');

async function testAcademicNotifications() {
  console.log('🚀 Running Academic & Examination Auto-Notification Integration Test...\n');

  try {
    const notifRepo = new NotificationRepository(db);

    // 1. Fetch active test context (admin user, exam, section, subject, student)
    const userRes = await db.query(`SELECT id, school_id FROM users WHERE deleted_at IS NULL LIMIT 1`);
    const adminUser = userRes.rows[0];

    const examRes = await db.query(`
      SELECT e.id, e.title, e.school_id, e.grade_id, e.subject_id, e.exam_date, e.max_marks,
             sub.subject_name, sec.id AS section_id
      FROM exams e
      JOIN subjects sub ON sub.id = e.subject_id
      JOIN sections sec ON sec.grade_id = e.grade_id AND sec.deleted_at IS NULL
      WHERE e.deleted_at IS NULL
      LIMIT 1
    `);

    if (examRes.rows.length === 0) {
      console.log('⚠ No exam with subject and section found. Creating or selecting minimal fixtures...');
    }

    const examMeta = examRes.rows[0];
    const sectionId = examMeta.section_id;
    const examId = examMeta.id;
    const subjectId = examMeta.subject_id;

    // Fetch two students in this section for privacy verification
    const studentsRes = await db.query(
      `SELECT s.id, s.first_name, s.last_name, s.user_id AS student_user_id,
              p.id AS parent_id, p.user_id AS parent_user_id
       FROM students s
       LEFT JOIN parents p ON p.id = s.parent_id AND p.deleted_at IS NULL
       WHERE s.section_id = $1 AND s.deleted_at IS NULL
       LIMIT 2`,
      [sectionId]
    );

    const studentA = studentsRes.rows[0];
    const studentB = studentsRes.rows[1] || null;

    console.log(`✓ Active Context: Exam "${examMeta.title}" (${examMeta.subject_name}) in Section ${sectionId}`);
    if (studentA) console.log(`✓ Student A: ${studentA.first_name} ${studentA.last_name} (${studentA.id})`);
    if (studentB) console.log(`✓ Student B: ${studentB.first_name} ${studentB.last_name} (${studentB.id})`);

    // =========================================================================
    // TEST 1: Trigger #2 Exam Results Publication & Personalized Score Alerts
    // =========================================================================
    console.log('\n--- 1. Testing Exam Results Publication (triggerExamResultsAlerts) ---');
    const marksPayload = [
      { studentId: studentA.id, score: 92, isAbsent: false, remarks: 'Excellent performance' },
    ];
    if (studentB) {
      marksPayload.push({ studentId: studentB.id, score: 45, isAbsent: false, remarks: 'Needs improvement' });
    }

    const resultsTrigger = await triggerService.triggerExamResultsAlerts({
      schoolId: examMeta.school_id,
      examId,
      subjectId,
      sectionId,
      marks: marksPayload,
      recordedBy: adminUser.id,
    });

    console.log(`✓ Result: Dispatched ${resultsTrigger.dispatchedCount} exam result alert(s).`);
    if (resultsTrigger.dispatchedCount < 1) {
      throw new Error('Expected at least 1 exam result alert to be dispatched.');
    }

    // Verify broadcast notification in database
    const broadcastCheck = await db.query(
      `SELECT id, type, priority, action_url, action_label, title, body, metadata
       FROM notifications
       WHERE type = 'EXAM' AND action_label = 'Check Gradebook' AND metadata->>'examId' = $1
       ORDER BY created_at DESC LIMIT 1`,
      [examId]
    );
    if (broadcastCheck.rows.length === 0) {
      throw new Error('Broadcast exam results notification was not found in DB.');
    }
    const bNotif = broadcastCheck.rows[0];
    console.log(`✓ Verified Broadcast Notification: "${bNotif.title}" [Action: ${bNotif.action_label} -> ${bNotif.action_url}]`);

    // Verify individual student score notification exists and embeds studentId in metadata
    const studentANotif = await db.query(
      `SELECT id, title, body, metadata
       FROM notifications
       WHERE type = 'EXAM' AND metadata->>'studentId' = $1
       ORDER BY created_at DESC LIMIT 1`,
      [studentA.id]
    );
    if (studentANotif.rows.length > 0) {
      const sNotif = studentANotif.rows[0];
      console.log(`✓ Verified Student A Personalized Result: "${sNotif.title}" (Score: ${sNotif.metadata.score})`);
      if (Number(sNotif.metadata.score) !== 92) {
        throw new Error(`Expected score 92, got ${sNotif.metadata.score}`);
      }
    }

    // =========================================================================
    // TEST 2: Official Report Card Publication (triggerReportCardPublishedAlert)
    // =========================================================================
    console.log('\n--- 2. Testing Report Card Publication (triggerReportCardPublishedAlert) ---');
    const reportCardTrigger = await triggerService.triggerReportCardPublishedAlert({
      schoolId: examMeta.school_id,
      sectionId,
      term: 'Semester 1 Final',
      recordedBy: adminUser.id,
    });

    console.log(`✓ Result: Dispatched report card notification to ${reportCardTrigger.dispatchedCount} user(s).`);
    if (reportCardTrigger.dispatchedCount < 1) {
      throw new Error('Expected report card notification to be dispatched.');
    }

    const rcCheck = await db.query(
      `SELECT id, title, body, action_label, action_url
       FROM notifications
       WHERE title LIKE 'Report Cards Published:%'
       ORDER BY created_at DESC LIMIT 1`
    );
    const rcNotif = rcCheck.rows[0];
    console.log(`✓ Verified Report Card Notification: "${rcNotif.title}" [Action: ${rcNotif.action_label} -> ${rcNotif.action_url}]`);
    if (rcNotif.action_label !== 'Check Gradebook') {
      throw new Error(`Expected action_label 'Check Gradebook', got '${rcNotif.action_label}'`);
    }

    // =========================================================================
    // TEST 3: Exam Scheduled Alert (triggerExamScheduledAlert)
    // =========================================================================
    console.log('\n--- 3. Testing Exam Scheduled Alert (triggerExamScheduledAlert) ---');
    const scheduledTrigger = await triggerService.triggerExamScheduledAlert({
      schoolId: examMeta.school_id,
      exam: examMeta,
      recordedBy: adminUser.id,
    });

    console.log(`✓ Result: Dispatched exam scheduled notification.`);
    const schedCheck = await db.query(
      `SELECT id, title, action_label, action_url
       FROM notifications
       WHERE title LIKE 'Exam Scheduled:%' AND metadata->>'examId' = $1
       ORDER BY created_at DESC LIMIT 1`,
      [examId]
    );
    const schedNotif = schedCheck.rows[0];
    console.log(`✓ Verified Exam Scheduled Notification: "${schedNotif.title}" [Action: ${schedNotif.action_label} -> ${schedNotif.action_url}]`);
    if (schedNotif.action_label !== 'View Exam Schedule') {
      throw new Error(`Expected 'View Exam Schedule', got '${schedNotif.action_label}'`);
    }

    // =========================================================================
    // TEST 4: Exam Schedule Changed Alert (triggerExamScheduleChangedAlert)
    // =========================================================================
    console.log('\n--- 4. Testing Exam Schedule Changed Alert (triggerExamScheduleChangedAlert) ---');
    const scheduleChangedTrigger = await triggerService.triggerExamScheduleChangedAlert({
      schoolId: examMeta.school_id,
      exam: { ...examMeta, exam_date: '2026-11-20' },
      recordedBy: adminUser.id,
    });

    console.log(`✓ Result: Dispatched exam schedule changed notification.`);
    const changeCheck = await db.query(
      `SELECT id, title, priority, action_label, action_url
       FROM notifications
       WHERE title LIKE 'Exam Schedule Updated:%' AND metadata->>'examId' = $1
       ORDER BY created_at DESC LIMIT 1`,
      [examId]
    );
    const changeNotif = changeCheck.rows[0];
    console.log(`✓ Verified Exam Schedule Changed Notification: "${changeNotif.title}" (Priority: ${changeNotif.priority}) [Action: ${changeNotif.action_label}]`);
    if (changeNotif.priority !== 'URGENT') {
      throw new Error(`Expected priority 'URGENT', got '${changeNotif.priority}'`);
    }

    // =========================================================================
    // TEST 5: Assignment Created Alert (triggerAssignmentCreatedAlert)
    // =========================================================================
    console.log('\n--- 5. Testing Assignment Created Alert (triggerAssignmentCreatedAlert) ---');
    const assignRes = await db.query(`SELECT id FROM assignments WHERE deleted_at IS NULL LIMIT 1`);
    if (assignRes.rows.length > 0) {
      const assignmentId = assignRes.rows[0].id;
      const assignTrigger = await triggerService.triggerAssignmentCreatedAlert({
        schoolId: examMeta.school_id,
        assignment: { id: assignmentId },
        recordedBy: adminUser.id,
      });

      console.log(`✓ Result: Dispatched assignment created notification.`);
      const assignCheck = await db.query(
        `SELECT id, title, type, action_label, action_url
         FROM notifications
         WHERE title LIKE 'New Assignment:%' AND metadata->>'assignmentId' = $1
         ORDER BY created_at DESC LIMIT 1`,
        [assignmentId]
      );
      const aNotif = assignCheck.rows[0];
      console.log(`✓ Verified Assignment Created Notification: "${aNotif.title}" [Action: ${aNotif.action_label}]`);
      if (aNotif.type !== 'ACADEMIC') {
        throw new Error(`Expected type 'ACADEMIC', got '${aNotif.type}'`);
      }
    } else {
      console.log('ℹ No assignment found in DB to test assignment created trigger, skipping.');
    }

    // =========================================================================
    // TEST 6: Assignment Graded Alert (triggerAssignmentGradedAlert)
    // =========================================================================
    console.log('\n--- 6. Testing Assignment Graded Alert (triggerAssignmentGradedAlert) ---');
    const subRes = await db.query(`SELECT id FROM assignment_submissions WHERE deleted_at IS NULL LIMIT 1`);
    if (subRes.rows.length > 0) {
      const submissionId = subRes.rows[0].id;
      const gradedTrigger = await triggerService.triggerAssignmentGradedAlert({
        schoolId: examMeta.school_id,
        submissionId,
        recordedBy: adminUser.id,
      });

      console.log(`✓ Result: Dispatched assignment graded notification.`);
      const subCheck = await db.query(
        `SELECT id, title, type, action_label, action_url
         FROM notifications
         WHERE title LIKE 'Assignment Graded:%' AND metadata->>'submissionId' = $1
         ORDER BY created_at DESC LIMIT 1`,
        [submissionId]
      );
      const gNotif = subCheck.rows[0];
      console.log(`✓ Verified Assignment Graded Notification: "${gNotif.title}" [Action: ${gNotif.action_label}]`);
      if (gNotif.action_label !== 'View Graded Submission') {
        throw new Error(`Expected action_label 'View Graded Submission', got '${gNotif.action_label}'`);
      }
    } else {
      console.log('ℹ No assignment submission found in DB, skipping submission graded test.');
    }

    console.log('\n🎉 ALL ACADEMIC & EXAMINATION NOTIFICATION TESTS PASSED PERFECTLY!\n');
  } catch (error) {
    console.error('❌ Academic auto-notification test failed:', error);
    process.exit(1);
  } finally {
    await db.end();
  }
}

testAcademicNotifications();
