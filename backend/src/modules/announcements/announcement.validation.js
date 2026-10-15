/**
 * Validation rules and schemas for Announcement operations.
 */

const VALID_CATEGORIES = [
  'GENERAL',
  'ACADEMIC',
  'EXAMINATION',
  'HOLIDAY',
  'EVENT',
  'ADMINISTRATIVE',
  'SPORTS',
  'FEE_FINANCE',
];

const VALID_PRIORITIES = ['NORMAL', 'IMPORTANT', 'URGENT'];

const VALID_AUDIENCES = ['ALL', 'TEACHERS', 'PARENTS', 'STUDENTS', 'STAFF'];

const VALID_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];

/**
 * Validates the payload for creating a new announcement.
 * @param {object} body
 * @returns {{ isValid: boolean, errors: string[], sanitized: object }}
 */
function validateCreateAnnouncement(body = {}) {
  const errors = [];
  const sanitized = {};

  // Title
  if (!body.title || typeof body.title !== 'string' || body.title.trim().length < 3) {
    errors.push('Title is required and must be at least 3 characters long');
  } else if (body.title.trim().length > 255) {
    errors.push('Title must not exceed 255 characters');
  } else {
    sanitized.title = body.title.trim();
  }

  // Content
  if (!body.content || typeof body.content !== 'string' || body.content.trim().length < 5) {
    errors.push('Content is required and must be at least 5 characters long');
  } else {
    sanitized.content = body.content.trim();
  }

  // Category
  const category = (body.category || 'GENERAL').toUpperCase().trim();
  if (!VALID_CATEGORIES.includes(category)) {
    errors.push(`Category must be one of: ${VALID_CATEGORIES.join(', ')}`);
  } else {
    sanitized.category = category;
  }

  // Priority
  const priority = (body.priority || 'NORMAL').toUpperCase().trim();
  if (!VALID_PRIORITIES.includes(priority)) {
    errors.push(`Priority must be one of: ${VALID_PRIORITIES.join(', ')}`);
  } else {
    sanitized.priority = priority;
  }

  // Audience
  const audience = (body.audience || 'ALL').toUpperCase().trim();
  if (!VALID_AUDIENCES.includes(audience)) {
    errors.push(`Audience must be one of: ${VALID_AUDIENCES.join(', ')}`);
  } else {
    sanitized.audience = audience;
  }

  // Optional Grade & Section Targeting
  sanitized.grade_id = body.grade_id && typeof body.grade_id === 'string' && body.grade_id.trim() !== '' ? body.grade_id.trim() : null;
  sanitized.section_id = body.section_id && typeof body.section_id === 'string' && body.section_id.trim() !== '' ? body.section_id.trim() : null;

  // Attachment
  sanitized.attachment_url = body.attachment_url && typeof body.attachment_url === 'string' ? body.attachment_url.trim() : null;
  sanitized.attachment_name = body.attachment_name && typeof body.attachment_name === 'string' ? body.attachment_name.trim() : null;

  // Booleans
  sanitized.is_pinned = Boolean(body.is_pinned);
  sanitized.requires_acknowledgement = Boolean(body.requires_acknowledgement);

  // Status
  const status = (body.status || 'PUBLISHED').toUpperCase().trim();
  if (!VALID_STATUSES.includes(status)) {
    errors.push(`Status must be one of: ${VALID_STATUSES.join(', ')}`);
  } else {
    sanitized.status = status;
  }

  // Dates
  if (body.published_at) {
    const pubDate = new Date(body.published_at);
    if (isNaN(pubDate.getTime())) {
      errors.push('published_at must be a valid ISO date');
    } else {
      sanitized.published_at = pubDate.toISOString();
    }
  } else {
    sanitized.published_at = new Date().toISOString();
  }

  if (body.expires_at) {
    const expDate = new Date(body.expires_at);
    if (isNaN(expDate.getTime())) {
      errors.push('expires_at must be a valid ISO date');
    } else {
      sanitized.expires_at = expDate.toISOString();
    }
  } else {
    sanitized.expires_at = null;
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized,
  };
}

