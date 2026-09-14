/**
 * Library Validation Schemas and Sanitization Helpers
 */

function validateLibrarySettings(data) {
  const errors = [];
  if (data.max_active_loans_student !== undefined && (isNaN(data.max_active_loans_student) || Number(data.max_active_loans_student) < 1)) {
    errors.push('max_active_loans_student must be a positive integer');
  }
  if (data.max_active_loans_teacher !== undefined && (isNaN(data.max_active_loans_teacher) || Number(data.max_active_loans_teacher) < 1)) {
    errors.push('max_active_loans_teacher must be a positive integer');
  }
  if (data.max_active_loans_staff !== undefined && (isNaN(data.max_active_loans_staff) || Number(data.max_active_loans_staff) < 1)) {
    errors.push('max_active_loans_staff must be a positive integer');
  }
  if (data.default_student_loan_period !== undefined && (isNaN(data.default_student_loan_period) || Number(data.default_student_loan_period) < 1)) {
    errors.push('default_student_loan_period must be at least 1 day');
  }
  if (data.default_teacher_loan_period !== undefined && (isNaN(data.default_teacher_loan_period) || Number(data.default_teacher_loan_period) < 1)) {
    errors.push('default_teacher_loan_period must be at least 1 day');
  }
  if (data.default_staff_loan_period !== undefined && (isNaN(data.default_staff_loan_period) || Number(data.default_staff_loan_period) < 1)) {
    errors.push('default_staff_loan_period must be at least 1 day');
  }
  if (data.fine_per_overdue_day !== undefined && (isNaN(data.fine_per_overdue_day) || Number(data.fine_per_overdue_day) < 0)) {
    errors.push('fine_per_overdue_day cannot be negative');
  }
  if (data.max_renewal_count !== undefined && (isNaN(data.max_renewal_count) || Number(data.max_renewal_count) < 0)) {
    errors.push('max_renewal_count cannot be negative');
  }
  if (data.reservation_hold_period !== undefined && (isNaN(data.reservation_hold_period) || Number(data.reservation_hold_period) < 1)) {
    errors.push('reservation_hold_period must be at least 1 day');
  }
  return errors;
}

function validateCategory(data) {
  const errors = [];
  if (!data.name || !data.name.trim()) {
    errors.push('Category name is required');
  }
  return errors;
}

function validateSubject(data) {
  const errors = [];
  if (!data.name || !data.name.trim()) {
    errors.push('Subject name is required');
  }
  return errors;
}

function validateAuthor(data) {
  const errors = [];
  if (!data.name || !data.name.trim()) {
    errors.push('Author name is required');
  }
  return errors;
}

function validatePublisher(data) {
  const errors = [];
  if (!data.name || !data.name.trim()) {
    errors.push('Publisher name is required');
  }
  return errors;
}

function validateBook(data) {
  const errors = [];
  if (!data.title || !data.title.trim()) {
    errors.push('Book title is required');
  }
  if (data.publication_year && (isNaN(data.publication_year) || Number(data.publication_year) < 1000 || Number(data.publication_year) > 2100)) {
    errors.push('Invalid publication year');
  }
  if (data.pages && (isNaN(data.pages) || Number(data.pages) <= 0)) {
    errors.push('Pages must be a positive integer');
  }
  return errors;
}

function validateBookCopy(data) {
  const errors = [];
  const bookId = data.book_id || data.bookId;
  const accession = data.accession_number || data.accessionNumber;
  if (!bookId) {
    errors.push('Book ID is required');
  }
  if (!accession || !String(accession).trim()) {
    errors.push('Accession number/barcode is required');
  }
  return errors;
}

function validateBulkCopies(data) {
  const errors = [];
  const bookId = data.book_id || data.bookId;
  if (!bookId) {
    errors.push('Book ID is required');
  }
  if (!data.quantity || isNaN(data.quantity) || Number(data.quantity) < 1 || Number(data.quantity) > 100) {
    errors.push('Quantity must be between 1 and 100');
  }
  return errors;
}

