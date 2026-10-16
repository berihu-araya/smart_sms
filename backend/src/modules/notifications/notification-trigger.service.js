const { db } = require('../../config/database');
const NotificationRepository = require('./notification.repository');

class NotificationTriggerService {
  constructor(database = db) {
    this.database = database;
    this.notificationRepo = new NotificationRepository(database);
  }

  /**
   * Safe asynchronous dispatcher for attendance alerts.
   * Triggered when a teacher/staff submits the daily attendance register.
   *
   * @param {Object} params
   * @param {string} params.schoolId - School ID
   * @param {string} params.date - Date of attendance (YYYY-MM-DD)
   * @param {Array<{ student_id: string, status: string, remark?: string }>} params.records - Submitted records
   * @param {string} params.recordedBy - User ID of teacher/staff recording attendance
   */
  async triggerAttendanceAlerts({ schoolId, date, records = [], recordedBy }) {
    if (!Array.isArray(records) || records.length === 0) {
      return { dispatchedCount: 0, alerts: [] };
    }

    try {
      // 1. Filter out only students marked ABSENT or LATE
      const abnormalStatuses = ['ABSENT', 'LATE'];
      const targetRecords = records.filter((r) =>
        abnormalStatuses.includes((r.status || '').toUpperCase())
      );

      if (targetRecords.length === 0) {
        return { dispatchedCount: 0, alerts: [] };
      }

      const studentIds = targetRecords
        .map((r) => r.student_id || r.studentId)
        .filter(Boolean);

      if (studentIds.length === 0) {
        return { dispatchedCount: 0, alerts: [] };
      }

      // 2. Fetch student, section, grade, and parent details in a single query
      const query = `
        SELECT
          s.id AS student_id,
          s.first_name,
          s.last_name,
          s.user_id AS student_user_id,
          s.school_id,
          s.section_id,
          sec.name AS section_name,
          sec.grade_id,
          p.id AS parent_id,
          p.user_id AS parent_user_id,
          p.phone AS parent_phone,
          p.full_name AS parent_name
        FROM students s
        LEFT JOIN sections sec ON sec.id = s.section_id AND sec.deleted_at IS NULL
        LEFT JOIN parents p ON p.id = s.parent_id AND p.deleted_at IS NULL
        WHERE s.id = ANY($1::uuid[])
          AND s.deleted_at IS NULL
      `;

      const studentDataRes = await this.database.query(query, [studentIds]);
      const studentMap = new Map();
      studentDataRes.rows.forEach((s) => studentMap.set(s.student_id, s));

      const dispatched = [];

      // 3. Dispatch an alert for each absent/late student
      for (const record of targetRecords) {
        const studentId = record.student_id || record.studentId;
        const studentInfo = studentMap.get(studentId);
        if (!studentInfo) continue;

        const studentName = `${studentInfo.first_name} ${studentInfo.last_name}`.trim();
        const sectionName = studentInfo.section_name || 'Class';
        const isAbsent = (record.status || '').toUpperCase() === 'ABSENT';

        const title = isAbsent
          ? `Absence Alert: ${studentName}`
          : `Late Arrival Notice: ${studentName}`;

        const body = isAbsent
          ? `${studentName} was recorded ABSENT on ${date} in Section ${sectionName}. If this was unexpected, please review the attendance record or contact the school administration.`
          : `${studentName} was recorded LATE on ${date} in Section ${sectionName}.${record.remark ? ` Reason: ${record.remark}` : ''}`;

        const priority = isAbsent ? 'HIGH' : 'NORMAL';

        const basePayload = {
          schoolId: schoolId || studentInfo.school_id,
          gradeId: studentInfo.grade_id || null,
          sectionId: studentInfo.section_id || null,
          type: 'ATTENDANCE',
          priority,
          title,
          body,
          actionUrl: '/dashboard/attendance',
          actionLabel: 'View Attendance Record',
          channel: 'IN_APP_AND_SMS',
          metadata: {
            studentId: studentInfo.student_id,
            studentName,
            status: record.status,
            date,
            sectionId: studentInfo.section_id,
            parentPhone: studentInfo.parent_phone,
          },
          publishedAt: new Date(),
          createdBy: recordedBy,
        };

        // If parent has a web user account, deliver directly to parent
        if (studentInfo.parent_user_id) {
          const parentNotif = await this.notificationRepo.create({
            ...basePayload,
            audience: 'PARENTS',
            recipientUserId: studentInfo.parent_user_id,
          });
          dispatched.push(parentNotif);
        }

        // If student has a web user account, deliver directly to student
        if (studentInfo.student_user_id) {
          const studentNotif = await this.notificationRepo.create({
            ...basePayload,
            audience: 'STUDENTS',
            recipientUserId: studentInfo.student_user_id,
          });
          dispatched.push(studentNotif);
        }

        // If neither has a linked web account yet, create the institutional alert for the class section
        if (!studentInfo.parent_user_id && !studentInfo.student_user_id) {
          const classNotif = await this.notificationRepo.create({
            ...basePayload,
            audience: 'PARENTS',
            recipientUserId: null,
          });
          dispatched.push(classNotif);
        }
      }

      console.log(`[NotificationTriggerService] Dispatched ${dispatched.length} attendance alert(s) for ${date}.`);
      return { dispatchedCount: dispatched.length, alerts: dispatched };
    } catch (error) {
      // Non-blocking log: attendance saving must never abort due to notification dispatch
      console.error('[NotificationTriggerService] Failed to dispatch attendance alerts:', error);
      return { dispatchedCount: 0, error: error.message };
    }
  }

