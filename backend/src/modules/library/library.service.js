/**
 * Library Service
 * Enforces business logic, dynamic policies, role permissions, and circulation workflows.
 */

class LibraryService {
  constructor(repository) {
    this.repository = repository;
  }

  // ==========================================
  // 1. SETTINGS & POLICIES
  // ==========================================

  async getSettings(schoolId = null) {
    return await this.repository.getSettings(schoolId);
  }

  async updateSettings(data, schoolId = null, userId = null) {
    const updated = await this.repository.updateSettings(data, schoolId);
    if (userId) {
      await this.repository.db.query(
        `INSERT INTO library_audit_logs (school_id, user_id, action, entity_type, entity_id, details) VALUES ($1, $2, 'CONFIG_UPDATED', 'SETTING', $3, $4)`,
        [schoolId, userId, updated.id, JSON.stringify(data)]
      );
    }
    return updated;
  }

  // ==========================================
  // 2. CATEGORIES, SUBJECTS, AUTHORS, PUBLISHERS
  // ==========================================

  async listCategories(schoolId = null) {
    return await this.repository.listCategories(schoolId);
  }

  async createCategory(data, schoolId = null) {
    return await this.repository.createCategory({ ...data, schoolId });
  }

  async updateCategory(id, data) {
    return await this.repository.updateCategory(id, data);
  }

  async deleteCategory(id) {
    return await this.repository.deleteCategory(id);
  }

  async listSubjects(schoolId = null) {
    return await this.repository.listSubjects(schoolId);
  }

  async createSubject(data, schoolId = null) {
    return await this.repository.createSubject({ ...data, schoolId });
  }

  async updateSubject(id, data) {
    return await this.repository.updateSubject(id, data);
  }

  async deleteSubject(id) {
    return await this.repository.deleteSubject(id);
  }

  async listAuthors(schoolId = null) {
    return await this.repository.listAuthors(schoolId);
  }

  async createAuthor(data, schoolId = null) {
    return await this.repository.createAuthor({ ...data, schoolId });
  }

  async updateAuthor(id, data) {
    return await this.repository.updateAuthor(id, data);
  }

  async deleteAuthor(id) {
    return await this.repository.deleteAuthor(id);
  }

  async listPublishers(schoolId = null) {
    return await this.repository.listPublishers(schoolId);
  }

  async createPublisher(data, schoolId = null) {
    return await this.repository.createPublisher({ ...data, schoolId });
  }

  async updatePublisher(id, data) {
    return await this.repository.updatePublisher(id, data);
  }

  async deletePublisher(id) {
    return await this.repository.deletePublisher(id);
  }

  // ==========================================
  // 3. BOOKS & COPIES CATALOG
  // ==========================================

  async listBooks(filter) {
    return await this.repository.listBooks(filter);
  }

  async getBookById(id) {
    const book = await this.repository.getBookById(id);
    if (!book) {
      const err = new Error('Book not found');
      err.status = 404;
      throw err;
    }
    const copies = await this.repository.listCopiesByBook(id);
    return { ...book, copies };
  }

  async createBook(data, authorIds = [], schoolId = null) {
    return await this.repository.createBook(data, authorIds, schoolId);
  }

  async updateBook(id, data, authorIds = null) {
    const updated = await this.repository.updateBook(id, data, authorIds);
    if (!updated) {
      const err = new Error('Book not found');
      err.status = 404;
      throw err;
    }
    return updated;
  }

  async deleteBook(id) {
    return await this.repository.deleteBook(id);
  }

  async listCopiesByBook(bookId) {
    return await this.repository.listCopiesByBook(bookId);
  }

  async findCopyByAccessionOrBarcode(identifier, schoolId = null) {
    return await this.repository.findCopyByAccessionOrBarcode(identifier, schoolId);
  }

  async createBookCopy(data, schoolId = null) {
    return await this.repository.createBookCopy(data, schoolId);
  }