/**
 * Validates the payload for updating an announcement.
 * @param {object} body
 * @returns {{ isValid: boolean, errors: string[], sanitized: object }}
 */
function validateUpdateAnnouncement(body = {}) {
  const errors = [];
  const sanitized = {};

  if (body.title !== undefined) {
    if (typeof body.title !== 'string' || body.title.trim().length < 3) {
      errors.push('Title must be at least 3 characters long');
    } else if (body.title.trim().length > 255) {
      errors.push('Title must not exceed 255 characters');
    } else {
      sanitized.title = body.title.trim();
    }
  }

  if (body.content !== undefined) {
    if (typeof body.content !== 'string' || body.content.trim().length < 5) {
      errors.push('Content must be at least 5 characters long');
    } else {
      sanitized.content = body.content.trim();
    }
  }

  if (body.category !== undefined) {
    const cat = body.category.toUpperCase().trim();
    if (!VALID_CATEGORIES.includes(cat)) {
      errors.push(`Category must be one of: ${VALID_CATEGORIES.join(', ')}`);
    } else {
      sanitized.category = cat;
    }
  }

  if (body.priority !== undefined) {
    const prio = body.priority.toUpperCase().trim();
    if (!VALID_PRIORITIES.includes(prio)) {
      errors.push(`Priority must be one of: ${VALID_PRIORITIES.join(', ')}`);
    } else {
      sanitized.priority = prio;
    }
  }

  if (body.audience !== undefined) {
    const aud = body.audience.toUpperCase().trim();
    if (!VALID_AUDIENCES.includes(aud)) {
      errors.push(`Audience must be one of: ${VALID_AUDIENCES.join(', ')}`);
    } else {
      sanitized.audience = aud;
    }
  }

  if (body.grade_id !== undefined) {
    sanitized.grade_id = body.grade_id && body.grade_id.trim() !== '' ? body.grade_id.trim() : null;
  }

  if (body.section_id !== undefined) {
    sanitized.section_id = body.section_id && body.section_id.trim() !== '' ? body.section_id.trim() : null;
  }

  if (body.attachment_url !== undefined) {
    sanitized.attachment_url = body.attachment_url ? body.attachment_url.trim() : null;
  }

  if (body.attachment_name !== undefined) {
    sanitized.attachment_name = body.attachment_name ? body.attachment_name.trim() : null;
  }

  if (body.is_pinned !== undefined) {
    sanitized.is_pinned = Boolean(body.is_pinned);
  }

  if (body.requires_acknowledgement !== undefined) {
    sanitized.requires_acknowledgement = Boolean(body.requires_acknowledgement);
  }

  if (body.status !== undefined) {
    const st = body.status.toUpperCase().trim();
    if (!VALID_STATUSES.includes(st)) {
      errors.push(`Status must be one of: ${VALID_STATUSES.join(', ')}`);
    } else {
      sanitized.status = st;
    }
  }

  if (body.published_at !== undefined) {
    if (body.published_at === null) {
      sanitized.published_at = new Date().toISOString();
    } else {
      const pubDate = new Date(body.published_at);
      if (isNaN(pubDate.getTime())) {
        errors.push('published_at must be a valid ISO date');
      } else {
        sanitized.published_at = pubDate.toISOString();
      }
    }
  }

  if (body.expires_at !== undefined) {
    if (!body.expires_at) {
      sanitized.expires_at = null;
    } else {
      const expDate = new Date(body.expires_at);
      if (isNaN(expDate.getTime())) {
        errors.push('expires_at must be a valid ISO date');
      } else {
        sanitized.expires_at = expDate.toISOString();
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized,
  };
}

module.exports = {
  VALID_CATEGORIES,
  VALID_PRIORITIES,
  VALID_AUDIENCES,
  VALID_STATUSES,
  validateCreateAnnouncement,
  validateUpdateAnnouncement,
};
