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
   * @param {Array<{ studentId: string, score?: number, isAbsent?: boolean, remarks?: string }>} [params.marks] - Submitted mark entries
   * @param {string} params.recordedBy - User ID of teacher/admin
   */
  async triggerExamResultsAlerts({ schoolId, examId, subjectId, sectionId, marks = [], recordedBy }) {
    try {
      // 1. Fetch Exam, Subject, and Section metadata
      const metaQuery = `
        SELECT 
          e.id AS exam_id,
          e.title AS exam_title,
          e.exam_type,
          e.max_marks,
          COALESCE(e.school_id, sec.school_id) AS school_id,
          sub.id AS subject_id,
          sub.subject_name AS subject_name,
          COALESCE(sub.subject_code, '') AS subject_code,
          sec.id AS section_id,
          sec.name AS section_name,
          sec.grade_id,
          g.name AS grade_name
        FROM exams e
        JOIN subjects sub ON sub.id = $2
        JOIN sections sec ON sec.id = $3
        LEFT JOIN grades g ON g.id = sec.grade_id
        WHERE e.id = $1
      `;

      const metaRes = await this.database.query(metaQuery, [examId, subjectId, sectionId]);
      if (metaRes.rows.length === 0) {
        return { dispatchedCount: 0 };
      }

      const meta = metaRes.rows[0];
      const effectiveSchoolId = schoolId || meta.school_id;
      const dispatched = [];

      // 2. If individual student marks are provided, dispatch personalized alerts (preserving strict privacy)
      if (Array.isArray(marks) && marks.length > 0) {
        const studentIds = marks
          .map((m) => m.student_id || m.studentId)
          .filter(Boolean);

        if (studentIds.length > 0) {
          const studentQuery = `
            SELECT 
              s.id AS student_id,
              s.first_name,
              s.last_name,
              s.user_id AS student_user_id,
              p.id AS parent_id,
              p.user_id AS parent_user_id,
              p.phone AS parent_phone
            FROM students s
            LEFT JOIN parents p ON p.id = s.parent_id AND p.deleted_at IS NULL
            WHERE s.id = ANY($1::uuid[]) AND s.deleted_at IS NULL
          `;

          const studentRes = await this.database.query(studentQuery, [studentIds]);
          const studentMap = new Map();
          studentRes.rows.forEach((s) => studentMap.set(s.student_id, s));

          for (const markItem of marks) {
            const sId = markItem.student_id || markItem.studentId;
            const studentInfo = studentMap.get(sId);
            if (!studentInfo) continue;

            const studentName = `${studentInfo.first_name} ${studentInfo.last_name}`.trim();
            const isAbsent = Boolean(markItem.isAbsent || markItem.is_absent);
            const scoreText = isAbsent
              ? 'recorded as ABSENT'
              : `scored ${markItem.score ?? markItem.marksObtained ?? 0}/${meta.max_marks}`;

            const baseStudentPayload = {
              schoolId: effectiveSchoolId,
              gradeId: meta.grade_id,
              sectionId: meta.section_id,
              type: 'EXAM',
              priority: isAbsent ? 'HIGH' : 'NORMAL',
              actionUrl: '/dashboard/results/report-card',
              actionLabel: 'Check Gradebook',
              channel: 'IN_APP_AND_SMS',
              metadata: {
                studentId: studentInfo.student_id,
                studentName,
                examId: meta.exam_id,
                examTitle: meta.exam_title,
                subjectId: meta.subject_id,
                subjectName: meta.subject_name,
                score: markItem.score ?? markItem.marksObtained ?? null,
                isAbsent,
                maxMarks: meta.max_marks,
                remarks: markItem.remarks || '',
                parentPhone: studentInfo.parent_phone,
              },
              publishedAt: new Date(),
              createdBy: recordedBy,
            };

            // Deliver directly to student user account if linked
            if (studentInfo.student_user_id) {
              const studentNotif = await this.notificationRepo.create({
                ...baseStudentPayload,
                audience: 'STUDENTS',
                title: `Mark Recorded: ${meta.subject_name}`,
                body: `Your mark for ${meta.subject_name} (${meta.exam_title}) has been recorded: ${scoreText}.${markItem.remarks ? ` Remarks: ${markItem.remarks}` : ''}`,
                recipientUserId: studentInfo.student_user_id,
              });
              dispatched.push(studentNotif);
            }

            // Deliver directly to parent user account if linked
            if (studentInfo.parent_user_id) {
              const parentNotif = await this.notificationRepo.create({
                ...baseStudentPayload,
                audience: 'PARENTS',
                title: `Exam Result: ${studentName}`,
                body: `${studentName}'s result for ${meta.subject_name} (${meta.exam_title}) has been published: ${scoreText}. Check gradebook for details.`,
                recipientUserId: studentInfo.parent_user_id,
              });
              dispatched.push(parentNotif);
            }

            // If neither has a linked web account yet, create institutional notification with studentId in metadata
            // Strict parent-student visibility scope ensures only verified parents see this child's marks upon login
            if (!studentInfo.parent_user_id && !studentInfo.student_user_id) {
              const scopedNotif = await this.notificationRepo.create({
                ...baseStudentPayload,
                audience: 'PARENTS',
                title: `Exam Result: ${studentName}`,
                body: `${studentName}'s result for ${meta.subject_name} (${meta.exam_title}) has been published: ${scoreText}. Check gradebook for details.`,
                recipientUserId: null,
              });
              dispatched.push(scopedNotif);
            }
          }
        }
      }

      // 3. Create general class section broadcast announcement
      const broadcastTitle = `Results Released: ${meta.subject_name} (${meta.exam_title})`;
      const broadcastBody = `Official examination marks for ${meta.subject_name} in ${meta.exam_title} (${meta.grade_name ? `${meta.grade_name} - ` : ''}${meta.section_name}) have been recorded and published. Check your gradebook for details.`;

      const broadcastPayload = {
        schoolId: effectiveSchoolId,
        gradeId: meta.grade_id,
        sectionId: meta.section_id,
        audience: 'ALL',
        type: 'EXAM',
        priority: 'HIGH',
        title: broadcastTitle,
        body: broadcastBody,
        actionUrl: '/dashboard/results/report-card',
        actionLabel: 'Check Gradebook',
        channel: 'IN_APP',
        metadata: {
          examId: meta.exam_id,
          examTitle: meta.exam_title,
          subjectId: meta.subject_id,
          subjectName: meta.subject_name,
          sectionId: meta.section_id,
          studentCount: marks.length,
        },
        publishedAt: new Date(),
        createdBy: recordedBy,
      };

      const broadcastNotif = await this.notificationRepo.create(broadcastPayload);
      dispatched.push(broadcastNotif);

      // Proactively seed user_notifications for all enrolled student and parent accounts in this section
      const enrolledRes = await this.database.query(
        `SELECT s.user_id AS student_user_id, p.user_id AS parent_user_id
         FROM students s
         LEFT JOIN parents p ON p.id = s.parent_id AND p.deleted_at IS NULL
         WHERE s.section_id = $1 AND s.deleted_at IS NULL`,
        [sectionId]
      );

      const recipientUserIds = new Set();
      enrolledRes.rows.forEach((r) => {
        if (r.student_user_id) recipientUserIds.add(r.student_user_id);
        if (r.parent_user_id) recipientUserIds.add(r.parent_user_id);
      });

      for (const uId of recipientUserIds) {
        await this.database.query(
          `INSERT INTO user_notifications (notification_id, user_id, is_read, created_at)
           VALUES ($1, $2, false, CURRENT_TIMESTAMP)
           ON CONFLICT (notification_id, user_id) DO NOTHING`,
          [broadcastNotif.id, uId]
        );
      }

      console.log(`[NotificationTriggerService] Dispatched ${dispatched.length} exam result notification(s) for ${meta.subject_name} (${meta.exam_title}).`);
      return { dispatchedCount: dispatched.length, broadcast: broadcastNotif, alerts: dispatched };
    } catch (error) {
      console.error('[NotificationTriggerService] Failed to dispatch exam results alert:', error);
      return { dispatchedCount: 0, error: error.message };
    }
  }

  /**
   * Safe asynchronous dispatcher for official term report card publication.
   * Triggered when admin/class teacher publishes term results or report cards.
   *
   * @param {Object} params
   * @param {string} params.schoolId - School ID
   * @param {string} params.sectionId - Section ID
   * @param {string} [params.term] - Term or semester (e.g., 'Semester 1')
   * @param {string} [params.academicYearId] - Academic Year ID
   * @param {string} params.recordedBy - User ID
   */
  async triggerReportCardPublishedAlert({ schoolId, sectionId, term = 'Current Term', academicYearId, recordedBy }) {
    try {
      const sectionQuery = `
        SELECT 
          sec.id AS section_id,
          sec.name AS section_name,
          sec.grade_id,
          sec.school_id,
          g.name AS grade_name,
          ay.name AS academic_year_name
        FROM sections sec
        LEFT JOIN grades g ON g.id = sec.grade_id
        LEFT JOIN academic_years ay ON ay.id = $2
        WHERE sec.id = $1 AND sec.deleted_at IS NULL
      `;

      const secRes = await this.database.query(sectionQuery, [sectionId, academicYearId || null]);
      if (secRes.rows.length === 0) return { dispatchedCount: 0 };

      const secMeta = secRes.rows[0];
      const effectiveSchoolId = schoolId || secMeta.school_id;

      const title = `Report Cards Published: ${term} (${secMeta.grade_name} - ${secMeta.section_name})`;
      const body = `Official academic report cards for ${term} have been calculated and officially published. Tap below to check your gradebook, class rank, and performance breakdown.`;

      const notif = await this.notificationRepo.create({
        schoolId: effectiveSchoolId,
        gradeId: secMeta.grade_id,
        sectionId: secMeta.section_id,
        audience: 'ALL',
        type: 'EXAM',
        priority: 'HIGH',
        title,
        body,
        actionUrl: '/dashboard/results/report-card',
        actionLabel: 'Check Gradebook',
        channel: 'IN_APP_AND_SMS',
        metadata: {
          sectionId,
          sectionName: secMeta.section_name,
          gradeId: secMeta.grade_id,
          gradeName: secMeta.grade_name,
          term,
          academicYearId,
        },
        publishedAt: new Date(),
        createdBy: recordedBy,
      });

      // Proactively seed for enrolled users
      const enrolledRes = await this.database.query(
        `SELECT s.user_id AS student_user_id, p.user_id AS parent_user_id
         FROM students s
         LEFT JOIN parents p ON p.id = s.parent_id AND p.deleted_at IS NULL
         WHERE s.section_id = $1 AND s.deleted_at IS NULL`,
        [sectionId]
      );

      const recipientUserIds = new Set();
      enrolledRes.rows.forEach((r) => {
        if (r.student_user_id) recipientUserIds.add(r.student_user_id);
        if (r.parent_user_id) recipientUserIds.add(r.parent_user_id);
      });

      for (const uId of recipientUserIds) {
        await this.database.query(
          `INSERT INTO user_notifications (notification_id, user_id, is_read, created_at)
           VALUES ($1, $2, false, CURRENT_TIMESTAMP)
           ON CONFLICT (notification_id, user_id) DO NOTHING`,
          [notif.id, uId]
        );
      }

      console.log(`[NotificationTriggerService] Dispatched Report Cards Published alert for section ${secMeta.section_name}.`);
      return { dispatchedCount: recipientUserIds.size + 1, notification: notif };
    } catch (error) {
      console.error('[NotificationTriggerService] Failed to dispatch report card alert:', error);
      return { dispatchedCount: 0, error: error.message };
    }
  }

  /**
   * Safe asynchronous dispatcher when an exam or assessment is scheduled.
   *
   * @param {Object} params
   * @param {string} [params.schoolId] - School ID
   * @param {Object} params.exam - Exam entity
   * @param {string} params.recordedBy - User ID
   */
  async triggerExamScheduledAlert({ schoolId, exam, recordedBy }) {
    if (!exam || !exam.id) return { dispatchedCount: 0 };

    try {
      const metaQuery = `
        SELECT 
          e.id AS exam_id,
          e.title AS exam_title,
          e.exam_type,
          e.max_marks,
          e.weight_percentage,
          e.exam_date,
          e.is_published,
          e.school_id,
          e.grade_id,
          g.name AS grade_name,
          sub.id AS subject_id,
          sub.subject_name,
          COALESCE(sub.subject_code, '') AS subject_code
        FROM exams e
        LEFT JOIN grades g ON g.id = e.grade_id
        LEFT JOIN subjects sub ON sub.id = e.subject_id
        WHERE e.id = $1
      `;

      const metaRes = await this.database.query(metaQuery, [exam.id]);
      if (metaRes.rows.length === 0) return { dispatchedCount: 0 };

      const meta = metaRes.rows[0];
      const effectiveSchoolId = schoolId || meta.school_id;
      const formattedDate = meta.exam_date ? new Date(meta.exam_date).toLocaleDateString() : 'TBD';

      const title = `Exam Scheduled: ${meta.exam_title} (${meta.subject_name || 'General'})`;
      const body = `An exam for ${meta.subject_name || 'Subject'} (${meta.exam_title}) in ${meta.grade_name || 'Grade'} has been scheduled on ${formattedDate}. Maximum marks: ${meta.max_marks || 100}, Weight: ${meta.weight_percentage || 0}%.`;

      const notif = await this.notificationRepo.create({
        schoolId: effectiveSchoolId,
        gradeId: meta.grade_id,
        sectionId: null,
        audience: 'ALL',
        type: 'EXAM',
        priority: 'HIGH',
        title,
        body,
        actionUrl: '/dashboard/exams',
        actionLabel: 'View Exam Schedule',
        channel: 'IN_APP',
        metadata: {
          examId: meta.exam_id,
          gradeId: meta.grade_id,
          subjectId: meta.subject_id,
          examDate: meta.exam_date,
          examType: meta.exam_type,
          maxMarks: meta.max_marks,
        },
        publishedAt: new Date(),
        createdBy: recordedBy,
      });

      console.log(`[NotificationTriggerService] Dispatched Exam Scheduled alert for ${meta.exam_title}.`);
      return { dispatchedCount: 1, notification: notif };
    } catch (error) {
      console.error('[NotificationTriggerService] Failed to dispatch exam scheduled alert:', error);
      return { dispatchedCount: 0, error: error.message };
    }
  }

  /**
   * Safe asynchronous dispatcher when an exam date, time, or schedule is updated.
   *
   * @param {Object} params
   * @param {string} [params.schoolId] - School ID
   * @param {Object} params.exam - Updated exam entity
   * @param {Object} [params.oldExam] - Previous exam entity
   * @param {string} params.recordedBy - User ID
   */
  async triggerExamScheduleChangedAlert({ schoolId, exam, oldExam, recordedBy }) {
    if (!exam || !exam.id) return { dispatchedCount: 0 };

    try {
      const metaQuery = `
        SELECT 
          e.id AS exam_id,
          e.title AS exam_title,
          e.exam_type,
          e.max_marks,
          e.weight_percentage,
          e.exam_date,
          e.is_published,
          e.school_id,
          e.grade_id,
          g.name AS grade_name,
          sub.id AS subject_id,
          sub.subject_name
        FROM exams e
        LEFT JOIN grades g ON g.id = e.grade_id
        LEFT JOIN subjects sub ON sub.id = e.subject_id
        WHERE e.id = $1
      `;

      const metaRes = await this.database.query(metaQuery, [exam.id]);
      if (metaRes.rows.length === 0) return { dispatchedCount: 0 };

      const meta = metaRes.rows[0];
      const effectiveSchoolId = schoolId || meta.school_id;
      const formattedDate = meta.exam_date ? new Date(meta.exam_date).toLocaleDateString() : 'TBD';

      const title = `Exam Schedule Updated: ${meta.exam_title}`;
      const body = `The schedule or timetable for ${meta.exam_title} (${meta.subject_name || 'Subject'}) in ${meta.grade_name || 'Grade'} has been updated. New scheduled date: ${formattedDate}. Please review your updated exam schedule.`;

      const notif = await this.notificationRepo.create({
        schoolId: effectiveSchoolId,
        gradeId: meta.grade_id,
        sectionId: null,
        audience: 'ALL',
        type: 'EXAM',
        priority: 'URGENT',
        title,
        body,
        actionUrl: '/dashboard/exams',
        actionLabel: 'View Timetable',
        channel: 'IN_APP',
        metadata: {
          examId: meta.exam_id,
          gradeId: meta.grade_id,
          subjectId: meta.subject_id,
          examDate: meta.exam_date,
        },
        publishedAt: new Date(),
        createdBy: recordedBy,
      });

      console.log(`[NotificationTriggerService] Dispatched Exam Schedule Updated alert for ${meta.exam_title}.`);
      return { dispatchedCount: 1, notification: notif };
    } catch (error) {
      console.error('[NotificationTriggerService] Failed to dispatch exam schedule changed alert:', error);
      return { dispatchedCount: 0, error: error.message };
    }
  }

  /**
   * Safe asynchronous dispatcher when an assignment is created or officially published.
   *
   * @param {Object} params
   * @param {string} [params.schoolId] - School ID
   * @param {Object} params.assignment - Assignment entity
   * @param {string} params.recordedBy - User ID
   */
  async triggerAssignmentCreatedAlert({ schoolId, assignment, recordedBy }) {
    if (!assignment || !assignment.id) return { dispatchedCount: 0 };

    try {
      const metaQuery = `
        SELECT 
          a.id AS assignment_id,
          a.title AS assignment_title,
          a.description,
          a.max_marks,
          a.due_date,
          a.status,
          a.school_id,
          a.grade_id,
          a.section_id,
          g.name AS grade_name,
          sec.name AS section_name,
          sub.id AS subject_id,
          sub.subject_name
        FROM assignments a
        LEFT JOIN grades g ON g.id = a.grade_id
        LEFT JOIN sections sec ON sec.id = a.section_id
        LEFT JOIN subjects sub ON sub.id = a.subject_id
        WHERE a.id = $1
      `;

      const metaRes = await this.database.query(metaQuery, [assignment.id]);
      if (metaRes.rows.length === 0) return { dispatchedCount: 0 };

      const meta = metaRes.rows[0];
      const effectiveSchoolId = schoolId || meta.school_id;
      const formattedDueDate = meta.due_date ? new Date(meta.due_date).toLocaleDateString() : 'TBD';

      const title = `New Assignment: ${meta.assignment_title}`;
      const body = `A new assignment has been posted for ${meta.subject_name || 'Subject'}${meta.section_name ? ` in Section ${meta.section_name}` : ''}. Due date: ${formattedDueDate}. Total marks: ${meta.max_marks || 100}.`;

      const notif = await this.notificationRepo.create({
        schoolId: effectiveSchoolId,
        gradeId: meta.grade_id,
        sectionId: meta.section_id,
        audience: 'ALL',
        type: 'ACADEMIC',
        priority: 'NORMAL',
        title,
        body,
        actionUrl: '/dashboard/assignments',
        actionLabel: 'View Assignment',
        channel: 'IN_APP',
        metadata: {
          assignmentId: meta.assignment_id,
          gradeId: meta.grade_id,
          sectionId: meta.section_id,
          subjectId: meta.subject_id,
          dueDate: meta.due_date,
          maxMarks: meta.max_marks,
        },
        publishedAt: new Date(),
        createdBy: recordedBy,
      });

      console.log(`[NotificationTriggerService] Dispatched Assignment Created alert for ${meta.assignment_title}.`);
      return { dispatchedCount: 1, notification: notif };
    } catch (error) {
      console.error('[NotificationTriggerService] Failed to dispatch assignment created alert:', error);
      return { dispatchedCount: 0, error: error.message };
    }
  }

  /**
   * Safe asynchronous dispatcher when an assignment submission is graded or feedback released.
   *
   * @param {Object} params
   * @param {string} [params.schoolId] - School ID
   * @param {string} params.submissionId - Submission ID
   * @param {string} params.recordedBy - User ID
   */
  async triggerAssignmentGradedAlert({ schoolId, submissionId, recordedBy }) {
    if (!submissionId) return { dispatchedCount: 0 };

    try {
      const metaQuery = `
        SELECT 
          sub.id AS submission_id,
          sub.assignment_id,
          sub.student_id,
          sub.obtained_marks,
          sub.feedback,
          sub.school_id,
          a.title AS assignment_title,
          a.max_marks,
          a.section_id,
          a.grade_id,
          a.subject_id,
          s.first_name,
          s.last_name,
          s.user_id AS student_user_id,
          p.id AS parent_id,
          p.user_id AS parent_user_id,
          p.phone AS parent_phone,
          subj.subject_name
        FROM assignment_submissions sub
        JOIN assignments a ON a.id = sub.assignment_id
        JOIN students s ON s.id = sub.student_id
        LEFT JOIN parents p ON p.id = s.parent_id AND p.deleted_at IS NULL
        LEFT JOIN subjects subj ON subj.id = a.subject_id
        WHERE sub.id = $1
      `;

      const metaRes = await this.database.query(metaQuery, [submissionId]);
      if (metaRes.rows.length === 0) return { dispatchedCount: 0 };

      const subMeta = metaRes.rows[0];
      const effectiveSchoolId = schoolId || subMeta.school_id;
      const studentName = `${subMeta.first_name} ${subMeta.last_name}`.trim();
      const dispatched = [];

      const basePayload = {
        schoolId: effectiveSchoolId,
        gradeId: subMeta.grade_id,
        sectionId: subMeta.section_id,
        type: 'ACADEMIC',
        priority: 'HIGH',
        title: `Assignment Graded: ${subMeta.assignment_title}`,
        body: `${studentName}'s submission for "${subMeta.assignment_title}" (${subMeta.subject_name || 'Subject'}) has been graded. Score: ${subMeta.obtained_marks}/${subMeta.max_marks}.${subMeta.feedback ? ` Feedback: ${subMeta.feedback}` : ''}`,
        actionUrl: '/dashboard/assignments',
        actionLabel: 'View Graded Submission',
        channel: 'IN_APP_AND_SMS',
        metadata: {
          submissionId: subMeta.submission_id,
          assignmentId: subMeta.assignment_id,
          studentId: subMeta.student_id,
          studentName,
          obtainedMarks: subMeta.obtained_marks,
          maxMarks: subMeta.max_marks,
          parentPhone: subMeta.parent_phone,
        },
        publishedAt: new Date(),
        createdBy: recordedBy,
      };

      // Deliver directly to student user account if linked
      if (subMeta.student_user_id) {
        const studentNotif = await this.notificationRepo.create({
          ...basePayload,
          audience: 'STUDENTS',
          title: `Assignment Graded: ${subMeta.assignment_title}`,
          body: `Your submission for "${subMeta.assignment_title}" (${subMeta.subject_name || 'Subject'}) has been graded: ${subMeta.obtained_marks}/${subMeta.max_marks}.${subMeta.feedback ? ` Feedback: ${subMeta.feedback}` : ''}`,
          recipientUserId: subMeta.student_user_id,
        });
        dispatched.push(studentNotif);
      }

      // Deliver directly to parent user account if linked
      if (subMeta.parent_user_id) {
        const parentNotif = await this.notificationRepo.create({
          ...basePayload,
          audience: 'PARENTS',
          recipientUserId: subMeta.parent_user_id,
        });
        dispatched.push(parentNotif);
      }

      // If neither has a linked web account yet, create institutional notification with studentId in metadata
      if (!subMeta.student_user_id && !subMeta.parent_user_id) {
        const scopedNotif = await this.notificationRepo.create({
          ...basePayload,
          audience: 'PARENTS',
          recipientUserId: null,
        });
        dispatched.push(scopedNotif);
      }

      console.log(`[NotificationTriggerService] Dispatched Assignment Graded alert for ${studentName} (${subMeta.assignment_title}).`);
      return { dispatchedCount: dispatched.length, alerts: dispatched };
    } catch (error) {
      console.error('[NotificationTriggerService] Failed to dispatch assignment graded alert:', error);
      return { dispatchedCount: 0, error: error.message };
    }
  }

  /**
   * Safe asynchronous dispatcher when a fee invoice is issued.
   * Triggered when custom invoice is created or generated in batch.
   *
   * @param {Object} params
   * @param {string} [params.schoolId] - School ID
   * @param {string} [params.invoiceId] - Invoice ID
   * @param {string} [params.studentId] - Student ID
   * @param {number|string} [params.amount] - Amount
   * @param {string} [params.currency] - Currency (default 'ETB')
   * @param {string} [params.invoiceNumber] - Invoice number
   * @param {string} [params.dueDate] - Due date
   * @param {string} [params.title] - Invoice title
   * @param {string} params.recordedBy - User ID
   */
  async triggerFeeInvoiceIssuedAlert({ schoolId, invoiceId, studentId, amount, currency = 'ETB', invoiceNumber, dueDate, title, recordedBy }) {
    try {
      let invMeta = null;

      if (invoiceId) {
        const invQuery = `
          SELECT 
            inv.id AS invoice_id,
            inv.invoice_number,
            inv.title,
            inv.total_amount,
            inv.balance_amount,
            inv.due_date,
            inv.school_id,
            inv.student_id,
            s.first_name,
            s.last_name,
            s.user_id AS student_user_id,
            p.id AS parent_id,
            p.user_id AS parent_user_id,
            p.phone AS parent_phone
          FROM student_fee_invoices inv
          JOIN students s ON s.id = inv.student_id
          LEFT JOIN parents p ON p.id = s.parent_id AND p.deleted_at IS NULL
          WHERE inv.id = $1
        `;
        const res = await this.database.query(invQuery, [invoiceId]);
        if (res.rows.length > 0) invMeta = res.rows[0];
      }

      if (!invMeta && studentId) {
        const sQuery = `
          SELECT 
            s.id AS student_id,
            s.first_name,
            s.last_name,
            s.school_id,
            s.user_id AS student_user_id,
            p.id AS parent_id,
            p.user_id AS parent_user_id,
            p.phone AS parent_phone
          FROM students s
          LEFT JOIN parents p ON p.id = s.parent_id AND p.deleted_at IS NULL
          WHERE s.id = $1 AND s.deleted_at IS NULL
        `;
        const sRes = await this.database.query(sQuery, [studentId]);
        if (sRes.rows.length > 0) {
          const s = sRes.rows[0];
          invMeta = {
            invoice_id: invoiceId || null,
            invoice_number: invoiceNumber || 'New Invoice',
            title: title || 'Tuition Fee',
            total_amount: amount,
            balance_amount: amount,
            due_date: dueDate,
            school_id: schoolId || s.school_id,
            student_id: s.student_id,
            first_name: s.first_name,
            last_name: s.last_name,
            student_user_id: s.student_user_id,
            parent_id: s.parent_id,
            parent_user_id: s.parent_user_id,
            parent_phone: s.parent_phone,
          };
        }
      }

      if (!invMeta) return { dispatchedCount: 0 };

      const studentName = `${invMeta.first_name} ${invMeta.last_name}`.trim();
      const effectiveSchoolId = schoolId || invMeta.school_id;
      const formattedDueDate = invMeta.due_date ? new Date(invMeta.due_date).toLocaleDateString() : 'the scheduled date';
      const dispatched = [];

      const basePayload = {
        schoolId: effectiveSchoolId,
        type: 'FINANCE',
        priority: 'HIGH',
        title: `Fee Invoice Issued: ${invMeta.invoice_number}`,
        body: `An invoice of ${Number(invMeta.total_amount).toLocaleString()} ${currency} for ${studentName} (${invMeta.title || 'Tuition Fee'}) has been issued. Payment is due on ${formattedDueDate}.`,
        actionUrl: '/dashboard/fees',
        actionLabel: 'View Fee Statement',
        channel: 'IN_APP_AND_SMS',
        metadata: {
          studentId: invMeta.student_id,
          studentName,
          invoiceId: invMeta.invoice_id,
          invoiceNumber: invMeta.invoice_number,
          amount: invMeta.total_amount,
          balance: invMeta.balance_amount,
          dueDate: invMeta.due_date,
          parentPhone: invMeta.parent_phone,
        },
        publishedAt: new Date(),
        createdBy: recordedBy,
      };

      // Deliver directly to parent user account if linked
      if (invMeta.parent_user_id) {
        const parentNotif = await this.notificationRepo.create({
          ...basePayload,
          audience: 'PARENTS',
          recipientUserId: invMeta.parent_user_id,
        });
        dispatched.push(parentNotif);
      }

      // Deliver directly to student user account if linked
      if (invMeta.student_user_id) {
        const studentNotif = await this.notificationRepo.create({
          ...basePayload,
          audience: 'STUDENTS',
          recipientUserId: invMeta.student_user_id,
        });
        dispatched.push(studentNotif);
      }

      // If neither has a linked web account yet, create institutional notification with studentId in metadata
      if (!invMeta.parent_user_id && !invMeta.student_user_id) {
        const scopedNotif = await this.notificationRepo.create({
          ...basePayload,
          audience: 'PARENTS',
          recipientUserId: null,
        });
        dispatched.push(scopedNotif);
      }

      console.log(`[NotificationTriggerService] Dispatched ${dispatched.length} Fee Invoice alert(s) for ${studentName} (${invMeta.invoice_number}).`);
      return { dispatchedCount: dispatched.length, alerts: dispatched };
    } catch (error) {
      console.error('[NotificationTriggerService] Failed to dispatch fee invoice alert:', error);
      return { dispatchedCount: 0, error: error.message };
    }
  }

  // Alias for backward compatibility
  async triggerFeeInvoiceAlerts(params) {
    return this.triggerFeeInvoiceIssuedAlert(params);
  }

  /**
   * Safe asynchronous dispatcher when an invoice payment is due soon.
   *
   * @param {Object} params
   * @param {string} [params.schoolId] - School ID
   * @param {string} params.invoiceId - Invoice ID
   * @param {number} [params.daysRemaining] - Days remaining until due date
   * @param {string} [params.currency] - Currency (default 'ETB')
   * @param {string} params.recordedBy - User ID
   */
  async triggerPaymentDueSoonAlert({ schoolId, invoiceId, daysRemaining, currency = 'ETB', recordedBy }) {
    if (!invoiceId) return { dispatchedCount: 0 };

    try {
      const invQuery = `
        SELECT 
          inv.id AS invoice_id,
          inv.invoice_number,
          inv.title,
          inv.total_amount,
          inv.balance_amount,
          inv.due_date,
          inv.school_id,
          inv.student_id,
          s.first_name,
          s.last_name,
          s.user_id AS student_user_id,
          p.id AS parent_id,
          p.user_id AS parent_user_id,
          p.phone AS parent_phone
        FROM student_fee_invoices inv
        JOIN students s ON s.id = inv.student_id
        LEFT JOIN parents p ON p.id = s.parent_id AND p.deleted_at IS NULL
        WHERE inv.id = $1 AND inv.deleted_at IS NULL
      `;
      const res = await this.database.query(invQuery, [invoiceId]);
      if (res.rows.length === 0) return { dispatchedCount: 0 };

      const invMeta = res.rows[0];
      const studentName = `${invMeta.first_name} ${invMeta.last_name}`.trim();
      const effectiveSchoolId = schoolId || invMeta.school_id;
      const formattedDueDate = invMeta.due_date ? new Date(invMeta.due_date).toLocaleDateString() : 'soon';
      const dispatched = [];

      const basePayload = {
        schoolId: effectiveSchoolId,
        type: 'FINANCE',
        priority: 'HIGH',
        title: `Payment Reminder: ${invMeta.invoice_number} Due Soon`,
        body: `Payment reminder: Fee invoice ${invMeta.invoice_number} for ${studentName} with outstanding balance of ${Number(invMeta.balance_amount).toLocaleString()} ${currency} is due ${daysRemaining ? `in ${daysRemaining} day(s)` : 'soon'} (${formattedDueDate}). Please settle promptly.`,
        actionUrl: '/dashboard/fees',
        actionLabel: 'Pay Now',
        channel: 'IN_APP_AND_SMS',
        metadata: {
          studentId: invMeta.student_id,
          studentName,
          invoiceId: invMeta.invoice_id,
          invoiceNumber: invMeta.invoice_number,
          amount: invMeta.balance_amount,
          dueDate: invMeta.due_date,
          parentPhone: invMeta.parent_phone,
        },
        publishedAt: new Date(),
        createdBy: recordedBy,
      };

      if (invMeta.parent_user_id) {
        const parentNotif = await this.notificationRepo.create({
          ...basePayload,
          audience: 'PARENTS',
          recipientUserId: invMeta.parent_user_id,
        });
        dispatched.push(parentNotif);
      }

      if (invMeta.student_user_id) {
        const studentNotif = await this.notificationRepo.create({
          ...basePayload,
          audience: 'STUDENTS',
          recipientUserId: invMeta.student_user_id,
        });
        dispatched.push(studentNotif);
      }

      if (!invMeta.parent_user_id && !invMeta.student_user_id) {
        const scopedNotif = await this.notificationRepo.create({
          ...basePayload,
          audience: 'PARENTS',
          recipientUserId: null,
        });
        dispatched.push(scopedNotif);
      }

      console.log(`[NotificationTriggerService] Dispatched Payment Due Soon alert for ${studentName} (${invMeta.invoice_number}).`);
      return { dispatchedCount: dispatched.length, alerts: dispatched };
    } catch (error) {
      console.error('[NotificationTriggerService] Failed to dispatch payment due soon alert:', error);
      return { dispatchedCount: 0, error: error.message };
    }
  }

  /**
   * Safe asynchronous dispatcher when an invoice payment is overdue.
   *
   * @param {Object} params
   * @param {string} [params.schoolId] - School ID
   * @param {string} params.invoiceId - Invoice ID
   * @param {string} [params.currency] - Currency (default 'ETB')
   * @param {string} params.recordedBy - User ID
   */
  async triggerPaymentOverdueAlert({ schoolId, invoiceId, currency = 'ETB', recordedBy }) {
    if (!invoiceId) return { dispatchedCount: 0 };

    try {
      const invQuery = `
        SELECT 
          inv.id AS invoice_id,
          inv.invoice_number,
          inv.title,
          inv.total_amount,
          inv.balance_amount,
          inv.due_date,
          inv.school_id,
          inv.student_id,
          s.first_name,
          s.last_name,
          s.user_id AS student_user_id,
          p.id AS parent_id,
          p.user_id AS parent_user_id,
          p.phone AS parent_phone
        FROM student_fee_invoices inv
        JOIN students s ON s.id = inv.student_id
        LEFT JOIN parents p ON p.id = s.parent_id AND p.deleted_at IS NULL
        WHERE inv.id = $1 AND inv.deleted_at IS NULL
      `;
      const res = await this.database.query(invQuery, [invoiceId]);
      if (res.rows.length === 0) return { dispatchedCount: 0 };

      const invMeta = res.rows[0];
      const studentName = `${invMeta.first_name} ${invMeta.last_name}`.trim();
      const effectiveSchoolId = schoolId || invMeta.school_id;
      const formattedDueDate = invMeta.due_date ? new Date(invMeta.due_date).toLocaleDateString() : 'the scheduled date';
      const dispatched = [];

      const basePayload = {
        schoolId: effectiveSchoolId,
        type: 'FINANCE',
        priority: 'URGENT',
        title: `Payment Overdue: Invoice ${invMeta.invoice_number}`,
        body: `Urgent Notice: Fee invoice ${invMeta.invoice_number} for ${studentName} (${Number(invMeta.balance_amount).toLocaleString()} ${currency}) is now overdue (was due on ${formattedDueDate}). Please settle the outstanding balance immediately.`,
        actionUrl: '/dashboard/fees',
        actionLabel: 'View Fee Statement',
        channel: 'IN_APP_AND_SMS',
        metadata: {
          studentId: invMeta.student_id,
          studentName,
          invoiceId: invMeta.invoice_id,
          invoiceNumber: invMeta.invoice_number,
          amount: invMeta.balance_amount,
          dueDate: invMeta.due_date,
          isOverdue: true,
          parentPhone: invMeta.parent_phone,
        },
        publishedAt: new Date(),
        createdBy: recordedBy,
      };

      if (invMeta.parent_user_id) {
        const parentNotif = await this.notificationRepo.create({
          ...basePayload,
          audience: 'PARENTS',
          recipientUserId: invMeta.parent_user_id,
        });
        dispatched.push(parentNotif);
      }

      if (invMeta.student_user_id) {
        const studentNotif = await this.notificationRepo.create({
          ...basePayload,
          audience: 'STUDENTS',
          recipientUserId: invMeta.student_user_id,
        });
        dispatched.push(studentNotif);
      }

      if (!invMeta.parent_user_id && !invMeta.student_user_id) {
        const scopedNotif = await this.notificationRepo.create({
          ...basePayload,
          audience: 'PARENTS',
          recipientUserId: null,
        });
        dispatched.push(scopedNotif);
      }

      console.log(`[NotificationTriggerService] Dispatched Payment Overdue alert for ${studentName} (${invMeta.invoice_number}).`);
      return { dispatchedCount: dispatched.length, alerts: dispatched };
    } catch (error) {
      console.error('[NotificationTriggerService] Failed to dispatch payment overdue alert:', error);
      return { dispatchedCount: 0, error: error.message };
    }
  }

  /**
   * Safe asynchronous dispatcher when payment is confirmed and receipt generated.
   *
   * @param {Object} params
   * @param {string} [params.schoolId] - School ID
   * @param {string} params.paymentId - Payment ID
   * @param {string} [params.currency] - Currency (default 'ETB')
   * @param {string} params.recordedBy - User ID
   */
  async triggerPaymentConfirmedAlert({ schoolId, paymentId, currency = 'ETB', recordedBy }) {
    if (!paymentId) return { dispatchedCount: 0 };

    try {
      const payQuery = `
        SELECT 
          pay.id AS payment_id,
          pay.receipt_number,
          pay.amount,
          pay.payment_method,
          pay.payment_date,
          pay.school_id,
          pay.invoice_id,
          pay.student_id,
          inv.invoice_number,
          inv.balance_amount,
          inv.total_amount,
          s.first_name,
          s.last_name,
          s.user_id AS student_user_id,
          p.id AS parent_id,
          p.user_id AS parent_user_id,
          p.phone AS parent_phone
        FROM fee_payments pay
        JOIN student_fee_invoices inv ON inv.id = pay.invoice_id
        JOIN students s ON s.id = pay.student_id
        LEFT JOIN parents p ON p.id = s.parent_id AND p.deleted_at IS NULL
        WHERE pay.id = $1
      `;
      const res = await this.database.query(payQuery, [paymentId]);
      if (res.rows.length === 0) return { dispatchedCount: 0 };

      const payMeta = res.rows[0];
      const studentName = `${payMeta.first_name} ${payMeta.last_name}`.trim();
      const effectiveSchoolId = schoolId || payMeta.school_id;
      const dispatched = [];

      const basePayload = {
        schoolId: effectiveSchoolId,
        type: 'FINANCE',
        priority: 'HIGH',
        title: `Payment Confirmed: Receipt ${payMeta.receipt_number}`,
        body: `Payment of ${Number(payMeta.amount).toLocaleString()} ${currency} for ${studentName} has been confirmed. Official Receipt ${payMeta.receipt_number} generated. Remaining balance: ${Number(payMeta.balance_amount).toLocaleString()} ${currency}.`,
        actionUrl: '/dashboard/fees',
        actionLabel: 'View Receipt',
        channel: 'IN_APP_AND_SMS',
        metadata: {
          studentId: payMeta.student_id,
          studentName,
          paymentId: payMeta.payment_id,
          receiptNumber: payMeta.receipt_number,
          invoiceId: payMeta.invoice_id,
          invoiceNumber: payMeta.invoice_number,
          amountPaid: payMeta.amount,
          remainingBalance: payMeta.balance_amount,
          parentPhone: payMeta.parent_phone,
        },
        publishedAt: new Date(),
        createdBy: recordedBy,
      };

      if (payMeta.parent_user_id) {
        const parentNotif = await this.notificationRepo.create({
          ...basePayload,
          audience: 'PARENTS',
          recipientUserId: payMeta.parent_user_id,
        });
        dispatched.push(parentNotif);
      }

      if (payMeta.student_user_id) {
        const studentNotif = await this.notificationRepo.create({
          ...basePayload,
          audience: 'STUDENTS',
          recipientUserId: payMeta.student_user_id,
        });
        dispatched.push(studentNotif);
      }

      if (!payMeta.parent_user_id && !payMeta.student_user_id) {
        const scopedNotif = await this.notificationRepo.create({
          ...basePayload,
          audience: 'PARENTS',
          recipientUserId: null,
        });
        dispatched.push(scopedNotif);
      }

      console.log(`[NotificationTriggerService] Dispatched Payment Confirmed alert for ${studentName} (Receipt: ${payMeta.receipt_number}).`);
      return { dispatchedCount: dispatched.length, alerts: dispatched };
    } catch (error) {
      console.error('[NotificationTriggerService] Failed to dispatch payment confirmed alert:', error);
      return { dispatchedCount: 0, error: error.message };
    }
  }

  /**
   * Safe asynchronous dispatcher when a bank slip or payment is rejected.
   *
   * @param {Object} params
   * @param {string} [params.schoolId] - School ID
   * @param {string} params.submissionId - Bank slip submission ID
   * @param {string} [params.rejectionReason] - Reason for rejection
   * @param {string} [params.currency] - Currency (default 'ETB')
   * @param {string} params.recordedBy - User ID
   */
  async triggerPaymentRejectedAlert({ schoolId, submissionId, rejectionReason, currency = 'ETB', recordedBy }) {
    if (!submissionId) return { dispatchedCount: 0 };

    try {
      const slipQuery = `
        SELECT 
          slip.id AS submission_id,
          slip.reference_number,
          slip.amount,
          slip.status,
          slip.rejection_reason,
          slip.school_id,
          slip.student_id,
          slip.invoice_id,
          inv.invoice_number,
          s.first_name,
          s.last_name,
          s.user_id AS student_user_id,
          p.id AS parent_id,
          p.user_id AS parent_user_id,
          p.phone AS parent_phone
        FROM bank_slip_submissions slip
        LEFT JOIN student_fee_invoices inv ON inv.id = slip.invoice_id
        JOIN students s ON s.id = slip.student_id
        LEFT JOIN parents p ON p.id = s.parent_id AND p.deleted_at IS NULL
        WHERE slip.id = $1
      `;
      const res = await this.database.query(slipQuery, [submissionId]);
      if (res.rows.length === 0) return { dispatchedCount: 0 };

      const slipMeta = res.rows[0];
      const studentName = `${slipMeta.first_name} ${slipMeta.last_name}`.trim();
      const effectiveSchoolId = schoolId || slipMeta.school_id;
      const effectiveReason = rejectionReason || slipMeta.rejection_reason || 'Verification rejected by finance office';
      const dispatched = [];

      const basePayload = {
        schoolId: effectiveSchoolId,
        type: 'FINANCE',
        priority: 'URGENT',
        title: `Payment Rejected: ${slipMeta.reference_number || 'Bank Slip'}`,
        body: `Your bank deposit slip for ${studentName} (${Number(slipMeta.amount).toLocaleString()} ${currency}) was rejected. Reason: ${effectiveReason}. Please check your fee statement and resubmit valid payment proof.`,
        actionUrl: '/dashboard/fees',
        actionLabel: 'View Fee Statement',
        channel: 'IN_APP_AND_SMS',
        metadata: {
          studentId: slipMeta.student_id,
          studentName,
          submissionId: slipMeta.submission_id,
          invoiceId: slipMeta.invoice_id,
          amount: slipMeta.amount,
          rejectionReason: effectiveReason,
          parentPhone: slipMeta.parent_phone,
        },
        publishedAt: new Date(),
        createdBy: recordedBy,
      };

      if (slipMeta.parent_user_id) {
        const parentNotif = await this.notificationRepo.create({
          ...basePayload,
          audience: 'PARENTS',
          recipientUserId: slipMeta.parent_user_id,
        });
        dispatched.push(parentNotif);
      }

      if (slipMeta.student_user_id) {
        const studentNotif = await this.notificationRepo.create({
          ...basePayload,
          audience: 'STUDENTS',
          recipientUserId: slipMeta.student_user_id,
        });
        dispatched.push(studentNotif);
      }

      if (!slipMeta.parent_user_id && !slipMeta.student_user_id) {
        const scopedNotif = await this.notificationRepo.create({
          ...basePayload,
          audience: 'PARENTS',
          recipientUserId: null,
        });
        dispatched.push(scopedNotif);
      }

      console.log(`[NotificationTriggerService] Dispatched Payment Rejected alert for ${studentName}.`);
      return { dispatchedCount: dispatched.length, alerts: dispatched };
    } catch (error) {
      console.error('[NotificationTriggerService] Failed to dispatch payment rejected alert:', error);
      return { dispatchedCount: 0, error: error.message };
    }
  }

  /**
   * Safe asynchronous dispatcher when an invoice is cancelled or reversed.
   *
   * @param {Object} params
   * @param {string} [params.schoolId] - School ID
   * @param {string} params.invoiceId - Invoice ID
   * @param {string} [params.reason] - Reason for cancellation
   * @param {string} [params.currency] - Currency (default 'ETB')
   * @param {string} params.recordedBy - User ID
   */
  async triggerInvoiceCancelledAlert({ schoolId, invoiceId, reason, currency = 'ETB', recordedBy }) {
    if (!invoiceId) return { dispatchedCount: 0 };

    try {
      const invQuery = `
        SELECT 
          inv.id AS invoice_id,
          inv.invoice_number,
          inv.total_amount,
          inv.school_id,
          inv.student_id,
          s.first_name,
          s.last_name,
          s.user_id AS student_user_id,
          p.id AS parent_id,
          p.user_id AS parent_user_id,
          p.phone AS parent_phone
        FROM student_fee_invoices inv
        JOIN students s ON s.id = inv.student_id
        LEFT JOIN parents p ON p.id = s.parent_id AND p.deleted_at IS NULL
        WHERE inv.id = $1
      `;
      const res = await this.database.query(invQuery, [invoiceId]);
      if (res.rows.length === 0) return { dispatchedCount: 0 };

      const invMeta = res.rows[0];
      const studentName = `${invMeta.first_name} ${invMeta.last_name}`.trim();
      const effectiveSchoolId = schoolId || invMeta.school_id;
      const effectiveReason = reason || 'Administrative adjustment';
      const dispatched = [];

      const basePayload = {
        schoolId: effectiveSchoolId,
        type: 'FINANCE',
        priority: 'NORMAL',
        title: `Fee Adjustment: Invoice ${invMeta.invoice_number} Cancelled`,
        body: `Fee invoice ${invMeta.invoice_number} for ${studentName} (${Number(invMeta.total_amount).toLocaleString()} ${currency}) has been cancelled. Reason: ${effectiveReason}.`,
        actionUrl: '/dashboard/fees',
        actionLabel: 'View Fee Statement',
        channel: 'IN_APP',
        metadata: {
          studentId: invMeta.student_id,
          studentName,
          invoiceId: invMeta.invoice_id,
          invoiceNumber: invMeta.invoice_number,
          reason: effectiveReason,
          parentPhone: invMeta.parent_phone,
        },
        publishedAt: new Date(),
        createdBy: recordedBy,
      };

      if (invMeta.parent_user_id) {
        const parentNotif = await this.notificationRepo.create({
          ...basePayload,
          audience: 'PARENTS',
          recipientUserId: invMeta.parent_user_id,
        });
        dispatched.push(parentNotif);
      }

      if (invMeta.student_user_id) {
        const studentNotif = await this.notificationRepo.create({
          ...basePayload,
          audience: 'STUDENTS',
          recipientUserId: invMeta.student_user_id,
        });
        dispatched.push(studentNotif);
      }

      if (!invMeta.parent_user_id && !invMeta.student_user_id) {
        const scopedNotif = await this.notificationRepo.create({
          ...basePayload,
          audience: 'PARENTS',
          recipientUserId: null,
        });
        dispatched.push(scopedNotif);
      }

      console.log(`[NotificationTriggerService] Dispatched Invoice Cancelled alert for ${studentName} (${invMeta.invoice_number}).`);
      return { dispatchedCount: dispatched.length, alerts: dispatched };
    } catch (error) {
      console.error('[NotificationTriggerService] Failed to dispatch invoice cancelled alert:', error);
      return { dispatchedCount: 0, error: error.message };
    }
  }

  /**
   * Scans and dispatches reminders for invoices due within the given timeframe.
   */
  async dispatchDueSoonFeeReminders({ schoolId, days = 3, recordedBy }) {
    try {
      const query = `
        SELECT id, due_date
        FROM student_fee_invoices
        WHERE (school_id = $1 OR $1::uuid IS NULL)
          AND status IN ('UNPAID', 'PARTIALLY_PAID')
          AND due_date IS NOT NULL
          AND due_date >= CURRENT_DATE
          AND due_date <= (CURRENT_DATE + ($2 || ' days')::interval)
          AND deleted_at IS NULL
      `;
      const res = await this.database.query(query, [schoolId || null, days]);
      let count = 0;
      for (const row of res.rows) {
        const diffTime = Math.ceil((new Date(row.due_date) - new Date()) / (1000 * 60 * 60 * 24));
        const remRes = await this.triggerPaymentDueSoonAlert({
          schoolId,
          invoiceId: row.id,
          daysRemaining: Math.max(1, diffTime),
          recordedBy,
        });
        count += remRes.dispatchedCount || 0;
      }
      return { dispatchedCount: count, invoicesProcessed: res.rows.length };
    } catch (err) {
      console.error('[NotificationTriggerService] dispatchDueSoonFeeReminders error:', err);
      return { dispatchedCount: 0, error: err.message };
    }
  }

  /**
   * Scans and dispatches reminders for overdue invoices.
   */
  async dispatchOverdueFeeReminders({ schoolId, recordedBy }) {
    try {
      const query = `
        SELECT id
        FROM student_fee_invoices
        WHERE (school_id = $1 OR $1::uuid IS NULL)
          AND status IN ('UNPAID', 'PARTIALLY_PAID', 'OVERDUE')
          AND due_date IS NOT NULL
          AND due_date < CURRENT_DATE
          AND deleted_at IS NULL
      `;
      const res = await this.database.query(query, [schoolId || null]);
      let count = 0;
      for (const row of res.rows) {
        const remRes = await this.triggerPaymentOverdueAlert({
          schoolId,
          invoiceId: row.id,
          recordedBy,
        });
        count += remRes.dispatchedCount || 0;
      }
      return { dispatchedCount: count, invoicesProcessed: res.rows.length };
    } catch (err) {
      console.error('[NotificationTriggerService] dispatchOverdueFeeReminders error:', err);
      return { dispatchedCount: 0, error: err.message };
    }
  }

  /**
   * Safe asynchronous dispatcher when a fee payment refund is processed or reversed.
   *
   * @param {Object} params
   * @param {string} [params.schoolId] - School ID
   * @param {string} params.paymentId - Payment ID
   * @param {number|string} [params.refundAmount] - Refund amount
   * @param {string} [params.reason] - Refund reason
   * @param {string} [params.currency] - Currency (default 'ETB')
   * @param {string} params.recordedBy - User ID
   */
  async triggerRefundProcessedAlert({ schoolId, paymentId, refundAmount, reason, currency = 'ETB', recordedBy }) {
    if (!paymentId) return { dispatchedCount: 0 };

    try {
      const payQuery = `
        SELECT 
          pay.id AS payment_id,
          pay.receipt_number,
          pay.amount,
          pay.payment_method,
          pay.school_id,
          pay.invoice_id,
          pay.student_id,
          inv.invoice_number,
          inv.balance_amount,
          inv.total_amount,
          s.first_name,
          s.last_name,
          s.user_id AS student_user_id,
          p.id AS parent_id,
          p.user_id AS parent_user_id,
          p.phone AS parent_phone
        FROM fee_payments pay
        JOIN student_fee_invoices inv ON inv.id = pay.invoice_id
        JOIN students s ON s.id = pay.student_id
        LEFT JOIN parents p ON p.id = s.parent_id AND p.deleted_at IS NULL
        WHERE pay.id = $1
      `;
      const res = await this.database.query(payQuery, [paymentId]);
      if (res.rows.length === 0) return { dispatchedCount: 0 };

      const payMeta = res.rows[0];
      const studentName = `${payMeta.first_name} ${payMeta.last_name}`.trim();
      const effectiveSchoolId = schoolId || payMeta.school_id;
      const effectiveAmount = refundAmount || payMeta.amount;
      const effectiveReason = reason || 'Administrative fee refund / payment reversal';
      const dispatched = [];

      const basePayload = {
        schoolId: effectiveSchoolId,
        type: 'FINANCE',
        priority: 'HIGH',
        title: `Refund Processed: Receipt ${payMeta.receipt_number}`,
        body: `A refund/reversal of ${Number(effectiveAmount).toLocaleString()} ${currency} for ${studentName} (Receipt ${payMeta.receipt_number}, Invoice ${payMeta.invoice_number}) has been processed. Reason: ${effectiveReason}. Current invoice balance: ${Number(payMeta.balance_amount).toLocaleString()} ${currency}.`,
        actionUrl: '/dashboard/fees',
        actionLabel: 'View Fee Statement',
        channel: 'IN_APP_AND_SMS',
        metadata: {
          studentId: payMeta.student_id,
          studentName,
          paymentId: payMeta.payment_id,
          receiptNumber: payMeta.receipt_number,
          invoiceId: payMeta.invoice_id,
          invoiceNumber: payMeta.invoice_number,
          refundAmount: effectiveAmount,
          remainingBalance: payMeta.balance_amount,
          reason: effectiveReason,
          parentPhone: payMeta.parent_phone,
        },
        publishedAt: new Date(),
        createdBy: recordedBy,
      };

      if (payMeta.parent_user_id) {
        const parentNotif = await this.notificationRepo.create({
          ...basePayload,
          audience: 'PARENTS',
          recipientUserId: payMeta.parent_user_id,
        });
        dispatched.push(parentNotif);
      }

      if (payMeta.student_user_id) {
        const studentNotif = await this.notificationRepo.create({
          ...basePayload,
          audience: 'STUDENTS',
          recipientUserId: payMeta.student_user_id,
        });
        dispatched.push(studentNotif);
      }

      if (!payMeta.parent_user_id && !payMeta.student_user_id) {
        const scopedNotif = await this.notificationRepo.create({
          ...basePayload,
          audience: 'PARENTS',
          recipientUserId: null,
        });
        dispatched.push(scopedNotif);
      }

      console.log(`[NotificationTriggerService] Dispatched Refund/Reversal alert for ${studentName} (Receipt: ${payMeta.receipt_number}).`);
      return { dispatchedCount: dispatched.length, alerts: dispatched };
    } catch (error) {
      console.error('[NotificationTriggerService] Failed to dispatch refund processed alert:', error);
      return { dispatchedCount: 0, error: error.message };
    }
  }

  // Alias for Payment Reversed
  async triggerPaymentReversedAlert(params) {
    return this.triggerRefundProcessedAlert(params);
  }
}

module.exports = new NotificationTriggerService();