  async createBulkCopies(data, schoolId = null) {
    return await this.repository.createBulkCopies(data, schoolId);
  }

  async updateCopy(id, data) {
    const copy = await this.repository.updateCopy(id, data);
    if (!copy) {
      const err = new Error('Book copy not found');
      err.status = 404;
      throw err;
    }
    return copy;
  }

  async deleteCopy(id) {
    return await this.repository.deleteCopy(id);
  }

  // ==========================================
  // 4. MEMBERS
  // ==========================================

  async listMembers(filter) {
    return await this.repository.listMembers(filter);
  }

  async findMemberById(id) {
    const member = await this.repository.findMemberById(id);
    if (!member) {
      const err = new Error('Member not found');
      err.status = 404;
      throw err;
    }
    return member;
  }

  async findMemberByUserId(userId, schoolId = null) {
    let member = await this.repository.findMemberByUserId(userId);
    if (!member) {
      // Auto-create/sync member profile for this user
      member = await this.repository.createOrSyncMember(userId, schoolId);
    }
    return member;
  }

  async findMemberByIdentifier(identifier, schoolId = null) {
    return await this.repository.findMemberByIdentifier(identifier, schoolId);
  }

  async syncAllEligibleUsers(schoolId = null) {
    return await this.repository.syncAllEligibleUsers(schoolId);
  }

  async updateMemberStatus(id, status, notes = null) {
    return await this.repository.updateMemberStatus(id, status, notes);
  }

  // ==========================================
  // 5. CIRCULATION (ISSUE, RETURN, RENEW)
  // ==========================================

