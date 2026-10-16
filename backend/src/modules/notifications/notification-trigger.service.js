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
