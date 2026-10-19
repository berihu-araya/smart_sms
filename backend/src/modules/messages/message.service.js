/**
 * MessageService
 *
 * Encapsulates domain business logic, RBAC boundary verification,
 * transaction coordination, and in-app notification dispatch for Messaging.
 */

const {
  validateCreateConversation,
  validateSendMessage,
  isValidUuid,
} = require('./message.validation');

class MessageService {
  constructor(messageRepository, db) {
    this.repository = messageRepository;
    this.db = db;
  }

  /**
   * Lists inbox conversations for the authenticated user.
   */
  async getUserConversations(schoolId, user, query = {}) {
    const userId = user?.sub || user?.id;
    return this.repository.getUserConversations(schoolId, userId, {
      status: query.status,
      unreadOnly: query.unreadOnly,
      search: query.search,
      type: query.type,
      studentId: query.studentId || query.student_id,
      page: query.page,
      limit: query.limit,
    });
  }

  /**
   * Starts a new conversation or retrieves existing direct thread.
   */
  async getOrCreateConversation(schoolId, user, body = {}) {
    const userId = user?.sub || user?.id;
    const validation = validateCreateConversation(body);
    if (!validation.isValid) {
      const err = new Error(validation.errors.join('; '));
      err.status = 400;
      throw err;
    }

    const { recipient_id, type, title, student_id, subject_id, initial_message, attachments } =
      validation.sanitized;

    if (recipient_id === userId) {
      const err = new Error('You cannot start a conversation with yourself');
      err.status = 400;
      throw err;
    }

    // Verify recipient user exists in the same school
    const recipientRes = await this.db.query(
      `SELECT id, first_name, last_name, email, status FROM users WHERE id = $1 AND school_id = $2 AND deleted_at IS NULL`,
      [recipient_id, schoolId]
    );
    const recipient = recipientRes.rows[0];
    if (!recipient) {
      const err = new Error('Recipient user not found or does not belong to your school');
      err.status = 404;
      throw err;
    }

    if (recipient.status !== 'ACTIVE') {
      const err = new Error('Recipient account is not active');
      err.status = 400;
      throw err;
    }

    // If direct conversation, check if thread already exists
    if (type === 'DIRECT') {
      const existingConvId = await this.repository.findDirectConversation(
        schoolId,
        userId,
        recipient_id,
        student_id
      );

      if (existingConvId) {
        // If an initial message was supplied, append it to the existing thread
        if (initial_message || attachments.length > 0) {
          await this.repository.createMessage({
            conversation_id: existingConvId,
            sender_id: userId,
            message_type: attachments.length > 0 && !initial_message ? 'ATTACHMENT' : 'TEXT',
            content: initial_message || 'Sent an attachment',
            attachments,
          });
          this._dispatchMessageNotification(schoolId, userId, user, recipient_id, initial_message, existingConvId);
        }

        const conv = await this.repository.getConversationById(existingConvId, userId, schoolId);
        return { conversation: conv, isNew: false };
      }
    }

    // Transactional creation of new conversation
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      const result = await this.repository.createConversationWithParticipants(client, {
        school_id: schoolId,
        type,
        title,
        student_id,
        subject_id,
        created_by: userId,
        participants: [recipient_id],
        initial_message,
        attachments,
      });

      await client.query('COMMIT');

      if (initial_message || attachments.length > 0) {
        this._dispatchMessageNotification(
          schoolId,
          userId,
          user,
          recipient_id,
          initial_message || 'Sent an attachment',
          result.conversation.id
        );
      }

      const fullConv = await this.repository.getConversationById(
        result.conversation.id,
        userId,
        schoolId
      );

      return { conversation: fullConv, isNew: true, message: result.message };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Retrieves single conversation details.
   */
  async getConversationById(conversationId, user) {
    if (!isValidUuid(conversationId)) {
      const err = new Error('Invalid conversation ID');
      err.status = 400;
      throw err;
    }

    const userId = user?.sub || user?.id;
    const role = (user?.role || '').toLowerCase();
    const isSuperAdmin = role.includes('admin');

    const conversation = await this.repository.getConversationById(
      conversationId,
      userId,
      user.school_id,
      isSuperAdmin
    );

    if (!conversation) {
      const err = new Error('Conversation not found or access denied');
      err.status = 404;
      throw err;
    }

    return conversation;
  }

  /**
   * Retrieves message stream for a conversation and automatically marks it as read.
   */
  async getConversationMessages(conversationId, user, options = {}) {
    if (!isValidUuid(conversationId)) {
      const err = new Error('Invalid conversation ID');
      err.status = 400;
      throw err;
    }

    // Check participation
    await this.getConversationById(conversationId, user);

    const userId = user?.sub || user?.id;
    const result = await this.repository.getConversationMessages(conversationId, options);

    // Auto mark as read unless explicitly skipped
    if (options.markRead !== 'false' && options.markRead !== false) {
      this.repository.markConversationAsRead(conversationId, userId).catch(() => {});
    }

    return result;
  }

  /**
   * Sends a message into an active conversation thread.
   */
  async sendMessage(conversationId, user, body = {}) {
    if (!isValidUuid(conversationId)) {
      const err = new Error('Invalid conversation ID');
      err.status = 400;
      throw err;
    }

    const validation = validateSendMessage(body);
    if (!validation.isValid) {
      const err = new Error(validation.errors.join('; '));
      err.status = 400;
      throw err;
    }

    // Verify user is an active participant in this conversation
    const conversation = await this.getConversationById(conversationId, user);
    const userId = user?.sub || user?.id;

    const message = await this.repository.createMessage({
      conversation_id: conversationId,
      sender_id: userId,
      message_type: validation.sanitized.message_type,
      content: validation.sanitized.content,
      reply_to_message_id: validation.sanitized.reply_to_message_id,
      attachments: validation.sanitized.attachments,
    });

    // Notify other participants in the thread
    const otherParticipants = (conversation.participants || []).filter((p) => p.id !== userId);
    for (const p of otherParticipants) {
      this._dispatchMessageNotification(
        user.school_id,
        userId,
        user,
        p.id,
        validation.sanitized.content,
        conversationId
      );
    }

    return message;
  }

  /**
   * Marks a conversation thread as read for current user.
   */
  async markAsRead(conversationId, user) {
    if (!isValidUuid(conversationId)) {
      const err = new Error('Invalid conversation ID');
      err.status = 400;
      throw err;
    }
    const userId = user?.sub || user?.id;
    return this.repository.markConversationAsRead(conversationId, userId);
  }

  /**
   * Updates participant settings (archive, mute, star).
   */
  async updateParticipantSettings(conversationId, user, settings = {}) {
    if (!isValidUuid(conversationId)) {
      const err = new Error('Invalid conversation ID');
      err.status = 400;
      throw err;
    }
    const userId = user?.sub || user?.id;
    const updated = await this.repository.updateParticipantSettings(conversationId, userId, settings);
    if (!updated) {
      const err = new Error('Could not update participant settings');
      err.status = 400;
      throw err;
    }
    return updated;
  }

  /**
   * Soft deletes a message if authorized.
   */
  async deleteMessage(messageId, user) {
    if (!isValidUuid(messageId)) {
      const err = new Error('Invalid message ID');
      err.status = 400;
      throw err;
    }

    const userId = user?.sub || user?.id;
    const role = (user?.role || '').toLowerCase();
    const isAdmin = role.includes('admin');

    const deleted = await this.repository.softDeleteMessage(messageId, userId, isAdmin);
    if (!deleted) {
      const err = new Error('Message not found or you do not have permission to delete it');
      err.status = 404;
      throw err;
    }

    return { messageId, deleted_at: deleted.deleted_at };
  }

  /**
   * Returns global total unread message counter.
   */
  async getUnreadCount(schoolId, user) {
    const userId = user?.sub || user?.id;
    const count = await this.repository.getUnreadCount(schoolId, userId);
    return { unread_count: count };
  }

  /**
   * Retrieves authorized contact directory.
   */
  async getEligibleContacts(schoolId, user, query = {}) {
    return this.repository.getEligibleContacts(schoolId, user, query);
  }

  /**
   * Dispatches an in-app notification to the recipient asynchronously.
   * Gracefully fails without interrupting the message pipeline.
   */
  _dispatchMessageNotification(schoolId, senderId, senderUser, recipientId, contentSnippet, conversationId) {
    const senderName = `${senderUser.first_name || ''} ${senderUser.last_name || ''}`.trim() || 'A user';
    const preview = contentSnippet ? contentSnippet.slice(0, 100) : 'Sent an attachment';

    const insertSql = `
      INSERT INTO notifications (
        school_id, title, message, type, priority, audience,
        action_url, action_label, recipient_user_id, metadata, published_at
      ) VALUES ($1, $2, $3, 'GENERAL', 'NORMAL', 'ALL', $4, 'Open Message', $5, $6, CURRENT_TIMESTAMP)
      RETURNING id
    `;

    const metadata = JSON.stringify({
      conversationId,
      senderId,
      senderName,
    });

    this.db.query(insertSql, [
      schoolId,
      `New message from ${senderName}`,
      preview,
      `/dashboard/messages?conversationId=${conversationId}`,
      recipientId,
      metadata,
    ]).then((res) => {
      const notifId = res.rows[0]?.id;
      if (notifId) {
        this.db.query(
          `INSERT INTO user_notifications (notification_id, user_id, is_read)
           VALUES ($1, $2, false)
           ON CONFLICT DO NOTHING`,
          [notifId, recipientId]
        ).catch(() => {});
      }
    }).catch(() => {
      // Non-blocking notification dispatch failure
    });
  }
}

module.exports = MessageService;