function validateLoanIssue(data, policy) {
  const errors = [];
  const hasCopyId = Boolean(
    data.copy_id ||
    data.copyId ||
    data.accession_number ||
    data.accessionNumber ||
    data.barcode ||
    data.identifier
  );
  if (!hasCopyId) {
    errors.push('Book copy identifier (copy_id, accession_number, or barcode) is required');
  }

  const hasMemberId = Boolean(
    data.member_id ||
    data.memberId ||
    data.user_id ||
    data.userId ||
    data.member_number ||
    data.memberNumber ||
    data.memberIdentifier
  );
  if (!hasMemberId) {
    errors.push('Library member identifier (member_id, user_id, or member_number) is required');
  }

  const ackType = data.borrower_acknowledgment_type || data.borrowerAcknowledgmentType || 'SIGNATURE';
  const sig = data.borrower_signature || data.borrowerSignature;
  if (policy && policy.require_signature) {
    if (ackType === 'SIGNATURE' && (!sig || !sig.trim())) {
      errors.push('Borrower signature is required according to library policy');
    }
  }

  const duration = data.loan_duration_days || data.loanDurationDays;
  if (duration && (isNaN(duration) || Number(duration) < 1)) {
    errors.push('Loan duration must be at least 1 day');
  }
  return errors;
}

function validateLoanReturn(data) {
  const errors = [];
  const damage = data.damage_fine_amount !== undefined ? data.damage_fine_amount : data.damageFineAmount;
  if (damage !== undefined && (isNaN(damage) || Number(damage) < 0)) {
    errors.push('Damage fine amount cannot be negative');
  }
  return errors;
}

function validateReservation(data) {
  const errors = [];
  const bookId = data.book_id || data.bookId;
  const memberId = data.member_id || data.memberId || data.user_id || data.userId;
  if (!bookId) {
    errors.push('Book ID is required');
  }
  if (!memberId) {
    errors.push('Member ID or User ID is required');
  }
  return errors;
}

function validateFinePayment(data) {
  const errors = [];
  if (!data.fine_id) {
    errors.push('Fine ID is required');
  }
  if (!data.amount || isNaN(data.amount) || Number(data.amount) <= 0) {
    errors.push('Payment amount must be a positive number');
  }
  return errors;
}

function validateFineWaiver(data) {
  const errors = [];
  if (!data.fine_id) {
    errors.push('Fine ID is required');
  }
  if (!data.waived_reason || !data.waived_reason.trim()) {
    errors.push('A valid reason is required to waive a fine');
  }
  return errors;
}

function validateBulkBooksImport(data) {
  const errors = [];
  const books = Array.isArray(data) ? data : data.books;
  if (!books || !Array.isArray(books) || books.length === 0) {
    errors.push('A non-empty list of books is required for bulk import');
  }
  return errors;
}

function validateBulkCopiesImport(data) {
  const errors = [];
  const copies = Array.isArray(data) ? data : data.copies;
  if (!copies || !Array.isArray(copies) || copies.length === 0) {
    errors.push('A non-empty list of copies is required for bulk import');
  }
  return errors;
}

function validateBulkMembersImport(data) {
  const errors = [];
  const members = Array.isArray(data) ? data : data.members;
  if (!members || !Array.isArray(members) || members.length === 0) {
    errors.push('A non-empty list of members is required for bulk import');
  }
  return errors;
}

module.exports = {
  validateLibrarySettings,
  validateCategory,
  validateSubject,
  validateAuthor,
  validatePublisher,
  validateBook,
  validateBookCopy,
  validateBulkCopies,
  validateLoanIssue,
  validateLoanReturn,
  validateReservation,
  validateFinePayment,
  validateFineWaiver,
  validateBulkBooksImport,
  validateBulkCopiesImport,
  validateBulkMembersImport,
};