  async issueLoan({
    copyId,
    accessionNumber,
    barcode,
    memberId,
    userId,
    memberNumber,
    loanDurationDays,
    conditionOnIssue = 'GOOD',
    borrowerAcknowledgmentType = 'SIGNATURE',
    borrowerSignature = null,
    issueNotes = null,
    issuedByUserId,
    schoolId = null,
  }) {
    // 1. Fetch library policy
    const policy = await this.repository.getSettings(schoolId);

    // 2. Resolve Copy
    let copy = null;
    if (copyId) {
      const copyRes = await this.repository.db.query(
        `SELECT * FROM library_book_copies WHERE id = $1 AND deleted_at IS NULL`,
        [copyId]
      );
      copy = copyRes.rows[0];
    } else if (accessionNumber || barcode) {
      copy = await this.repository.findCopyByAccessionOrBarcode(accessionNumber || barcode, schoolId);
    }
    if (!copy) {
      const err = new Error('Book copy could not be found with the provided identifier');
      err.status = 404;
      throw err;
    }

    // 3. Resolve Member
    let member = null;
    if (memberId) {
      member = await this.repository.findMemberById(memberId);
    } else if (userId) {
      member = await this.findMemberByUserId(userId, schoolId);
    } else if (memberNumber) {
      member = await this.repository.findMemberByIdentifier(memberNumber, schoolId);
    }
    if (!member) {
      const err = new Error('Library member account not found');
      err.status = 404;
      throw err;
    }

    // 4. Validate Member Status
    if (member.status !== 'ACTIVE') {
      const err = new Error(`Library member account is currently ${member.status.toLowerCase()}`);
      err.status = 403;
      throw err;
    }

    // 5. Check role-based borrowing permissions from policy
    const memberType = (member.member_type || 'STUDENT').toUpperCase();
    if (memberType === 'STUDENT' && policy && !policy.allow_student_borrowing) {
      const err = new Error('Student borrowing is currently disabled in library policy');
      err.status = 403;
      throw err;
    }
    if (memberType === 'TEACHER' && policy && !policy.allow_teacher_borrowing) {
      const err = new Error('Teacher borrowing is currently disabled in library policy');
      err.status = 403;
      throw err;
    }
    if (memberType === 'STAFF' && policy && !policy.allow_staff_borrowing) {
      const err = new Error('Staff borrowing is currently disabled in library policy');
      err.status = 403;
      throw err;
    }

    // 6. Check Active Loans Limit
    let maxAllowedLoans = 3;
    if (member.max_loans_override) {
      maxAllowedLoans = member.max_loans_override;
    } else if (policy) {
      if (memberType === 'TEACHER') maxAllowedLoans = policy.max_active_loans_teacher;
      else if (memberType === 'STAFF') maxAllowedLoans = policy.max_active_loans_staff;
      else maxAllowedLoans = policy.max_active_loans_student;
    }

    if (Number(member.active_loans_count || 0) >= Number(maxAllowedLoans)) {
      const err = new Error(`Member has reached the maximum allowed active loans (${maxAllowedLoans})`);
      err.status = 403;
      throw err;
    }

    // 7. Check Outstanding Fines Limit
    const maxOutstanding = policy ? Number(policy.max_outstanding_fine) : 50;
    if (Number(member.outstanding_fines_sum || 0) > maxOutstanding) {
      const err = new Error(
        `Borrowing is blocked due to outstanding fines of ${member.outstanding_fines_sum} (Policy threshold: ${maxOutstanding})`
      );
      err.status = 403;
      throw err;
    }

    // 8. Determine Loan Duration
    let duration = loanDurationDays ? Number(loanDurationDays) : null;
    if (!duration && policy) {
      if (memberType === 'TEACHER') duration = policy.default_teacher_loan_period;
      else if (memberType === 'STAFF') duration = policy.default_staff_loan_period;
      else duration = policy.default_student_loan_period;
    }
    if (!duration) duration = 14;

    const maxPolicyDuration = policy ? Number(policy.max_loan_period) : 60;
    if (duration > maxPolicyDuration) {
      const err = new Error(`Loan duration cannot exceed maximum policy duration of ${maxPolicyDuration} days`);
      err.status = 400;
      throw err;
    }

    // 9. Enforce signature / electronic acknowledgment if required
    if (policy && policy.require_signature) {
      if (borrowerAcknowledgmentType === 'SIGNATURE' && (!borrowerSignature || !borrowerSignature.trim())) {
        const err = new Error('Borrower signature is mandatory for issuing books');
        err.status = 400;
        throw err;
      }
    }

    // 10. Execute issue loan
    return await this.repository.issueLoan({
      copyId: copy.id,
      memberId: member.id,
      issuedByUserId,
      loanDurationDays: duration,
      conditionOnIssue,
      borrowerAcknowledgmentType,
      borrowerSignature,
      issueNotes,
      schoolId: schoolId || copy.school_id,
    });
  }

  async returnLoan({
    loanId,
    receivedByUserId,
    conditionOnReturn = 'GOOD',
    returnNotes = null,
    damageFineAmount = 0,
    schoolId = null,
  }) {
    const policy = await this.repository.getSettings(schoolId);
    const fineRate = policy ? Number(policy.fine_per_overdue_day) : 2.00;

    return await this.repository.returnLoan({
      loanId,
      receivedByUserId,
      conditionOnReturn,
      returnNotes,
      damageFineAmount,
      policyFineRatePerDay: fineRate,
      schoolId,
    });
  }

  async renewLoan({ loanId, renewedByUserId, renewalDays = null, schoolId = null }) {
    const policy = await this.repository.getSettings(schoolId);
    if (policy && !policy.allow_renewals) {
      const err = new Error('Book renewals are disabled in library policy');
      err.status = 403;
      throw err;
    }

    const maxRenewals = policy ? Number(policy.max_renewal_count) : 2;
    const days = renewalDays ? Number(renewalDays) : (policy ? Number(policy.default_student_loan_period) : 14);

    return await this.repository.renewLoan({
      loanId,
      renewedByUserId,
      renewalDays: days,
      maxRenewalCount: maxRenewals,
      schoolId,
    });
  }

