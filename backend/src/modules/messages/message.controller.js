/**
 * MessageController
 *
 * Handles HTTP requests and standard JSON response envelopes for the Messaging Module.
 */

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
};
