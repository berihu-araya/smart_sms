const { db } = require('../../config/database');

async function seedAnnouncements() {
  try {
    const schoolRes = await db.query('SELECT id FROM schools LIMIT 1');
    if (schoolRes.rows.length === 0) {
      console.log('No schools found. Skipping seed.');
      return;
    }
    const schoolId = schoolRes.rows[0].id;

    const userRes = await db.query(
      `SELECT u.id FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE (LOWER(r.name) = 'school admin' OR LOWER(r.name) = 'admin') AND u.deleted_at IS NULL
       LIMIT 1`
    );
    const authorId = userRes.rows[0]?.id || null;

    const sampleNotices = [
      {
        title: 'End of Term 1 Examination Timetable & Protocol',
        content: 'The official examination schedules for Grades 7 through 12 have been published. All candidates are expected to be present at least 30 minutes prior to exam commencement with authorized stationery. Electronic devices are strictly prohibited in the examination halls.',
        category: 'EXAMINATION',
        priority: 'URGENT',
        audience: 'ALL',
        attachment_url: 'https://smart-sms.edu.et/docs/term1-exam-schedule.pdf',
        attachment_name: 'Term1_Exam_Schedule_2026.pdf',
        is_pinned: true,
        requires_acknowledgement: true,
        status: 'PUBLISHED',
      },
      {
        title: 'Annual Cultural Festival & Science Innovation Day',
        content: 'We are thrilled to invite students, parents, and faculty to our Annual Cultural Day & Science Fair on Friday, November 28th. Student project presentations will be hosted across all laboratories from 9:00 AM to 3:30 PM.',
        category: 'EVENT',
        priority: 'IMPORTANT',
        audience: 'ALL',
        attachment_url: null,
        attachment_name: null,
        is_pinned: true,
        requires_acknowledgement: false,
        status: 'PUBLISHED',
      },
      {
        title: 'Public Holiday Observance: School Closed Next Monday',
        content: 'Please be advised that the school and administrative offices will be closed on Monday in observance of the National Holiday. Regular academic and transport services will resume on Tuesday.',
        category: 'HOLIDAY',
        priority: 'NORMAL',
        audience: 'ALL',
        attachment_url: null,
        attachment_name: null,
        is_pinned: false,
        requires_acknowledgement: false,
        status: 'PUBLISHED',
      },
      {
        title: 'Grade 9 & 10 Parent-Teacher Academic Progress Conference',
        content: 'Dear Parents, the mid-term Parent-Teacher conference for Grades 9 and 10 will take place this Saturday. Individual time slots with subject teachers and class coordinators can be reserved at the academic office.',
        category: 'ACADEMIC',
        priority: 'IMPORTANT',
        audience: 'PARENTS',
        attachment_url: 'https://smart-sms.edu.et/docs/pta-schedule.pdf',
        attachment_name: 'PTA_Conference_Slots.pdf',
        is_pinned: false,
        requires_acknowledgement: true,
        status: 'PUBLISHED',
      },
    ];

    for (const notice of sampleNotices) {
      await db.query(
        `INSERT INTO announcements (
          school_id, title, content, category, priority, audience,
          attachment_url, attachment_name, is_pinned, requires_acknowledgement,
          status, published_at, created_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, $12
        )`,
        [
          schoolId,
          notice.title,
          notice.content,
          notice.category,
          notice.priority,
          notice.audience,
          notice.attachment_url,
          notice.attachment_name,
          notice.is_pinned,
          notice.requires_acknowledgement,
          notice.status,
          authorId,
        ]
      );
    }

    console.log('✅ Successfully seeded 4 realistic announcements!');
  } catch (err) {
    console.error('Seeding error:', err);
  } finally {
    await db.end();
  }
}

seedAnnouncements();
