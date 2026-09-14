/**
 * Library Controller
 * HTTP request handlers for Library API endpoints.
 */

const { db } = require('../../config/database');
const LibraryRepository = require('./library.repository');
const LibraryService = require('./library.service');
const {
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
} = require('./library.validation');

const repository = new LibraryRepository(db);
const service = new LibraryService(repository);

// Helper to extract schoolId and userId from request
function getContext(req) {
  const userId = req.user?.sub || req.user?.id;
  const schoolId = req.user?.school_id || req.headers['x-school-id'] || null;
  return { userId, schoolId };
}

// ==========================================
// 1. SETTINGS & POLICIES
// ==========================================

async function getSettings(req, res, next) {
  try {
    const { schoolId } = getContext(req);
    const settings = await service.getSettings(schoolId);
    res.json({
      success: true,
      message: 'Library settings retrieved successfully',
      data: settings,
    });
  } catch (error) {
    next(error);
  }
}

async function updateSettings(req, res, next) {
  try {
    const { schoolId, userId } = getContext(req);
    const errors = validateLibrarySettings(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(', '), data: errors });
    }
    const updated = await service.updateSettings(req.body, schoolId, userId);
    res.json({
      success: true,
      message: 'Library settings updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// 2. CATEGORIES, SUBJECTS, AUTHORS, PUBLISHERS
// ==========================================

async function listCategories(req, res, next) {
  try {
    const { schoolId } = getContext(req);
    const categories = await service.listCategories(schoolId);
    res.json({ success: true, message: 'Categories retrieved', data: categories });
  } catch (error) {
    next(error);
  }
}

async function createCategory(req, res, next) {
  try {
    const { schoolId } = getContext(req);
    const errors = validateCategory(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(', '), data: errors });
    }
    const category = await service.createCategory(req.body, schoolId);
    res.status(201).json({ success: true, message: 'Category created', data: category });
  } catch (error) {
    next(error);
  }
}

async function updateCategory(req, res, next) {
  try {
    const errors = validateCategory(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(', '), data: errors });
    }
    const category = await service.updateCategory(req.params.id, req.body);
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    res.json({ success: true, message: 'Category updated', data: category });
  } catch (error) {
    next(error);
  }
}

async function deleteCategory(req, res, next) {
  try {
    const deleted = await service.deleteCategory(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Category not found' });
    res.json({ success: true, message: 'Category deleted' });
  } catch (error) {
    next(error);
  }
}

async function listSubjects(req, res, next) {
  try {
    const { schoolId } = getContext(req);
    const subjects = await service.listSubjects(schoolId);
    res.json({ success: true, message: 'Subjects retrieved', data: subjects });
  } catch (error) {
    next(error);
  }
}

async function createSubject(req, res, next) {
  try {
    const { schoolId } = getContext(req);
    const errors = validateSubject(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(', '), data: errors });
    }
    const subject = await service.createSubject(req.body, schoolId);
    res.status(201).json({ success: true, message: 'Subject created', data: subject });
  } catch (error) {
    next(error);
  }
}

async function updateSubject(req, res, next) {
  try {
    const errors = validateSubject(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(', '), data: errors });
    }
    const subject = await service.updateSubject(req.params.id, req.body);
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found' });
    res.json({ success: true, message: 'Subject updated', data: subject });
  } catch (error) {
    next(error);
  }
}

async function deleteSubject(req, res, next) {
  try {
    const deleted = await service.deleteSubject(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Subject not found' });
    res.json({ success: true, message: 'Subject deleted' });
  } catch (error) {
    next(error);
  }
}

async function listAuthors(req, res, next) {
  try {
    const { schoolId } = getContext(req);
    const authors = await service.listAuthors(schoolId);
    res.json({ success: true, message: 'Authors retrieved', data: authors });
  } catch (error) {
    next(error);
  }
}

async function createAuthor(req, res, next) {
  try {
    const { schoolId } = getContext(req);
    const errors = validateAuthor(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(', '), data: errors });
    }
    const author = await service.createAuthor(req.body, schoolId);
    res.status(201).json({ success: true, message: 'Author created', data: author });
  } catch (error) {
    next(error);
  }
}

async function updateAuthor(req, res, next) {
  try {
    const errors = validateAuthor(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(', '), data: errors });
    }
    const author = await service.updateAuthor(req.params.id, req.body);
    if (!author) return res.status(404).json({ success: false, message: 'Author not found' });
    res.json({ success: true, message: 'Author updated', data: author });
  } catch (error) {
    next(error);
  }
}

