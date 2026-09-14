const express = require('express');
const authMiddleware = require('../../middlewares/auth.middleware');
const authorizeRoles = require('../../middlewares/role.middleware');
const {
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
} = require('./library.controller');

const router = express.Router();

router.use(authMiddleware);

// Roles definitions
const LIBRARIAN_ROLES = ['School Admin', 'Admin', 'Librarian'];
const STAFF_AND_LIBRARIAN = ['School Admin', 'Admin', 'Librarian', 'Staff'];

// 1. SETTINGS / POLICIES
router.get('/config', getSettings);
router.put('/config', authorizeRoles(...LIBRARIAN_ROLES), updateSettings);

// 2. STATS & REPORTS
router.get('/stats', authorizeRoles(...STAFF_AND_LIBRARIAN), getDashboardStats);
router.get('/reports/top-books', authorizeRoles(...STAFF_AND_LIBRARIAN), getTopBooks);
router.get('/audit', authorizeRoles(...LIBRARIAN_ROLES), listAuditLogs);

// 3. MASTER DATA (Categories, Subjects, Authors, Publishers)
router.get('/categories', listCategories);
router.post('/categories', authorizeRoles(...STAFF_AND_LIBRARIAN), createCategory);
router.put('/categories/:id', authorizeRoles(...STAFF_AND_LIBRARIAN), updateCategory);
router.delete('/categories/:id', authorizeRoles(...LIBRARIAN_ROLES), deleteCategory);

router.get('/subjects', listSubjects);
router.post('/subjects', authorizeRoles(...STAFF_AND_LIBRARIAN), createSubject);
router.put('/subjects/:id', authorizeRoles(...STAFF_AND_LIBRARIAN), updateSubject);
router.delete('/subjects/:id', authorizeRoles(...LIBRARIAN_ROLES), deleteSubject);

router.get('/authors', listAuthors);
router.post('/authors', authorizeRoles(...STAFF_AND_LIBRARIAN), createAuthor);
router.put('/authors/:id', authorizeRoles(...STAFF_AND_LIBRARIAN), updateAuthor);
router.delete('/authors/:id', authorizeRoles(...LIBRARIAN_ROLES), deleteAuthor);

router.get('/publishers', listPublishers);
router.post('/publishers', authorizeRoles(...STAFF_AND_LIBRARIAN), createPublisher);
router.put('/publishers/:id', authorizeRoles(...STAFF_AND_LIBRARIAN), updatePublisher);
router.delete('/publishers/:id', authorizeRoles(...LIBRARIAN_ROLES), deletePublisher);

// 4. BOOKS & COPIES CATALOG
router.get('/books', listBooks);
router.get('/books/:id', getBookById);
router.post('/books', authorizeRoles(...LIBRARIAN_ROLES), createBook);
router.put('/books/:id', authorizeRoles(...LIBRARIAN_ROLES), updateBook);
router.delete('/books/:id', authorizeRoles(...LIBRARIAN_ROLES), deleteBook);

router.get('/books/:bookId/copies', listCopiesByBook);
router.get('/copies/barcode/:identifier', findCopyByBarcode);
router.post('/copies', authorizeRoles(...LIBRARIAN_ROLES), createBookCopy);
router.post('/copies/bulk', authorizeRoles(...LIBRARIAN_ROLES), createBulkCopies);
router.put('/copies/:id', authorizeRoles(...LIBRARIAN_ROLES), updateCopy);
router.delete('/copies/:id', authorizeRoles(...LIBRARIAN_ROLES), deleteCopy);

// 5. MEMBERS
router.get('/members/me', getMyMemberProfile);
router.get('/members', authorizeRoles(...STAFF_AND_LIBRARIAN), listMembers);
router.get('/members/:id', authorizeRoles(...STAFF_AND_LIBRARIAN), getMemberById);
router.post('/members/sync', authorizeRoles(...LIBRARIAN_ROLES), syncMembers);
router.patch('/members/:id/status', authorizeRoles(...LIBRARIAN_ROLES), updateMemberStatus);

// 6. CIRCULATION (Loans, Returns, Renewals)
router.get('/loans/my-loans', getMyLoans);
router.get('/loans', authorizeRoles(...STAFF_AND_LIBRARIAN), listLoans);
router.get('/loans/:id', authorizeRoles(...STAFF_AND_LIBRARIAN), getLoanById);
router.post('/loans/issue', authorizeRoles(...STAFF_AND_LIBRARIAN), issueLoan);
router.post('/loans/:id/return', authorizeRoles(...STAFF_AND_LIBRARIAN), returnLoan);
router.post('/loans/:id/renew', renewLoan); // Can be triggered by borrower or librarian

// 7. RESERVATIONS
router.get('/reservations/my-reservations', getMyReservations);
router.get('/reservations', authorizeRoles(...STAFF_AND_LIBRARIAN), listReservations);
router.post('/reservations', createReservation);
router.delete('/reservations/:id', cancelReservation);

// 8. FINES & PAYMENTS & WAIVERS
router.get('/fines/my-fines', getMyFines);
router.get('/fines', authorizeRoles(...STAFF_AND_LIBRARIAN), listFines);
router.post('/fines/pay', authorizeRoles(...STAFF_AND_LIBRARIAN), recordFinePayment);
router.post('/fines/waive', authorizeRoles(...LIBRARIAN_ROLES), waiveFine);

module.exports = router;
