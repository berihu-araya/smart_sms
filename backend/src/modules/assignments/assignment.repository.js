class AssignmentRepository {
  constructor(database) {
    this.database = database;
  }

  async findTeacherIdByUserId(userId) {
    const res = await this.database.query(
      `SELECT t.id FROM teachers t WHERE t.user_id = $1 AND t.deleted_at IS NULL LIMIT 1`,
      [userId]
    );
    return res.rows[0]?.id || null;
  }

  async findStudentIdByUserId(userId) {
    const res = await this.database.query(
      `SELECT s.id, s.section_id, sec.grade_id FROM students s
       LEFT JOIN sections sec ON sec.id = s.section_id
       WHERE s.user_id = $1 AND s.deleted_at IS NULL LIMIT 1`,
      [userId]
    );
    return res.rows[0] || null;
  }

  async findChildStudentIdsByParentUserId(parentUserId) {
    const res = await this.database.query(
      `
      SELECT s.id, s.first_name, s.last_name, s.admission_number, s.section_id, sec.grade_id
      FROM students s
      JOIN student_parents sp ON sp.student_id = s.id
      JOIN parents p ON p.id = sp.parent_id
      LEFT JOIN sections sec ON sec.id = s.section_id
      WHERE p.user_id = $1
        AND s.deleted_at IS NULL
        AND p.deleted_at IS NULL
        AND sp.deleted_at IS NULL
      `,
      [parentUserId]
    );
    return res.rows;
  }

  async findAll({
    search = '',
    academicYearId = null,
    gradeId = null,
    sectionId = null,
    subjectId = null,
    teacherId = null,
    status = null,
    studentId = null,
    childStudentIds = null,
    schoolId = null,
    limit = 50,
    offset = 0,
  } = {}) {
    const params = [];
    let index = 1;
    let whereClause = `WHERE a.deleted_at IS NULL`;

    if (schoolId) {
      whereClause += ` AND (a.school_id = $${index} OR a.school_id IS NULL)`;
      params.push(schoolId);
      index++;
    }

    if (search && search.trim()) {
      whereClause += ` AND (
        LOWER(a.title) LIKE LOWER($${index}) OR 
        LOWER(COALESCE(a.description, '')) LIKE LOWER($${index}) OR
        LOWER(sub.subject_name) LIKE LOWER($${index})
      )`;
      params.push(`%${search.trim()}%`);
      index++;
    }

    if (academicYearId) {
      whereClause += ` AND a.academic_year_id = $${index}`;
      params.push(academicYearId);
      index++;
    }

    if (gradeId) {
      whereClause += ` AND a.grade_id = $${index}`;
      params.push(gradeId);
      index++;
    }

    if (sectionId) {
      whereClause += ` AND (a.section_id = $${index} OR a.section_id IS NULL)`;
      params.push(sectionId);
      index++;
    }

    if (subjectId) {
      whereClause += ` AND a.subject_id = $${index}`;
      params.push(subjectId);
      index++;
    }

    if (teacherId) {
      whereClause += ` AND (a.teacher_id = $${index} OR EXISTS (
        SELECT 1 FROM teacher_subjects ts
        WHERE ts.teacher_id = $${index}
          AND ts.deleted_at IS NULL
          AND ts.grade_id = a.grade_id
          AND ts.subject_id = a.subject_id
      ))`;
      params.push(teacherId);
      index++;
    }

    if (status) {
      whereClause += ` AND a.status = $${index}`;
      params.push(status.toUpperCase());
      index++;
    }

    // Scoping for student: only assignments for student's grade & section
    if (studentId) {
      whereClause += ` AND (
        a.grade_id = (SELECT s_g.grade_id FROM students s_stud LEFT JOIN sections s_g ON s_g.id = s_stud.section_id WHERE s_stud.id = $${index})
        AND (a.section_id IS NULL OR a.section_id = (SELECT s_stud.section_id FROM students s_stud WHERE s_stud.id = $${index}))
      )`;
      params.push(studentId);
      index++;
    } else if (Array.isArray(childStudentIds) && childStudentIds.length > 0) {
      whereClause += ` AND (
        a.grade_id IN (SELECT s_g.grade_id FROM students s_stud LEFT JOIN sections s_g ON s_g.id = s_stud.section_id WHERE s_stud.id = ANY($${index}::uuid[]))
        AND (a.section_id IS NULL OR a.section_id IN (SELECT s_stud.section_id FROM students s_stud WHERE s_stud.id = ANY($${index}::uuid[])))
      )`;
      params.push(childStudentIds);
      index++;
    }

    params.push(limit, offset);

    const query = `
      SELECT
        a.id,
        a.school_id,
        a.academic_year_id,
        a.grade_id,
        a.section_id,
        a.subject_id,
        a.teacher_id,
        a.created_by,
        a.title,
        a.description,
        a.attachment_urls,
        a.max_marks,
        a.pass_marks,
        a.assigned_date,
        a.due_date,
        a.allow_late_submissions,
        a.submission_type,
        a.status,
        a.created_at,
        a.updated_at,
        g.name AS grade_name,
        sec.name AS section_name,
        sub.subject_name,
        sub.subject_code,
        ay.name AS academic_year_name,
        t.first_name AS teacher_first_name,
        t.last_name AS teacher_last_name,
        t.email AS teacher_email,
        -- Submission metrics
        (
          SELECT COUNT(*)
          FROM assignment_submissions sub_m
          WHERE sub_m.assignment_id = a.id AND sub_m.deleted_at IS NULL
        ) AS submissions_count,
        (
          SELECT COUNT(*)
          FROM assignment_submissions sub_m
          WHERE sub_m.assignment_id = a.id AND sub_m.status = 'GRADED' AND sub_m.deleted_at IS NULL
        ) AS graded_count,
        (
          SELECT COUNT(*)
          FROM students stud
          LEFT JOIN sections st_sec ON st_sec.id = stud.section_id
          WHERE stud.deleted_at IS NULL
            AND (
              (a.section_id IS NOT NULL AND stud.section_id = a.section_id)
              OR (a.section_id IS NULL AND st_sec.grade_id = a.grade_id)
            )
        ) AS total_enrolled_students
        ${
          studentId
            ? `, (
                SELECT json_build_object(
                  'id', my_sub.id,
                  'status', my_sub.status,
                  'submitted_at', my_sub.submitted_at,
                  'obtained_marks', my_sub.obtained_marks,
                  'feedback', my_sub.feedback,
                  'attachment_urls', my_sub.attachment_urls
                )
                FROM assignment_submissions my_sub
                WHERE my_sub.assignment_id = a.id 
                  AND my_sub.student_id = '${studentId}'
                  AND my_sub.deleted_at IS NULL
                LIMIT 1
              ) AS my_submission`
            : ''
        }
      FROM assignments a
      LEFT JOIN grades g ON g.id = a.grade_id
      LEFT JOIN sections sec ON sec.id = a.section_id
      LEFT JOIN subjects sub ON sub.id = a.subject_id
      LEFT JOIN academic_years ay ON ay.id = a.academic_year_id
      LEFT JOIN teachers t ON t.id = a.teacher_id
      ${whereClause}
      ORDER BY a.due_date DESC, a.created_at DESC
      LIMIT $${index} OFFSET $${index + 1}
    `;

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM assignments a
      LEFT JOIN subjects sub ON sub.id = a.subject_id
      ${whereClause}
    `;

    const [itemsRes, countRes] = await Promise.all([
      this.database.query(query, params),
      this.database.query(countQuery, params.slice(0, index - 1)),
    ]);

    return {
      items: itemsRes.rows,
      total: parseInt(countRes.rows[0]?.total || '0', 10),
      limit,
      offset,
    };
  }

  async findById(id, studentId = null) {
    const result = await this.database.query(
      `
      SELECT
        a.*,
        g.name AS grade_name,
        sec.name AS section_name,
        sub.subject_name,
        sub.subject_code,
        ay.name AS academic_year_name,
        t.first_name AS teacher_first_name,
        t.last_name AS teacher_last_name,
        t.email AS teacher_email,
        (
          SELECT COUNT(*)
          FROM assignment_submissions sub_m
          WHERE sub_m.assignment_id = a.id AND sub_m.deleted_at IS NULL
        ) AS submissions_count,
        (
          SELECT COUNT(*)
          FROM assignment_submissions sub_m
          WHERE sub_m.assignment_id = a.id AND sub_m.status = 'GRADED' AND sub_m.deleted_at IS NULL
        ) AS graded_count,
        (
          SELECT COUNT(*)
          FROM assignment_submissions sub_m
          WHERE sub_m.assignment_id = a.id AND sub_m.status = 'LATE' AND sub_m.deleted_at IS NULL
        ) AS late_submissions_count,
        (
          SELECT COUNT(*)
          FROM students stud
          LEFT JOIN sections st_sec ON st_sec.id = stud.section_id
          WHERE stud.deleted_at IS NULL
            AND (
              (a.section_id IS NOT NULL AND stud.section_id = a.section_id)
              OR (a.section_id IS NULL AND st_sec.grade_id = a.grade_id)
            )
        ) AS total_enrolled_students
        ${
          studentId
            ? `, (
                SELECT json_build_object(
                  'id', my_sub.id,
                  'status', my_sub.status,
                  'submission_text', my_sub.submission_text,
                  'submitted_at', my_sub.submitted_at,
                  'obtained_marks', my_sub.obtained_marks,
                  'feedback', my_sub.feedback,
                  'attachment_urls', my_sub.attachment_urls
                )
                FROM assignment_submissions my_sub
                WHERE my_sub.assignment_id = a.id 
                  AND my_sub.student_id = $2
                  AND my_sub.deleted_at IS NULL
                LIMIT 1
              ) AS my_submission`
            : ''
        }
      FROM assignments a
      LEFT JOIN grades g ON g.id = a.grade_id
      LEFT JOIN sections sec ON sec.id = a.section_id
      LEFT JOIN subjects sub ON sub.id = a.subject_id
      LEFT JOIN academic_years ay ON ay.id = a.academic_year_id
      LEFT JOIN teachers t ON t.id = a.teacher_id
      WHERE a.id = $1
        AND a.deleted_at IS NULL
      LIMIT 1
      `,
      studentId ? [id, studentId] : [id]
    );

    return result.rows[0] || null;
  }

  async create(payload) {
    const result = await this.database.query(
      `
      INSERT INTO assignments (
        school_id,
        academic_year_id,
        grade_id,
        section_id,
        subject_id,
        teacher_id,
        created_by,
        title,
        description,
        attachment_urls,
        max_marks,
        pass_marks,
        assigned_date,
        due_date,
        allow_late_submissions,
        submission_type,
        status,
        created_at,
        updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
        COALESCE($13, CURRENT_DATE), $14, $15, $16, $17,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      RETURNING *
      `,
      [
        payload.schoolId || null,
        payload.academicYearId || null,
        payload.gradeId,
        payload.sectionId || null,
        payload.subjectId,
        payload.teacherId || null,
        payload.createdBy || null,
        payload.title,
        payload.description || null,
        JSON.stringify(payload.attachmentUrls || []),
        payload.maxMarks,
        payload.passMarks,
        payload.assignedDate || null,
        payload.dueDate,
        payload.allowLateSubmissions !== false,
        payload.submissionType || 'ONLINE_TEXT_AND_FILE',
        payload.status || 'PUBLISHED',
      ]
    );

    return this.findById(result.rows[0].id);
  }

  async update(id, payload) {
    const fields = [];
    const values = [];
    let index = 1;

    const columnMap = {
      title: 'title',
      description: 'description',
      gradeId: 'grade_id',
      sectionId: 'section_id',
      subjectId: 'subject_id',
      academicYearId: 'academic_year_id',
      teacherId: 'teacher_id',
      dueDate: 'due_date',
      maxMarks: 'max_marks',
      passMarks: 'pass_marks',
      allowLateSubmissions: 'allow_late_submissions',
      submissionType: 'submission_type',
      status: 'status',
    };

    Object.entries(payload).forEach(([key, val]) => {
      if (val !== undefined && columnMap[key]) {
        fields.push(`${columnMap[key]} = $${index}`);
        values.push(val);
        index++;
      }
    });

    if (payload.attachmentUrls !== undefined) {
      fields.push(`attachment_urls = $${index}`);
      values.push(JSON.stringify(payload.attachmentUrls));
      index++;
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    await this.database.query(
      `
      UPDATE assignments
      SET ${fields.join(', ')}
      WHERE id = $${index}
        AND deleted_at IS NULL
      RETURNING *
      `,
      values
    );

    return this.findById(id);
  }

  async softDelete(id) {
    const result = await this.database.query(
      `
      UPDATE assignments
      SET deleted_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
        AND deleted_at IS NULL
      RETURNING *
      `,
      [id]
    );

    return result.rows[0] || null;
  }

  async toggleStatus(id, status) {
    const result = await this.database.query(
      `
      UPDATE assignments
      SET status = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
        AND deleted_at IS NULL
      RETURNING *
      `,
      [status.toUpperCase(), id]
    );

    return result.rows[0] || null;
  }

  // --- SUBMISSIONS & ROSTER QUERIES ---

  async findSubmissionsByAssignment(assignmentId, { sectionId = null, status = null, search = '' } = {}) {
    const params = [assignmentId];
    let index = 2;
    let extraFilter = '';

    if (sectionId) {
      extraFilter += ` AND stud.section_id = $${index}`;
      params.push(sectionId);
      index++;
    }

    if (status) {
      if (status.toUpperCase() === 'NOT_SUBMITTED') {
        extraFilter += ` AND sub_m.id IS NULL`;
      } else {
        extraFilter += ` AND sub_m.status = $${index}`;
        params.push(status.toUpperCase());
        index++;
      }
    }

    if (search && search.trim()) {
      extraFilter += ` AND (
        LOWER(stud.first_name) LIKE LOWER($${index}) OR
        LOWER(stud.last_name) LIKE LOWER($${index}) OR
        LOWER(stud.admission_number) LIKE LOWER($${index})
      )`;
      params.push(`%${search.trim()}%`);
      index++;
    }

    const query = `
      SELECT
        stud.id AS student_id,
        stud.first_name,
        stud.last_name,
        stud.admission_number,
        stud.gender,
        sec.id AS section_id,
        sec.name AS section_name,
        g.name AS grade_name,
        sub_m.id AS submission_id,
        sub_m.submission_text,
        sub_m.attachment_urls,
        sub_m.submitted_at,
        COALESCE(sub_m.status, 'NOT_SUBMITTED') AS submission_status,
        sub_m.obtained_marks,
        sub_m.feedback,
        sub_m.graded_at,
        sub_m.resubmission_count,
        t_grad.first_name AS grader_first_name,
        t_grad.last_name AS grader_last_name
      FROM assignments a
      JOIN grades g ON g.id = a.grade_id
      JOIN sections sec ON (a.section_id IS NOT NULL AND sec.id = a.section_id) OR (a.section_id IS NULL AND sec.grade_id = a.grade_id)
      JOIN students stud ON stud.section_id = sec.id AND stud.deleted_at IS NULL
      LEFT JOIN assignment_submissions sub_m ON sub_m.assignment_id = a.id AND sub_m.student_id = stud.id AND sub_m.deleted_at IS NULL
      LEFT JOIN teachers t_grad ON t_grad.id = sub_m.graded_by
      WHERE a.id = $1
        AND a.deleted_at IS NULL
        ${extraFilter}
      ORDER BY stud.first_name ASC, stud.last_name ASC
    `;

    const result = await this.database.query(query, params);
    return result.rows;
  }

  async findSubmissionById(submissionId) {
    const result = await this.database.query(
      `
      SELECT
        sub_m.*,
        stud.first_name,
        stud.last_name,
        stud.admission_number,
        a.title AS assignment_title,
        a.max_marks,
        a.pass_marks,
        a.due_date,
        sub.subject_name
      FROM assignment_submissions sub_m
      JOIN students stud ON stud.id = sub_m.student_id
      JOIN assignments a ON a.id = sub_m.assignment_id
      JOIN subjects sub ON sub.id = a.subject_id
      WHERE sub_m.id = $1
        AND sub_m.deleted_at IS NULL
      LIMIT 1
      `,
      [submissionId]
    );

    return result.rows[0] || null;
  }

  async findStudentSubmission(assignmentId, studentId) {
    const result = await this.database.query(
      `
      SELECT sub_m.*
      FROM assignment_submissions sub_m
      WHERE sub_m.assignment_id = $1
        AND sub_m.student_id = $2
        AND sub_m.deleted_at IS NULL
      LIMIT 1
      `,
      [assignmentId, studentId]
    );

    return result.rows[0] || null;
  }

  async upsertSubmission({
    assignmentId,
    studentId,
    schoolId = null,
    submissionText = null,
    attachmentUrls = [],
    status = 'SUBMITTED',
  }) {
    const existing = await this.findStudentSubmission(assignmentId, studentId);

    if (existing) {
      const isResubmission = existing.status === 'RESUBMIT_REQUESTED';
      const result = await this.database.query(
        `
        UPDATE assignment_submissions
        SET submission_text = $1,
            attachment_urls = $2,
            submitted_at = CURRENT_TIMESTAMP,
            status = $3,
            resubmission_count = resubmission_count + $4,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
        RETURNING *
        `,
        [
          submissionText,
          JSON.stringify(attachmentUrls),
          status,
          isResubmission ? 1 : 0,
          existing.id,
        ]
      );
      return result.rows[0];
    }

    const result = await this.database.query(
      `
      INSERT INTO assignment_submissions (
        school_id,
        assignment_id,
        student_id,
        submission_text,
        attachment_urls,
        submitted_at,
        status,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
      `,
      [
        schoolId,
        assignmentId,
        studentId,
        submissionText,
        JSON.stringify(attachmentUrls),
        status,
      ]
    );

    return result.rows[0];
  }

  async gradeSubmission(submissionId, { obtainedMarks, feedback = null, status = 'GRADED', gradedBy = null }) {
    const result = await this.database.query(
      `
      UPDATE assignment_submissions
      SET obtained_marks = $1,
          feedback = $2,
          status = $3,
          graded_by = $4,
          graded_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
        AND deleted_at IS NULL
      RETURNING *
      `,
      [obtainedMarks, feedback, status, gradedBy, submissionId]
    );

    return this.findSubmissionById(submissionId);
  }

  // --- STATS / KPIS ---

  async getStats({ schoolId = null, teacherId = null, studentId = null } = {}) {
    let whereClause = `WHERE a.deleted_at IS NULL`;
    const params = [];
    let index = 1;

    if (schoolId) {
      whereClause += ` AND (a.school_id = $${index} OR a.school_id IS NULL)`;
      params.push(schoolId);
      index++;
    }

    if (teacherId) {
      whereClause += ` AND a.teacher_id = $${index}`;
      params.push(teacherId);
      index++;
    }

    if (studentId) {
      whereClause += ` AND (
        a.grade_id = (SELECT s_g.grade_id FROM students s_stud LEFT JOIN sections s_g ON s_g.id = s_stud.section_id WHERE s_stud.id = $${index})
        AND (a.section_id IS NULL OR a.section_id = (SELECT s_stud.section_id FROM students s_stud WHERE s_stud.id = $${index}))
      )`;
      params.push(studentId);
      index++;
    }

    const query = `
      SELECT
        COUNT(a.id) AS total_assignments,
        COUNT(CASE WHEN a.status = 'PUBLISHED' AND a.due_date >= CURRENT_TIMESTAMP THEN 1 END) AS active_assignments,
        COUNT(CASE WHEN a.status = 'PUBLISHED' AND a.due_date < CURRENT_TIMESTAMP THEN 1 END) AS past_due_assignments,
        COUNT(CASE WHEN a.status = 'DRAFT' THEN 1 END) AS draft_assignments,
        (
          SELECT COUNT(*)
          FROM assignment_submissions sub_m
          JOIN assignments a2 ON a2.id = sub_m.assignment_id
          WHERE sub_m.deleted_at IS NULL 
            AND a2.deleted_at IS NULL
            ${teacherId ? `AND a2.teacher_id = '${teacherId}'` : ''}
            ${schoolId ? `AND (a2.school_id = '${schoolId}' OR a2.school_id IS NULL)` : ''}
        ) AS total_submissions,
        (
          SELECT COUNT(*)
          FROM assignment_submissions sub_m
          JOIN assignments a2 ON a2.id = sub_m.assignment_id
          WHERE sub_m.deleted_at IS NULL 
            AND sub_m.status IN ('SUBMITTED', 'LATE')
            AND a2.deleted_at IS NULL
            ${teacherId ? `AND a2.teacher_id = '${teacherId}'` : ''}
            ${schoolId ? `AND (a2.school_id = '${schoolId}' OR a2.school_id IS NULL)` : ''}
        ) AS pending_grading_count,
        (
          SELECT COUNT(*)
          FROM assignment_submissions sub_m
          JOIN assignments a2 ON a2.id = sub_m.assignment_id
          WHERE sub_m.deleted_at IS NULL 
            AND sub_m.status = 'GRADED'
            AND a2.deleted_at IS NULL
            ${teacherId ? `AND a2.teacher_id = '${teacherId}'` : ''}
            ${schoolId ? `AND (a2.school_id = '${schoolId}' OR a2.school_id IS NULL)` : ''}
        ) AS graded_submissions_count
      FROM assignments a
      ${whereClause}
    `;

    const res = await this.database.query(query, params);
    return res.rows[0] || {};
  }
}

module.exports = AssignmentRepository;