  /**
   * Safe asynchronous dispatcher for academic & examination results.
   * Triggered when teacher/admin submits or publishes exam marks.
   *
   * @param {Object} params
   * @param {string} params.schoolId - School ID
   * @param {string} params.examId - Exam ID
   * @param {string} params.subjectId - Subject ID
   * @param {string} params.sectionId - Section ID
   * @param {string} params.recordedBy - User ID of teacher/admin
   */
  async triggerExamResultsAlerts({ schoolId, examId, subjectId, sectionId, recordedBy }) {
    try {
      // 1. Fetch Exam, Subject, and Section metadata
      const metaQuery = `
        SELECT 
          e.id AS exam_id,
          e.title AS exam_title,
          e.exam_type,
          e.max_marks,
          sub.name AS subject_name,
          sub.code AS subject_code,
          sec.name AS section_name,
          sec.grade_id,
          g.name AS grade_name
        FROM exams e
        CROSS JOIN subjects sub
        CROSS JOIN sections sec
        LEFT JOIN grades g ON g.id = sec.grade_id
        WHERE e.id = $1 AND sub.id = $2 AND sec.id = $3
      `;

      const metaRes = await this.database.query(metaQuery, [examId, subjectId, sectionId]);
      if (metaRes.rows.length === 0) {
        return { dispatchedCount: 0 };
      }

      const meta = metaRes.rows[0];
      const title = `Results Released: ${meta.subject_name} (${meta.exam_title})`;
      const body = `Official examination marks for ${meta.subject_name} in ${meta.exam_title} (${meta.grade_name ? `${meta.grade_name} - ` : ''}${meta.section_name}) have been recorded and published. Check your gradebook for details.`;

      // 2. Fetch all student and parent user IDs in this section
      const enrolledQuery = `
        SELECT 
          s.id AS student_id,
          s.user_id AS student_user_id,
          p.user_id AS parent_user_id
        FROM students s
        LEFT JOIN parents p ON p.id = s.parent_id AND p.deleted_at IS NULL
        WHERE s.section_id = $1 AND s.deleted_at IS NULL
      `;

      const enrolledRes = await this.database.query(enrolledQuery, [sectionId]);
      const recipients = [];

      enrolledRes.rows.forEach((r) => {
        if (r.student_user_id) recipients.push(r.student_user_id);
        if (r.parent_user_id) recipients.push(r.parent_user_id);
      });

      // 3. Create broadcast notification
      const basePayload = {
        schoolId,
        gradeId: meta.grade_id,
        sectionId,
        audience: 'ALL',
        type: 'EXAM',
        priority: 'HIGH',
        title,
        body,
        actionUrl: '/dashboard/marks',
        actionLabel: 'Check Gradebook',
        channel: 'IN_APP',
        metadata: {
          examId,
          examTitle: meta.exam_title,
          subjectId,
          subjectName: meta.subject_name,
          sectionId,
        },
        publishedAt: new Date(),
        createdBy: recordedBy,
      };

      const createdNotif = await this.notificationRepo.create(basePayload);

      // Proactively seed user_notifications for fast indexing if recipients exist
      if (recipients.length > 0) {
        const uniqueRecipients = [...new Set(recipients)];
        for (const uId of uniqueRecipients) {
          await this.database.query(
            `INSERT INTO user_notifications (notification_id, user_id, is_read, created_at)
             VALUES ($1, $2, false, CURRENT_TIMESTAMP)
             ON CONFLICT (notification_id, user_id) DO NOTHING`,
            [createdNotif.id, uId]
          );
        }
      }

      console.log(`[NotificationTriggerService] Dispatched Exam Results alert to ${recipients.length} user(s).`);
      return { dispatchedCount: recipients.length, notification: createdNotif };
    } catch (error) {
      console.error('[NotificationTriggerService] Failed to dispatch exam results alert:', error);
      return { dispatchedCount: 0, error: error.message };
    }
  }

