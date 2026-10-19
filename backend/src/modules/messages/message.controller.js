/**
 * MessageController
 *
 * Handles HTTP requests and standard JSON response envelopes for the Messaging Module.
 */

const path = require('path');
const fs = require('fs');
const MessageRepository = require('./message.repository');
const MessageService = require('./message.service');
const { db } = require('../../config/database');

const repository = new MessageRepository(db);
const messageService = new MessageService(repository, db);

/**
 * List inbox conversations for the current user.
 */
async function listConversations(req, res, next) {
  try {
    const result = await messageService.getUserConversations(req.user.school_id, req.user, req.query);
    return res.status(200).json({
      success: true,
      message: 'Conversations loaded successfully',
      data: result.items,
      pagination: result.pagination,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Start a new conversation or open an existing direct thread.
 */
async function createOrGetConversation(req, res, next) {
  try {
    const result = await messageService.getOrCreateConversation(req.user.school_id, req.user, req.body);
    return res.status(result.isNew ? 201 : 200).json({
      success: true,
      message: result.isNew ? 'Conversation started successfully' : 'Existing conversation loaded',
      data: result.conversation,
      messageData: result.message || null,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Get single conversation metadata and participants.
 */
async function getConversation(req, res, next) {
  try {
    const data = await messageService.getConversationById(req.params.id, req.user);
    return res.status(200).json({
      success: true,
      message: 'Conversation loaded successfully',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Get paginated message history for a conversation.
 */
async function listMessages(req, res, next) {
  try {
    const result = await messageService.getConversationMessages(req.params.id, req.user, req.query);
    return res.status(200).json({
      success: true,
      message: 'Messages loaded successfully',
      data: result.messages,
      pagination: result.pagination,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Post a new message into a conversation.
 */
async function sendMessage(req, res, next) {
  try {
    const data = await messageService.sendMessage(req.params.id, req.user, req.body);
    return res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Mark a conversation as read.
 */
async function markAsRead(req, res, next) {
  try {
    const data = await messageService.markAsRead(req.params.id, req.user);
    return res.status(200).json({
      success: true,
      message: 'Conversation marked as read',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Update user participant settings (archive, mute, star).
 */
async function updateParticipantSettings(req, res, next) {
  try {
    const data = await messageService.updateParticipantSettings(req.params.id, req.user, req.body);
    return res.status(200).json({
      success: true,
      message: 'Conversation settings updated',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Soft delete a message.
 */
async function deleteMessage(req, res, next) {
  try {
    const data = await messageService.deleteMessage(req.params.messageId, req.user);
    return res.status(200).json({
      success: true,
      message: 'Message deleted successfully',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Global unread message count for top navigation bar.
 */
async function getUnreadCount(req, res, next) {
  try {
    const data = await messageService.getUnreadCount(req.user.school_id, req.user);
    return res.status(200).json({
      success: true,
      message: 'Unread message count loaded',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Authorized contact directory for starting conversations.
 */
async function getContacts(req, res, next) {
  try {
    const result = await messageService.getEligibleContacts(req.user.school_id, req.user, req.query);
    return res.status(200).json({
      success: true,
      message: 'Eligible contacts loaded successfully',
      data: result.contacts,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Upload single attachment file.
 */
async function uploadAttachment(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
        data: null,
      });
    }

    const fileUrl = `/uploads/messages/${req.file.filename}`;
    return res.status(200).json({
      success: true,
      message: 'Attachment uploaded successfully',
      data: {
        file_name: req.file.originalname,
        file_size: req.file.size,
        file_type: req.file.mimetype,
        file_url: fileUrl,
      },
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Securely download an attachment by ID with Content-Disposition header.
 */
async function downloadAttachment(req, res, next) {
  try {
    const { attachmentId } = req.params;
    const userId = req.user?.sub || req.user?.id;
    const schoolId = req.user?.school_id;

    const attRes = await db.query(
      `SELECT a.*, c.school_id, c.id AS conversation_id
       FROM message_attachments a
       JOIN messages m ON m.id = a.message_id
       JOIN conversations c ON c.id = m.conversation_id
       WHERE a.id = $1`,
      [attachmentId]
    );

    const attachment = attRes.rows[0];
    if (!attachment) {
      return res.status(404).json({
        success: false,
        message: 'Attachment not found',
        data: null,
      });
    }

    if (attachment.school_id !== schoolId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Attachment belongs to another school',
        data: null,
      });
    }

    // Verify user is a participant or admin
    const isParticipantRes = await db.query(
      `SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
      [attachment.conversation_id, userId]
    );

    const userRole = (req.user?.role || '').toLowerCase();
    const isAdmin = userRole.includes('admin');

    if (isParticipantRes.rows.length === 0 && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not a participant in this conversation',
        data: null,
      });
    }

    // Resolve file from disk
    const filename = path.basename(attachment.file_url);
    const filePath = path.join(__dirname, '../../../uploads/messages', filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Attachment file not found on disk',
        data: null,
      });
    }

    return res.download(filePath, attachment.file_name);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listConversations,
  createOrGetConversation,
  getConversation,
  listMessages,
  sendMessage,
  markAsRead,
  updateParticipantSettings,
  deleteMessage,
  getUnreadCount,
  getContacts,
  uploadAttachment,
  downloadAttachment,
};