  async listLoans(filter) {
    return await this.repository.listLoans(filter);
  }

  async getLoanById(id) {
    const loan = await this.repository.getLoanById(id);
    if (!loan) {
      const err = new Error('Loan record not found');
      err.status = 404;
      throw err;
    }
    return loan;
  }

  async getMyLoans(userId) {
    const member = await this.findMemberByUserId(userId);
    if (!member) return [];
    return await this.repository.listLoans({ memberId: member.id });
  }

  // ==========================================
  // 6. RESERVATIONS
  // ==========================================

  async listReservations(filter) {
    return await this.repository.listReservations(filter);
  }

  async createReservation({ book_id, member_id, user_id, notes, schoolId = null }) {
    const policy = await this.repository.getSettings(schoolId);
    if (policy && !policy.allow_reservations) {
      const err = new Error('Book reservations are disabled in library policy');
      err.status = 403;
      throw err;
    }

    let resolvedMemberId = member_id;
    if (!resolvedMemberId && user_id) {
      const member = await this.findMemberByUserId(user_id, schoolId);
      resolvedMemberId = member.id;
    }

    return await this.repository.createReservation({
      book_id,
      member_id: resolvedMemberId,
      notes,
      schoolId,
    });
  }

  async cancelReservation(id, userId = null) {
    let memberId = null;
    if (userId) {
      const member = await this.findMemberByUserId(userId);
      if (member) memberId = member.id;
    }
    const cancelled = await this.repository.cancelReservation(id, memberId);
    if (!cancelled) {
      const err = new Error('Reservation not found or could not be cancelled');
      err.status = 404;
      throw err;
    }
    return cancelled;
  }

  async getMyReservations(userId) {
    const member = await this.findMemberByUserId(userId);
    if (!member) return [];
    return await this.repository.listReservations({ memberId: member.id });
  }

  // ==========================================
  // 7. FINES & PAYMENTS & WAIVERS
  // ==========================================

  async listFines(filter) {
    return await this.repository.listFines(filter);
  }

  async recordFinePayment(data, receivedByUserId, schoolId = null) {
    return await this.repository.recordFinePayment({
      ...data,
      receivedByUserId,
      schoolId,
    });
  }

  async waiveFine(data, waivedByUserId, schoolId = null) {
    return await this.repository.waiveFine({
      ...data,
      waivedByUserId,
      schoolId,
    });
  }

  async getMyFines(userId) {
    const member = await this.findMemberByUserId(userId);
    if (!member) return [];
    return await this.repository.listFines({ memberId: member.id });
  }

  // ==========================================
  // 8. REPORTS & ANALYTICS & AUDIT LOGS
  // ==========================================

  async getLibraryDashboardStats(schoolId = null) {
    const stats = await this.repository.getLibraryStats(schoolId);
    const topBooks = await this.repository.getTopBorrowedBooks(schoolId, 5);
    return {
      ...stats,
      top_borrowed_books: topBooks,
    };
  }

  async getTopBorrowedBooks(schoolId = null, limit = 10) {
    return await this.repository.getTopBorrowedBooks(schoolId, limit);
  }

  async getDetailedAnalytics(schoolId = null) {
    return await this.repository.getDetailedAnalytics(schoolId);
  }

  async listAuditLogs(filter) {
    return await this.repository.listAuditLogs(filter);
  }

  // ==========================================
  // 9. BULK IMPORT BATCHES
  // ==========================================

  async importBooksBatch(booksList, schoolId = null, userId = null) {
    return await this.repository.bulkImportBooks(booksList, schoolId, userId);
  }

  async importCopiesBatch(copiesList, schoolId = null, userId = null) {
    return await this.repository.bulkImportCopies(copiesList, schoolId, userId);
  }

  async importMembersBatch(membersList, schoolId = null, userId = null) {
    return await this.repository.bulkImportMembers(membersList, schoolId, userId);
  }
}

module.exports = LibraryService;
