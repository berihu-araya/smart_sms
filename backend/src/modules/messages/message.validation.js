/**
 * Validation rules and schemas for Messaging operations.
 */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const VALID_CONVERSATION_TYPES = [
  'DIRECT',
  'ACADEMIC_INQUIRY',
  'OFFICE_SUPPORT',
  'GROUP_SECTION',
];

const VALID_MESSAGE_TYPES = ['TEXT', 'ATTACHMENT', 'SYSTEM_EVENT'];

function isValidUuid(val) {
  return typeof val === 'string' && UUID_REGEX.test(val.trim());
}

/**
 * Validates creating or opening a conversation thread.
 * @param {object} body
 * @returns {{ isValid: boolean, errors: string[], sanitized: object }}
 */
function validateCreateConversation(body = {}) {
  const errors = [];
  const sanitized = {};

  const recipientId = body.recipient_id || body.recipient_user_id;
  if (!recipientId || !isValidUuid(recipientId)) {
    errors.push('recipient_id is required and must be a valid UUID');
  } else {
    sanitized.recipient_id = recipientId.trim();
  }

  // Type
  const convType = (body.type || 'DIRECT').toUpperCase().trim();
  if (!VALID_CONVERSATION_TYPES.includes(convType)) {
    errors.push(`Conversation type must be one of: ${VALID_CONVERSATION_TYPES.join(', ')}`);
  } else {
    sanitized.type = convType;
  }

  // Title / Subject
  if (body.title && typeof body.title === 'string') {
    sanitized.title = body.title.trim().slice(0, 255);
  } else {
    sanitized.title = null;
  }

  // Student Context (Optional)
  if (body.student_id) {
    if (!isValidUuid(body.student_id)) {
      errors.push('student_id must be a valid UUID if provided');
    } else {
      sanitized.student_id = body.student_id.trim();
    }
  } else {
    sanitized.student_id = null;
  }

  // Subject Context (Optional)
  if (body.subject_id) {
    if (!isValidUuid(body.subject_id)) {
      errors.push('subject_id must be a valid UUID if provided');
    } else {
      sanitized.subject_id = body.subject_id.trim();
    }
  } else {
    sanitized.subject_id = null;
  }

  // Optional initial message
  if (body.initial_message && typeof body.initial_message === 'string') {
    const trimmed = body.initial_message.trim();
    if (trimmed.length > 5000) {
      errors.push('Initial message content must not exceed 5000 characters');
    } else if (trimmed.length > 0) {
      sanitized.initial_message = trimmed;
    }
  }

  // Optional attachments for initial message
  if (Array.isArray(body.attachments)) {
    sanitized.attachments = sanitizeAttachments(body.attachments, errors);
  } else {
    sanitized.attachments = [];
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized,
  };
}

/**
 * Validates sending a message in a conversation.
 * @param {object} body
 * @returns {{ isValid: boolean, errors: string[], sanitized: object }}
 */
function validateSendMessage(body = {}) {
  const errors = [];
  const sanitized = {};

  const content = typeof body.content === 'string' ? body.content.trim() : '';
  const attachments = Array.isArray(body.attachments)
    ? sanitizeAttachments(body.attachments, errors)
    : [];

  if (!content && attachments.length === 0) {
    errors.push('Message content or at least one attachment is required');
  } else if (content.length > 5000) {
    errors.push('Message content must not exceed 5000 characters');
  }

  sanitized.content = content;
  sanitized.attachments = attachments;

  // Message Type
  const msgType = (body.message_type || (attachments.length > 0 && !content ? 'ATTACHMENT' : 'TEXT'))
    .toUpperCase()
    .trim();
  if (!VALID_MESSAGE_TYPES.includes(msgType)) {
    errors.push(`message_type must be one of: ${VALID_MESSAGE_TYPES.join(', ')}`);
  } else {
    sanitized.message_type = msgType;
  }

  // Reply to message id
  if (body.reply_to_message_id) {
    if (!isValidUuid(body.reply_to_message_id)) {
      errors.push('reply_to_message_id must be a valid UUID');
    } else {
      sanitized.reply_to_message_id = body.reply_to_message_id.trim();
    }
  } else {
    sanitized.reply_to_message_id = null;
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized,
  };
}

/**
 * Sanitizes and validates array of attachment objects.
 */
function sanitizeAttachments(attachments, errors) {
  const clean = [];
  for (let i = 0; i < attachments.length; i++) {
    const item = attachments[i];
    if (!item || typeof item !== 'object') continue;

    if (!item.file_name || typeof item.file_name !== 'string') {
      errors.push(`Attachment at index ${i} must have a valid file_name`);
      continue;
    }
    if (!item.file_url || typeof item.file_url !== 'string') {
      errors.push(`Attachment at index ${i} must have a valid file_url`);
      continue;
    }

    clean.push({
      file_name: item.file_name.trim().slice(0, 255),
      file_url: item.file_url.trim(),
      file_type: typeof item.file_type === 'string' ? item.file_type.trim().slice(0, 100) : 'application/octet-stream',
      file_size: Number.isInteger(item.file_size) && item.file_size > 0 ? item.file_size : 0,
    });
  }
  return clean;
}

module.exports = {
  isValidUuid,
  validateCreateConversation,
  validateSendMessage,
  VALID_CONVERSATION_TYPES,
  VALID_MESSAGE_TYPES,
};