  /**
   * Safe asynchronous dispatcher for fee invoices and payment due dates.
   * Triggered when fee obligation or invoice is generated.
   *
   * @param {Object} params
   * @param {string} params.schoolId - School ID
   * @param {string} params.studentId - Student ID
   * @param {number|string} params.amount - Amount
   * @param {string} params.currency - Currency (e.g., 'ETB', 'USD')
   * @param {string} params.invoiceNumber - Invoice number
   * @param {string} params.dueDate - Due date (YYYY-MM-DD)
   * @param {string} params.recordedBy - User ID generating invoice
   */
  async triggerFeeInvoiceAlerts({ schoolId, studentId, amount, currency = 'ETB', invoiceNumber, dueDate, recordedBy }) {
    try {
      const studentQuery = `
        SELECT 
          s.id,
          s.first_name,
          s.last_name,
          s.school_id,
          s.user_id AS student_user_id,
          p.user_id AS parent_user_id,
          p.phone AS parent_phone
        FROM students s
        LEFT JOIN parents p ON p.id = s.parent_id AND p.deleted_at IS NULL
        WHERE s.id = $1 AND s.deleted_at IS NULL
      `;

      const studentRes = await this.database.query(studentQuery, [studentId]);
      if (studentRes.rows.length === 0) return { dispatchedCount: 0 };

      const student = studentRes.rows[0];
      const studentName = `${student.first_name} ${student.last_name}`.trim();

      const title = `Tuition Fee Invoice: ${invoiceNumber || 'New Due'}`;
      const body = `An invoice of ${Number(amount).toLocaleString()} ${currency} for ${studentName} has been issued. Payment is due on ${dueDate || 'the scheduled date'}.`;

      const targetUserId = student.parent_user_id || student.student_user_id || null;

      const createdNotif = await this.notificationRepo.create({
        schoolId: schoolId || student.school_id,
        audience: student.parent_user_id ? 'PARENTS' : 'ALL',
        type: 'FINANCE',
        priority: 'NORMAL',
        title,
        body,
        actionUrl: '/dashboard/fees',
        actionLabel: 'View Fee Statement',
        channel: 'IN_APP_AND_SMS',
        metadata: {
          studentId,
          studentName,
          amount,
          currency,
          invoiceNumber,
          dueDate,
          parentPhone: student.parent_phone,
        },
        recipientUserId: targetUserId,
        publishedAt: new Date(),
        createdBy: recordedBy,
      });

      console.log(`[NotificationTriggerService] Dispatched Fee Invoice notification for ${studentName}.`);
      return { dispatchedCount: 1, notification: createdNotif };
    } catch (error) {
      console.error('[NotificationTriggerService] Failed to dispatch fee alert:', error);
      return { dispatchedCount: 0, error: error.message };
    }
  }
}

module.exports = new NotificationTriggerService();