async function deleteAuthor(req, res, next) {
  try {
    const deleted = await service.deleteAuthor(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Author not found' });
    res.json({ success: true, message: 'Author deleted' });
  } catch (error) {
    next(error);
  }
}

async function listPublishers(req, res, next) {
  try {
    const { schoolId } = getContext(req);
    const publishers = await service.listPublishers(schoolId);
    res.json({ success: true, message: 'Publishers retrieved', data: publishers });
  } catch (error) {
    next(error);
  }
}

async function createPublisher(req, res, next) {
  try {
    const { schoolId } = getContext(req);
    const errors = validatePublisher(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(', '), data: errors });
    }
    const publisher = await service.createPublisher(req.body, schoolId);
    res.status(201).json({ success: true, message: 'Publisher created', data: publisher });
  } catch (error) {
    next(error);
  }
}

async function updatePublisher(req, res, next) {
  try {
    const errors = validatePublisher(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(', '), data: errors });
    }
    const publisher = await service.updatePublisher(req.params.id, req.body);
    if (!publisher) return res.status(404).json({ success: false, message: 'Publisher not found' });
    res.json({ success: true, message: 'Publisher updated', data: publisher });
  } catch (error) {
    next(error);
  }
}

async function deletePublisher(req, res, next) {
  try {
    const deleted = await service.deletePublisher(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Publisher not found' });
    res.json({ success: true, message: 'Publisher deleted' });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// 3. BOOKS & COPIES CATALOG
// ==========================================

async function listBooks(req, res, next) {
  try {
    const { schoolId } = getContext(req);
    const { search, categoryId, subjectId, authorId, availability, limit, offset } = req.query;
    const books = await service.listBooks({
      search,
      categoryId,
      subjectId,
      authorId,
      availability,
      schoolId,
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
    });
    res.json({ success: true, message: 'Books retrieved', data: books });
  } catch (error) {
    next(error);
  }
}

async function getBookById(req, res, next) {
  try {
    const book = await service.getBookById(req.params.id);
    res.json({ success: true, message: 'Book retrieved', data: book });
  } catch (error) {
    next(error);
  }
}

async function createBook(req, res, next) {
  try {
    const { schoolId } = getContext(req);
    const errors = validateBook(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(', '), data: errors });
    }
    const { author_ids, initial_copies, ...bookData } = req.body;
    const book = await service.createBook(bookData, author_ids || [], schoolId);

    // If initial_copies was provided, generate bulk copies
    if (initial_copies && Number(initial_copies) > 0) {
      await service.createBulkCopies(
        {
          book_id: book.id,
          quantity: Number(initial_copies),
          accession_prefix: req.body.accession_prefix || 'LIB',
          call_number: req.body.call_number || null,
          condition: req.body.condition || 'EXCELLENT',
          price: req.body.price || null,
        },
        schoolId
      );
    }

    const fullBook = await service.getBookById(book.id);
    res.status(201).json({ success: true, message: 'Book created successfully', data: fullBook });
  } catch (error) {
    next(error);
  }
}

async function updateBook(req, res, next) {
  try {
    const errors = validateBook(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(', '), data: errors });
    }
    const { author_ids, ...bookData } = req.body;
    const book = await service.updateBook(req.params.id, bookData, author_ids);
    res.json({ success: true, message: 'Book updated successfully', data: book });
  } catch (error) {
    next(error);
  }
}

async function deleteBook(req, res, next) {
  try {
    const deleted = await service.deleteBook(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Book not found' });
    res.json({ success: true, message: 'Book deleted successfully' });
  } catch (error) {
    next(error);
  }
}

async function listCopiesByBook(req, res, next) {
  try {
    const copies = await service.listCopiesByBook(req.params.bookId);
    res.json({ success: true, message: 'Copies retrieved', data: copies });
  } catch (error) {
    next(error);
  }
}

async function findCopyByBarcode(req, res, next) {
  try {
    const { schoolId } = getContext(req);
    const copy = await service.findCopyByAccessionOrBarcode(req.params.identifier, schoolId);
    if (!copy) {
      return res.status(404).json({ success: false, message: 'Book copy not found' });
    }
    res.json({ success: true, message: 'Copy found', data: copy });
  } catch (error) {
    next(error);
  }
}

async function createBookCopy(req, res, next) {
  try {
    const { schoolId } = getContext(req);
    const errors = validateBookCopy(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(', '), data: errors });
    }
    const copy = await service.createBookCopy(req.body, schoolId);
    res.status(201).json({ success: true, message: 'Copy added', data: copy });
  } catch (error) {
    next(error);
  }
}

async function createBulkCopies(req, res, next) {
  try {
    const { schoolId } = getContext(req);
    const errors = validateBulkCopies(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(', '), data: errors });
    }
    const copies = await service.createBulkCopies(req.body, schoolId);
    res.status(201).json({ success: true, message: `${copies.length} copies generated successfully`, data: copies });
  } catch (error) {
    next(error);
  }
}

