/**
 * MessageRepository
 *
 * Direct relational persistence and query operations for the SMART SMS Messaging Module.
 */

class MessageRepository {
  constructor(database) {
    this.db = database;
  }

  /**
   * Retrieves active conversations for a user with aggregated participant info,
   * student context pills, unread count, and last message snippet.
   */
  async getUserConversations(schoolId, userId, options = {}) {
    const {
      status = 'ACTIVE', // 'ACTIVE', 'ARCHIVED', 'ALL'
      unreadOnly = false,
      search = null,
      type = null,
      studentId = null,
      page = 1,
      limit = 30,
    } = options;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 30));
    const offset = (pageNum - 1) * limitNum;

    const params = [schoolId, userId];
    const whereClauses = [
      'c.school_id = $1',
      'c.deleted_at IS NULL',
      'my_cp.user_id = $2',
    ];

    let pIndex = 3;

    // Archive / Status filter
    if (status === 'ARCHIVED') {
      whereClauses.push('my_cp.is_archived = true');
    } else if (status === 'ACTIVE') {
      whereClauses.push('my_cp.is_archived = false');
    }

    // Unread only
    if (unreadOnly === true || unreadOnly === 'true') {
      whereClauses.push('my_cp.unread_count > 0');
    }

    // Conversation type
    if (type && type !== 'ALL') {
      whereClauses.push(`c.type = $${pIndex++}`);
      params.push(type.toUpperCase());
    }

    // Student context filter
    if (studentId) {
      whereClauses.push(`c.student_id = $${pIndex++}`);
      params.push(studentId);
    }

    // Search query: filters by title, recipient name, or student name
    if (search && search.trim()) {
      const sTerm = `%${search.trim().toLowerCase()}%`;
      whereClauses.push(`(
        LOWER(COALESCE(c.title, '')) LIKE $${pIndex}
        OR LOWER(COALESCE(c.last_message_preview, '')) LIKE $${pIndex}
        OR EXISTS (
          SELECT 1 FROM conversation_participants cp_s
          JOIN users u_s ON u_s.id = cp_s.user_id
          WHERE cp_s.conversation_id = c.id AND cp_s.user_id != $2
            AND (LOWER(u_s.first_name || ' ' || u_s.last_name) LIKE $${pIndex} OR LOWER(u_s.email) LIKE $${pIndex})
        )
        OR EXISTS (
          SELECT 1 FROM students st_s
          WHERE st_s.id = c.student_id
            AND LOWER(st_s.first_name || ' ' || st_s.last_name) LIKE $${pIndex}
        )
      )`);
      params.push(sTerm);
      pIndex++;
    }

    const whereSql = whereClauses.join(' AND ');

    // Total Count
    const countSql = `
      SELECT COUNT(*)::int as total
      FROM conversations c
      JOIN conversation_participants my_cp ON my_cp.conversation_id = c.id
      WHERE ${whereSql}
    `;
    const countRes = await this.db.query(countSql, params);
    const total = countRes.rows[0]?.total || 0;

    // Query Data with other participants and student context lateral joins
    const dataSql = `
      SELECT 
        c.id,
        c.school_id,
        c.type,
        c.title,
        c.status,
        c.last_message_at,
        c.last_message_preview,
        c.created_at,
        c.updated_at,
        my_cp.unread_count,
        my_cp.is_muted,
        my_cp.is_archived,
        my_cp.is_starred,
        my_cp.last_read_at,
        -- Student Context
        json_build_object(
          'id', st.id,
          'first_name', st.first_name,
          'last_name', st.last_name,
          'admission_number', st.admission_number,
          'photo', st.photo,
          'grade_name', gr.name,
          'section_name', sec.name
        ) AS student_context,
        -- Subject Context
        json_build_object(
          'id', subj.id,
          'name', subj.subject_name,
          'code', subj.subject_code
        ) AS subject_context,
        -- Other Participants (array of other users in this conversation)
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', u.id,
                'first_name', u.first_name,
                'last_name', u.last_name,
                'email', u.email,
                'phone', u.phone,
                'profile_image', u.profile_image,
                'role', r.name,
                'role_in_conversation', cp.role_in_conversation,
                'last_read_at', cp.last_read_at
              )
            )
            FROM conversation_participants cp
            JOIN users u ON u.id = cp.user_id
            LEFT JOIN roles r ON r.id = u.role_id
            WHERE cp.conversation_id = c.id AND cp.user_id != $2
          ),
          '[]'::json
        ) AS other_participants
      FROM conversations c
      JOIN conversation_participants my_cp ON my_cp.conversation_id = c.id
      LEFT JOIN students st ON st.id = c.student_id AND st.deleted_at IS NULL
      LEFT JOIN sections sec ON sec.id = st.section_id
      LEFT JOIN grades gr ON gr.id = sec.grade_id
      LEFT JOIN subjects subj ON subj.id = c.subject_id
      WHERE ${whereSql}
      ORDER BY c.last_message_at DESC
      LIMIT $${pIndex} OFFSET $${pIndex + 1}
    `;

    params.push(limitNum, offset);
    const dataRes = await this.db.query(dataSql, params);

    return {
      items: dataRes.rows.map((row) => {
        // Clean null contexts
        if (!row.student_context?.id) row.student_context = null;
        if (!row.subject_context?.id) row.subject_context = null;
        return row;
      }),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * Finds an existing direct 1-to-1 conversation between two users with matching optional student context.
   */
  async findDirectConversation(schoolId, userOneId, userTwoId, studentId = null) {
    let sql = `
      SELECT c.id
      FROM conversations c
      JOIN conversation_participants cp1 ON cp1.conversation_id = c.id AND cp1.user_id = $1
      JOIN conversation_participants cp2 ON cp2.conversation_id = c.id AND cp2.user_id = $2
      WHERE c.school_id = $3
        AND c.type = 'DIRECT'
        AND c.deleted_at IS NULL
    `;
    const params = [userOneId, userTwoId, schoolId];

    if (studentId) {
      sql += ` AND c.student_id = $4 LIMIT 1`;
      params.push(studentId);
    } else {
      sql += ` AND c.student_id IS NULL LIMIT 1`;
    }

    const res = await this.db.query(sql, params);
    return res.rows[0]?.id || null;
  }

  /**
   * Retrieves single conversation details by ID, validating that the requesting user is a participant.
   */
  async getConversationById(conversationId, userId, schoolId, isSuperAdmin = false) {
    const sql = `
      SELECT 
        c.id,
        c.school_id,
        c.type,
        c.title,
        c.status,
        c.last_message_at,
        c.last_message_preview,
        c.created_by,
        c.created_at,
        c.updated_at,
        my_cp.unread_count,
        my_cp.is_muted,
        my_cp.is_archived,
        my_cp.is_starred,
        my_cp.last_read_at,
        -- Student Context
        json_build_object(
          'id', st.id,
          'first_name', st.first_name,
          'last_name', st.last_name,
          'admission_number', st.admission_number,
          'photo', st.photo,
          'grade_name', gr.name,
          'section_name', sec.name
        ) AS student_context,
        -- Subject Context
        json_build_object(
          'id', subj.id,
          'name', subj.subject_name,
          'code', subj.subject_code
        ) AS subject_context,
        -- All Participants
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', u.id,
                'first_name', u.first_name,
                'last_name', u.last_name,
                'email', u.email,
                'phone', u.phone,
                'profile_image', u.profile_image,
                'role', r.name,
                'role_in_conversation', cp.role_in_conversation,
                'unread_count', cp.unread_count,
                'last_read_at', cp.last_read_at,
                'joined_at', cp.joined_at
              )
            )
            FROM conversation_participants cp
            JOIN users u ON u.id = cp.user_id
            LEFT JOIN roles r ON r.id = u.role_id
            WHERE cp.conversation_id = c.id
          ),
          '[]'::json
        ) AS participants
      FROM conversations c
      LEFT JOIN conversation_participants my_cp ON my_cp.conversation_id = c.id AND my_cp.user_id = $2
      LEFT JOIN students st ON st.id = c.student_id AND st.deleted_at IS NULL
      LEFT JOIN sections sec ON sec.id = st.section_id
      LEFT JOIN grades gr ON gr.id = sec.grade_id
      LEFT JOIN subjects subj ON subj.id = c.subject_id
      WHERE c.id = $1
        AND c.school_id = $3
        AND c.deleted_at IS NULL
        AND (my_cp.user_id IS NOT NULL OR $4 = true)
    `;

    const res = await this.db.query(sql, [conversationId, userId, schoolId, isSuperAdmin]);
    const row = res.rows[0] || null;
    if (row) {
      if (!row.student_context?.id) row.student_context = null;
      if (!row.subject_context?.id) row.subject_context = null;
    }
    return row;
  }

  /**
   * Transactional creation of a conversation, its participants, and optional initial message.
   */
  async createConversationWithParticipants(client, data) {
    const {
      school_id,
      type = 'DIRECT',
      title = null,
      student_id = null,
      subject_id = null,
      created_by,
      participants = [], // Array of user_id strings
      initial_message = null,
      attachments = [],
    } = data;

    // 1. Insert conversation
    const convSql = `
      INSERT INTO conversations (
        school_id, type, title, student_id, subject_id, created_by,
        last_message_at, last_message_preview, status
      ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, $7, 'ACTIVE')
      RETURNING *
    `;
    const preview = initial_message ? initial_message.slice(0, 160) : 'Conversation started';
    const convRes = await client.query(convSql, [
      school_id,
      type,
      title,
      student_id,
      subject_id,
      created_by,
      preview,
    ]);
    const conversation = convRes.rows[0];

    // 2. Insert participants (deduplicate user IDs)
    const uniqueUserIds = Array.from(new Set([...participants, created_by]));
    for (const pUserId of uniqueUserIds) {
      const isCreator = pUserId === created_by;
      await client.query(
        `INSERT INTO conversation_participants (
          conversation_id, user_id, role_in_conversation, last_read_at, unread_count
        ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4)
        ON CONFLICT (conversation_id, user_id) DO NOTHING`,
        [conversation.id, pUserId, isCreator ? 'INITIATOR' : 'PARTICIPANT', isCreator ? 0 : (initial_message ? 1 : 0)]
      );
    }

    // 3. Insert initial message if provided
    let messageRecord = null;
    if (initial_message || attachments.length > 0) {
      const msgSql = `
        INSERT INTO messages (
          conversation_id, sender_id, message_type, content
        ) VALUES ($1, $2, $3, $4)
        RETURNING *
      `;
      const msgType = attachments.length > 0 && !initial_message ? 'ATTACHMENT' : 'TEXT';
      const msgRes = await client.query(msgSql, [
        conversation.id,
        created_by,
        msgType,
        initial_message || 'Sent an attachment',
      ]);
      messageRecord = msgRes.rows[0];

      // Insert attachments
      if (attachments.length > 0) {
        for (const att of attachments) {
          await client.query(
            `INSERT INTO message_attachments (
              message_id, file_name, file_url, file_type, file_size
            ) VALUES ($1, $2, $3, $4, $5)`,
            [messageRecord.id, att.file_name, att.file_url, att.file_type, att.file_size]
          );
        }
      }
    }

    return { conversation, message: messageRecord };
  }

  /**
   * Retrieves paginated chronological messages for a conversation.
   */
  async getConversationMessages(conversationId, options = {}) {
    const { page = 1, limit = 50, before = null } = options;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    const params = [conversationId];
    const whereClauses = [
      'm.conversation_id = $1',
      'm.deleted_at IS NULL',
    ];

    if (before) {
      params.push(before);
      whereClauses.push(`m.created_at < $${params.length}`);
    }

    const whereSql = whereClauses.join(' AND ');

    // Total count
    const countSql = `SELECT COUNT(*)::int as total FROM messages m WHERE ${whereSql}`;
    const countRes = await this.db.query(countSql, params);
    const total = countRes.rows[0]?.total || 0;

    // Messages Query
    const dataSql = `
      SELECT 
        m.id,
        m.conversation_id,
        m.sender_id,
        m.message_type,
        m.content,
        m.reply_to_message_id,
        m.is_edited,
        m.edited_at,
        m.created_at,
        -- Sender Info
        u.first_name AS sender_first_name,
        u.last_name AS sender_last_name,
        u.profile_image AS sender_profile_image,
        r.name AS sender_role,
        -- Quoted Reply Preview
        reply_m.content AS reply_content,
        reply_u.first_name AS reply_sender_first_name,
        -- Attachments
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', a.id,
                'file_name', a.file_name,
                'file_url', a.file_url,
                'file_type', a.file_type,
                'file_size', a.file_size
              )
            )
            FROM message_attachments a
            WHERE a.message_id = m.id
          ),
          '[]'::json
        ) AS attachments
      FROM messages m
      JOIN users u ON u.id = m.sender_id
      LEFT JOIN roles r ON r.id = u.role_id
      LEFT JOIN messages reply_m ON reply_m.id = m.reply_to_message_id
      LEFT JOIN users reply_u ON reply_u.id = reply_m.sender_id
      WHERE ${whereSql}
      ORDER BY m.created_at ASC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    params.push(limitNum, offset);
    const dataRes = await this.db.query(dataSql, params);

    return {
      messages: dataRes.rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * Creates a new message, updates conversation last message preview, and increments
   * unread counts for all other participants.
   */
  async createMessage(data) {
    const {
      conversation_id,
      sender_id,
      message_type = 'TEXT',
      content,
      reply_to_message_id = null,
      attachments = [],
    } = data;

    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      // 1. Insert message
      const msgSql = `
        INSERT INTO messages (
          conversation_id, sender_id, message_type, content, reply_to_message_id
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      const msgRes = await client.query(msgSql, [
        conversation_id,
        sender_id,
        message_type,
        content,
        reply_to_message_id,
      ]);
      const message = msgRes.rows[0];

      // 2. Insert attachments
      const insertedAttachments = [];
      if (attachments.length > 0) {
        for (const att of attachments) {
          const attRes = await client.query(
            `INSERT INTO message_attachments (
              message_id, file_name, file_url, file_type, file_size
            ) VALUES ($1, $2, $3, $4, $5)
            RETURNING *`,
            [message.id, att.file_name, att.file_url, att.file_type, att.file_size]
          );
          insertedAttachments.push(attRes.rows[0]);
        }
      }

      // 3. Update conversation last_message_at and preview
      const preview = content ? content.slice(0, 160) : 'Sent an attachment';
      await client.query(
        `UPDATE conversations
         SET last_message_at = CURRENT_TIMESTAMP,
             last_message_preview = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [preview, conversation_id]
      );

      // 4. Increment unread count for other participants & unarchive conversation
      await client.query(
        `UPDATE conversation_participants
         SET unread_count = unread_count + 1,
             is_archived = false
         WHERE conversation_id = $1 AND user_id != $2`,
        [conversation_id, sender_id]
      );

      // 5. Update sender's last_read_at
      await client.query(
        `UPDATE conversation_participants
         SET last_read_at = CURRENT_TIMESTAMP,
             unread_count = 0
         WHERE conversation_id = $1 AND user_id = $2`,
        [conversation_id, sender_id]
      );

      await client.query('COMMIT');

      // Fetch sender details to return full hydrated message
      const senderRes = await this.db.query(
        `SELECT u.first_name AS sender_first_name, u.last_name AS sender_last_name,
                u.profile_image AS sender_profile_image, r.name AS sender_role
         FROM users u
         LEFT JOIN roles r ON r.id = u.role_id
         WHERE u.id = $1`,
        [sender_id]
      );
      const senderInfo = senderRes.rows[0] || {};

      return {
        ...message,
        ...senderInfo,
        attachments: insertedAttachments,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Resets unread count for user in a conversation and updates last_read_at.
   */
  async markConversationAsRead(conversationId, userId) {
    const sql = `
      UPDATE conversation_participants
      SET unread_count = 0,
          last_read_at = CURRENT_TIMESTAMP
      WHERE conversation_id = $1 AND user_id = $2
      RETURNING *
    `;
    const res = await this.db.query(sql, [conversationId, userId]);
    return res.rows[0] || null;
  }

  /**
   * Updates user participant settings (is_archived, is_muted, is_starred).
   */
  async updateParticipantSettings(conversationId, userId, settings = {}) {
    const allowed = ['is_archived', 'is_muted', 'is_starred'];
    const sets = [];
    const params = [conversationId, userId];
    let idx = 3;

    for (const key of allowed) {
      if (typeof settings[key] === 'boolean') {
        sets.push(`${key} = $${idx++}`);
        params.push(settings[key]);
      }
    }

    if (sets.length === 0) return null;

    const sql = `
      UPDATE conversation_participants
      SET ${sets.join(', ')}
      WHERE conversation_id = $1 AND user_id = $2
      RETURNING *
    `;
    const res = await this.db.query(sql, params);
    return res.rows[0] || null;
  }

  /**
   * Soft deletes a message (author or school admin only).
   */
  async softDeleteMessage(messageId, userId, isAdmin = false) {
    let sql = `
      UPDATE messages
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND deleted_at IS NULL
    `;
    const params = [messageId];

    if (!isAdmin) {
      sql += ` AND sender_id = $2`;
      params.push(userId);
    }
    sql += ` RETURNING *`;

    const res = await this.db.query(sql, params);
    return res.rows[0] || null;
  }

  /**
   * Returns global total unread messages count across all active conversations.
   */
  async getUnreadCount(schoolId, userId) {
    const sql = `
      SELECT COALESCE(SUM(cp.unread_count), 0)::int as unread_count
      FROM conversation_participants cp
      JOIN conversations c ON c.id = cp.conversation_id
      WHERE cp.user_id = $1
        AND c.school_id = $2
        AND c.deleted_at IS NULL
        AND cp.is_archived = false
    `;
    const res = await this.db.query(sql, [userId, schoolId]);
    return res.rows[0]?.unread_count || 0;
  }

  /**
   * Retrieves directory of eligible recipients based on active school role linkages.
   */
  async getEligibleContacts(schoolId, user, options = {}) {
    const role = (user?.role || '').toLowerCase().trim();
    const isParent = role === 'parent';
    const isTeacher = role === 'teacher';
    const isStudent = role === 'student';
    const isAdmin = role.includes('admin') || role === 'staff';
    const userId = user?.sub || user?.id;

    if (isParent) {
      return this._getParentEligibleContacts(schoolId, userId, user.email, user.phone);
    } else if (isTeacher) {
      return this._getTeacherEligibleContacts(schoolId, userId);
    } else if (isStudent) {
      return this._getStudentEligibleContacts(schoolId, userId);
    } else if (isAdmin) {
      return this._getAdminEligibleContacts(schoolId, userId, options.search);
    }

    return { contacts: [] };
  }

  /**
   * Parent can message:
   * 1. Homeroom / Class Teachers of their active children.
   * 2. Subject Teachers of their active children.
   * 3. School Admins & Staff.
   */
  async _getParentEligibleContacts(schoolId, userId, email = '', phone = '') {
    const sql = `
      WITH my_children AS (
        SELECT 
          s.id AS student_id,
          s.first_name AS student_first_name,
          s.last_name AS student_last_name,
          s.section_id,
          sec.name AS section_name,
          sec.grade_id,
          gr.name AS grade_name
        FROM students s
        JOIN parents p ON p.id = s.parent_id
        JOIN sections sec ON sec.id = s.section_id
        JOIN grades gr ON gr.id = sec.grade_id
        WHERE (p.user_id = $2 OR (p.email IS NOT NULL AND LOWER(p.email) = LOWER($3)) OR (p.phone IS NOT NULL AND p.phone = $4))
          AND s.school_id = $1
          AND s.deleted_at IS NULL
          AND s.status = 'ACTIVE'
      ),
      -- Homeroom Teachers
      class_teachers_list AS (
        SELECT 
          u.id AS user_id,
          u.first_name,
          u.last_name,
          u.email,
          u.phone,
          u.profile_image,
          'Class Teacher' AS contact_role,
          mc.student_id,
          mc.student_first_name,
          mc.student_last_name,
          mc.grade_name,
          mc.section_name,
          NULL::uuid AS subject_id,
          'Homeroom' AS subject_name
        FROM my_children mc
        JOIN class_teachers ct ON ct.section_id = mc.section_id AND ct.status = 'ACTIVE' AND ct.deleted_at IS NULL
        JOIN teachers t ON t.id = ct.teacher_id AND t.deleted_at IS NULL
        JOIN users u ON u.id = t.user_id AND u.status = 'ACTIVE' AND u.deleted_at IS NULL
      ),
      -- Subject Teachers
      subject_teachers_list AS (
        SELECT 
          u.id AS user_id,
          u.first_name,
          u.last_name,
          u.email,
          u.phone,
          u.profile_image,
          'Subject Teacher' AS contact_role,
          mc.student_id,
          mc.student_first_name,
          mc.student_last_name,
          mc.grade_name,
          mc.section_name,
          subj.id AS subject_id,
          subj.subject_name AS subject_name
        FROM my_children mc
        JOIN teacher_subjects ts ON ts.section_id = mc.section_id AND ts.status = 'ACTIVE' AND ts.deleted_at IS NULL
        JOIN subjects subj ON subj.id = ts.subject_id
        JOIN teachers t ON t.id = ts.teacher_id AND t.deleted_at IS NULL
        JOIN users u ON u.id = t.user_id AND u.status = 'ACTIVE' AND u.deleted_at IS NULL
      ),
      -- School Admins & Staff
      admins_list AS (
        SELECT 
          u.id AS user_id,
          u.first_name,
          u.last_name,
          u.email,
          u.phone,
          u.profile_image,
          r.name AS contact_role,
          NULL::uuid AS student_id,
          NULL AS student_first_name,
          NULL AS student_last_name,
          NULL AS grade_name,
          NULL AS section_name,
          NULL::uuid AS subject_id,
          'School Administration' AS subject_name
        FROM users u
        JOIN roles r ON r.id = u.role_id
        WHERE u.school_id = $1
          AND r.name IN ('School Admin', 'Admin', 'Staff')
          AND u.status = 'ACTIVE'
          AND u.deleted_at IS NULL
      )
      SELECT * FROM class_teachers_list
      UNION ALL
      SELECT * FROM subject_teachers_list
      UNION ALL
      SELECT * FROM admins_list
      ORDER BY contact_role ASC, first_name ASC
    `;

    const res = await this.db.query(sql, [schoolId, userId, email, phone]);
    return { contacts: res.rows };
  }

  /**
   * Teacher can message:
   * 1. Parents of students in their assigned homerooms or subjects.
   * 2. School Admins, Staff, and fellow Teachers.
   */
  async _getTeacherEligibleContacts(schoolId, userId) {
    const sql = `
      WITH teacher_record AS (
        SELECT id FROM teachers WHERE user_id = $2 AND school_id = $1 AND deleted_at IS NULL LIMIT 1
      ),
      my_sections AS (
        SELECT ct.section_id, 'Homeroom' as source
        FROM class_teachers ct
        JOIN teacher_record tr ON tr.id = ct.teacher_id
        WHERE ct.status = 'ACTIVE' AND ct.deleted_at IS NULL
        UNION
        SELECT ts.section_id, 'Subject' as source
        FROM teacher_subjects ts
        JOIN teacher_record tr ON tr.id = ts.teacher_id
        WHERE ts.status = 'ACTIVE' AND ts.deleted_at IS NULL
      ),
      -- Parents of students in my sections
      student_parents_list AS (
        SELECT 
          u.id AS user_id,
          u.first_name,
          u.last_name,
          u.email,
          u.phone,
          u.profile_image,
          'Parent' AS contact_role,
          s.id AS student_id,
          s.first_name AS student_first_name,
          s.last_name AS student_last_name,
          gr.name AS grade_name,
          sec.name AS section_name,
          NULL::uuid AS subject_id,
          sec.name || ' Parent' AS subject_name
        FROM my_sections ms
        JOIN sections sec ON sec.id = ms.section_id
        JOIN grades gr ON gr.id = sec.grade_id
        JOIN students s ON s.section_id = sec.id AND s.status = 'ACTIVE' AND s.deleted_at IS NULL
        JOIN parents p ON p.id = s.parent_id AND p.deleted_at IS NULL
        JOIN users u ON u.id = p.user_id AND u.status = 'ACTIVE' AND u.deleted_at IS NULL
      ),
      -- Fellow Teachers & Admins
      colleagues_list AS (
        SELECT 
          u.id AS user_id,
          u.first_name,
          u.last_name,
          u.email,
          u.phone,
          u.profile_image,
          r.name AS contact_role,
          NULL::uuid AS student_id,
          NULL AS student_first_name,
          NULL AS student_last_name,
          NULL AS grade_name,
          NULL AS section_name,
          NULL::uuid AS subject_id,
          r.name AS subject_name
        FROM users u
        JOIN roles r ON r.id = u.role_id
        WHERE u.school_id = $1
          AND u.id != $2
          AND r.name IN ('School Admin', 'Admin', 'Teacher', 'Staff')
          AND u.status = 'ACTIVE'
          AND u.deleted_at IS NULL
      )
      SELECT * FROM student_parents_list
      UNION ALL
      SELECT * FROM colleagues_list
      ORDER BY contact_role ASC, first_name ASC
    `;

    const res = await this.db.query(sql, [schoolId, userId]);
    return { contacts: res.rows };
  }

  /**
   * Student can message their assigned homeroom teacher and subject teachers.
   */
  async _getStudentEligibleContacts(schoolId, userId) {
    const sql = `
      WITH student_record AS (
        SELECT id, section_id FROM students WHERE user_id = $2 AND school_id = $1 AND deleted_at IS NULL LIMIT 1
      )
      SELECT 
        u.id AS user_id,
        u.first_name,
        u.last_name,
        u.email,
        u.phone,
        u.profile_image,
        'Class Teacher' AS contact_role,
        sr.id AS student_id,
        NULL AS student_first_name,
        NULL AS student_last_name,
        NULL AS grade_name,
        NULL AS section_name,
        NULL::uuid AS subject_id,
        'Homeroom Teacher' AS subject_name
      FROM student_record sr
      JOIN class_teachers ct ON ct.section_id = sr.section_id AND ct.status = 'ACTIVE' AND ct.deleted_at IS NULL
      JOIN teachers t ON t.id = ct.teacher_id AND t.deleted_at IS NULL
      JOIN users u ON u.id = t.user_id AND u.status = 'ACTIVE'
      UNION ALL
      SELECT 
        u.id AS user_id,
        u.first_name,
        u.last_name,
        u.email,
        u.phone,
        u.profile_image,
        'Subject Teacher' AS contact_role,
        sr.id AS student_id,
        NULL AS student_first_name,
        NULL AS student_last_name,
        NULL AS grade_name,
        NULL AS section_name,
        subj.id AS subject_id,
        subj.subject_name AS subject_name
      FROM student_record sr
      JOIN teacher_subjects ts ON ts.section_id = sr.section_id AND ts.status = 'ACTIVE' AND ts.deleted_at IS NULL
      JOIN subjects subj ON subj.id = ts.subject_id
      JOIN teachers t ON t.id = ts.teacher_id AND t.deleted_at IS NULL
      JOIN users u ON u.id = t.user_id AND u.status = 'ACTIVE'
    `;

    const res = await this.db.query(sql, [schoolId, userId]);
    return { contacts: res.rows };
  }

  /**
   * Admin can message anyone in the school.
   */
  async _getAdminEligibleContacts(schoolId, userId, search = null) {
    let sql = `
      SELECT 
        u.id AS user_id,
        u.first_name,
        u.last_name,
        u.email,
        u.phone,
        u.profile_image,
        r.name AS contact_role,
        NULL::uuid AS student_id,
        NULL AS student_first_name,
        NULL AS student_last_name,
        NULL AS grade_name,
        NULL AS section_name,
        NULL::uuid AS subject_id,
        r.name AS subject_name
      FROM users u
      JOIN roles r ON r.id = u.role_id
      WHERE u.school_id = $1
        AND u.id != $2
        AND u.status = 'ACTIVE'
        AND u.deleted_at IS NULL
    `;
    const params = [schoolId, userId];

    if (search && search.trim()) {
      sql += ` AND (LOWER(u.first_name || ' ' || u.last_name) LIKE $3 OR LOWER(u.email) LIKE $3)`;
      params.push(`%${search.trim().toLowerCase()}%`);
    }

    sql += ` ORDER BY r.name ASC, u.first_name ASC LIMIT 100`;

    const res = await this.db.query(sql, params);
    return { contacts: res.rows };
  }
}

module.exports = MessageRepository;