async function updateCopy(req, res, next) {
  try {
    const copy = await service.updateCopy(req.params.id, req.body);
    res.json({ success: true, message: 'Copy updated', data: copy });
  } catch (error) {
    next(error);
  }
}

async function deleteCopy(req, res, next) {
  try {
    const deleted = await service.deleteCopy(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Copy not found' });
    res.json({ success: true, message: 'Copy deleted' });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// 4. MEMBERS
// ==========================================

async function listMembers(req, res, next) {
  try {
    const { schoolId } = getContext(req);
    const { search, memberType, status, limit, offset } = req.query;
    const members = await service.listMembers({
      search,
      memberType,
      status,
      schoolId,
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
    });
    res.json({ success: true, message: 'Members retrieved', data: members });
  } catch (error) {
    next(error);
  }
}

async function getMemberById(req, res, next) {
  try {
    const member = await service.findMemberById(req.params.id);
    res.json({ success: true, message: 'Member retrieved', data: member });
  } catch (error) {
    next(error);
  }
}

async function getMyMemberProfile(req, res, next) {
  try {
    const { userId, schoolId } = getContext(req);
    const member = await service.findMemberByUserId(userId, schoolId);
    res.json({ success: true, message: 'Member profile retrieved', data: member });
  } catch (error) {
    next(error);
  }
}

async function syncMembers(req, res, next) {
  try {
    const { schoolId } = getContext(req);
    const count = await service.syncAllEligibleUsers(schoolId);
    res.json({ success: true, message: `Synced ${count} new library members`, data: { count } });
  } catch (error) {
    next(error);
  }
}

async function updateMemberStatus(req, res, next) {
  try {
    const { status, notes } = req.body;
    if (!status) return res.status(400).json({ success: false, message: 'Status is required' });
    const member = await service.updateMemberStatus(req.params.id, status, notes);
    res.json({ success: true, message: 'Member status updated', data: member });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// 5. CIRCULATION (ISSUE, RETURN, RENEW, LOANS)
// ==========================================

async function issueLoan(req, res, next) {
  try {
    const { schoolId, userId } = getContext(req);
    const policy = await service.getSettings(schoolId);
    const errors = validateLoanIssue(req.body, policy);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(', '), data: errors });
    }
    const loan = await service.issueLoan({
      ...req.body,
      issuedByUserId: userId,
      schoolId,
    });
    res.status(201).json({ success: true, message: 'Book issued successfully', data: loan });
  } catch (error) {
    next(error);
  }
}

async function returnLoan(req, res, next) {
  try {
    const { schoolId, userId } = getContext(req);
    const errors = validateLoanReturn(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(', '), data: errors });
    }
    const result = await service.returnLoan({
      loanId: req.params.id,
      receivedByUserId: userId,
      conditionOnReturn: req.body.condition_on_return || 'GOOD',
      returnNotes: req.body.return_notes || null,
      damageFineAmount: req.body.damage_fine_amount || 0,
      schoolId,
    });
    res.json({
      success: true,
      message: result.overdueFineAmount > 0
        ? `Book returned with an overdue fine of ${result.overdueFineAmount} assessed`
        : 'Book returned successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function renewLoan(req, res, next) {
  try {
    const { schoolId, userId } = getContext(req);
    const loan = await service.renewLoan({
      loanId: req.params.id,
      renewedByUserId: userId,
      renewalDays: req.body.renewal_days,
      schoolId,
    });
    res.json({ success: true, message: 'Loan renewed successfully', data: loan });
  } catch (error) {
    next(error);
  }
}

async function listLoans(req, res, next) {
  try {
    const { schoolId } = getContext(req);
    const { search, status, memberId, bookId, copyId, isOverdue, limit, offset } = req.query;
    const loans = await service.listLoans({
      search,
      status,
      memberId,
      bookId,
      copyId,
      isOverdue,
      schoolId,
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
    });
    res.json({ success: true, message: 'Loans retrieved', data: loans });
  } catch (error) {
    next(error);
  }
}

async function getLoanById(req, res, next) {
  try {
    const loan = await service.getLoanById(req.params.id);
    res.json({ success: true, message: 'Loan retrieved', data: loan });
  } catch (error) {
    next(error);
  }
}

async function getMyLoans(req, res, next) {
  try {
    const { userId } = getContext(req);
    const loans = await service.getMyLoans(userId);
    res.json({ success: true, message: 'Your loans retrieved', data: loans });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// 6. RESERVATIONS
// ==========================================

async function listReservations(req, res, next) {
  try {
    const { schoolId } = getContext(req);
    const { bookId, memberId, status, limit, offset } = req.query;
    const reservations = await service.listReservations({
      bookId,
      memberId,
      status,
      schoolId,
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
    });
    res.json({ success: true, message: 'Reservations retrieved', data: reservations });
  } catch (error) {
    next(error);
  }
}

async function createReservation(req, res, next) {
  try {
    const { schoolId, userId } = getContext(req);
    const errors = validateReservation(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(', '), data: errors });
    }
    const reservation = await service.createReservation({
      book_id: req.body.book_id,
      member_id: req.body.member_id,
      user_id: userId,
      notes: req.body.notes,
      schoolId,
    });
    res.status(201).json({ success: true, message: 'Reservation placed successfully', data: reservation });
  } catch (error) {
    next(error);
  }
}

async function cancelReservation(req, res, next) {
  try {
    const { userId } = getContext(req);
    const cancelled = await service.cancelReservation(req.params.id, userId);
    res.json({ success: true, message: 'Reservation cancelled', data: cancelled });
  } catch (error) {
    next(error);
  }
}

async function getMyReservations(req, res, next) {
  try {
    const { userId } = getContext(req);
    const reservations = await service.getMyReservations(userId);
    res.json({ success: true, message: 'Your reservations retrieved', data: reservations });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// 7. FINES & PAYMENTS & WAIVERS
// ==========================================

async function listFines(req, res, next) {
  try {
    const { schoolId } = getContext(req);
    const { search, status, memberId, limit, offset } = req.query;
    const fines = await service.listFines({
      search,
      status,
      memberId,
      schoolId,
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
    });
    res.json({ success: true, message: 'Fines retrieved', data: fines });
  } catch (error) {
    next(error);
  }
}

async function recordFinePayment(req, res, next) {
  try {
    const { schoolId, userId } = getContext(req);
    const errors = validateFinePayment(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(', '), data: errors });
    }
    const payment = await service.recordFinePayment(req.body, userId, schoolId);
    res.status(201).json({ success: true, message: 'Payment recorded successfully', data: payment });
  } catch (error) {
    next(error);
  }
}

async function waiveFine(req, res, next) {
  try {
    const { schoolId, userId } = getContext(req);
    const errors = validateFineWaiver(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(', '), data: errors });
    }
    await service.waiveFine(req.body, userId, schoolId);
    res.json({ success: true, message: 'Fine waived successfully' });
  } catch (error) {
    next(error);
  }
}

async function getMyFines(req, res, next) {
  try {
    const { userId } = getContext(req);
    const fines = await service.getMyFines(userId);
    res.json({ success: true, message: 'Your fines retrieved', data: fines });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// 8. REPORTS & AUDIT LOGS
// ==========================================

async function getDashboardStats(req, res, next) {
  try {
    const { schoolId } = getContext(req);
    const stats = await service.getLibraryDashboardStats(schoolId);
    res.json({ success: true, message: 'Stats retrieved', data: stats });
  } catch (error) {
    next(error);
  }
}

async function getTopBooks(req, res, next) {
  try {
    const { schoolId } = getContext(req);
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    const topBooks = await service.getTopBorrowedBooks(schoolId, limit);
    res.json({ success: true, message: 'Top books retrieved', data: topBooks });
  } catch (error) {
    next(error);
  }
}

async function listAuditLogs(req, res, next) {
  try {
    const { schoolId } = getContext(req);
    const { action, entityType, userId, limit, offset } = req.query;
    const logs = await service.listAuditLogs({
      action,
      entityType,
      userId,
      schoolId,
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
    });
    res.json({ success: true, message: 'Audit logs retrieved', data: logs });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getSettings,
  updateSettings,
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  listSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  listAuthors,
  createAuthor,
  updateAuthor,
  deleteAuthor,
  listPublishers,
  createPublisher,
  updatePublisher,
  deletePublisher,
  listBooks,
  getBookById,
  createBook,
  updateBook,
  deleteBook,
  listCopiesByBook,
  findCopyByBarcode,
  createBookCopy,
  createBulkCopies,
  updateCopy,
  deleteCopy,
  listMembers,
  getMemberById,
  getMyMemberProfile,
  syncMembers,
  updateMemberStatus,
  issueLoan,
  returnLoan,
  renewLoan,
  listLoans,
  getLoanById,
  getMyLoans,
  listReservations,
  createReservation,
  cancelReservation,
  getMyReservations,
  listFines,
  recordFinePayment,
  waiveFine,
  getMyFines,
  getDashboardStats,
  getTopBooks,
  listAuditLogs,
};
