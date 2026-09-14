/**
 * Library Module End-to-End Integration & Unit Test Suite
 */

const { db } = require('../src/config/database');
const LibraryRepository = require('../src/modules/library/library.repository');
const LibraryService = require('../src/modules/library/library.service');

async function runTests() {
  console.log('--- STARTING LIBRARY MODULE TESTS ---');
  const repository = new LibraryRepository(db);
  const service = new LibraryService(repository);

  try {
    // 1. Test Policy Settings
    console.log('\n[1] Testing Library Settings / Policy...');
    const settings = await service.getSettings();
    console.log('✓ Default settings fetched:', {
      name: settings.library_name,
      student_period: settings.default_student_loan_period,
      teacher_period: settings.default_teacher_loan_period,
      fine_rate: settings.fine_per_overdue_day,
      max_renewals: settings.max_renewal_count,
    });

    const updatedSettings = await service.updateSettings({
      library_name: 'Smart SMS Modern Library',
      fine_per_overdue_day: 2.50,
      default_student_loan_period: 15,
    });
    console.log('✓ Settings updated successfully:', {
      name: updatedSettings.library_name,
      fine_rate: updatedSettings.fine_per_overdue_day,
      student_period: updatedSettings.default_student_loan_period,
    });

    // 2. Test Master Data
    console.log('\n[2] Testing Master Data CRUD...');
    const category = await service.createCategory({
      name: 'Advanced STEM & Robotics',
      code: 'STEM-ROB',
      description: 'Robotics and engineering',
    });
    console.log('✓ Category created:', category.name);

    const subject = await service.createSubject({
      name: 'Artificial Intelligence',
      code: 'AI-101',
      description: 'Machine Learning and AI algorithms',
    });
    console.log('✓ Subject created:', subject.name);

    const author = await service.createAuthor({
      name: 'Alan Turing',
      biography: 'Father of modern computing',
    });
    console.log('✓ Author created:', author.name);

    const publisher = await service.createPublisher({
      name: 'MIT Press',
      contact_email: 'info@mitpress.edu',
    });
    console.log('✓ Publisher created:', publisher.name);

    // 3. Test Book Catalog & Bulk Copies
    console.log('\n[3] Testing Book Creation & Copy Generation...');
    const book = await service.createBook(
      {
        title: 'Introduction to Artificial Intelligence & Neural Networks',
        isbn: '978-0262033848',
        edition: '3rd Edition',
        category_id: category.id,
        subject_id: subject.id,
        publisher_id: publisher.id,
        publication_year: 2024,
        pages: 680,
        shelf_location: 'Aisle 2, Shelf D',
        description: 'Comprehensive guide to AI systems and architectures.',
      },
      [author.id]
    );
    console.log('✓ Book created:', book.title, 'with ID:', book.id);

    // Generate 3 copies
    const copies = await service.createBulkCopies({
      book_id: book.id,
      quantity: 3,
      accession_prefix: 'LIB-TEST',
      condition: 'EXCELLENT',
      price: 45.00,
    });
    console.log('✓ 3 Copies generated with barcodes:', copies.map((c) => c.accession_number));

    const bookWithCopies = await service.getBookById(book.id);
    console.log('✓ Book copy counters:', {
      total: bookWithCopies.total_copies_count,
      available: bookWithCopies.available_copies_count,
    });

    // 4. Test Member Sync & Member Retrieval
    console.log('\n[4] Testing Member Sync & Directory...');
    // Find an existing user or create a temporary one for testing
    const usersRes = await db.query(
      `SELECT u.id, u.email, r.name AS role_name FROM users u LEFT JOIN roles r ON r.id = u.role_id WHERE u.deleted_at IS NULL LIMIT 2`
    );
    if (usersRes.rows.length === 0) {
      throw new Error('No users found in database for member sync test');
    }
    const testUser = usersRes.rows[0];
    const testMember = await service.findMemberByUserId(testUser.id);
    console.log('✓ Member synced/retrieved:', {
      id: testMember.id,
      member_number: testMember.member_number,
      name: testMember.full_name,
      role: testMember.role_name,
      type: testMember.member_type,
    });

    // 5. Test Issue Loan with Digital Signature
    console.log('\n[5] Testing Book Issue with Digital Signature...');
    const copyToBorrow = copies[0];
    const loan = await service.issueLoan({
      copyId: copyToBorrow.id,
      memberId: testMember.id,
      loanDurationDays: 14,
      conditionOnIssue: 'EXCELLENT',
      borrowerAcknowledgmentType: 'SIGNATURE',
      borrowerSignature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
      issueNotes: 'Testing automated issue flow',
      issuedByUserId: testUser.id,
    });
    console.log('✓ Loan issued successfully:', {
      loan_id: loan.id,
      book: loan.book_title,
      borrower: loan.member_name,
      due_date: loan.due_date,
      signature: loan.borrower_signature ? 'Present' : 'None',
    });

    // Verify copy is now BORROWED
    const copyAfterBorrow = await service.findCopyByAccessionOrBarcode(copyToBorrow.accession_number);
    console.log('✓ Copy status after issue:', copyAfterBorrow.status);
    if (copyAfterBorrow.status !== 'BORROWED') {
      throw new Error('Copy status was not set to BORROWED');
    }

    // 6. Test Loan Renewal
    console.log('\n[6] Testing Loan Renewal...');
    const renewedLoan = await service.renewLoan({
      loanId: loan.id,
      renewedByUserId: testUser.id,
      renewalDays: 10,
    });
    console.log('✓ Loan renewed successfully:', {
      renewal_count: renewedLoan.renewal_count,
      new_due_date: renewedLoan.due_date,
    });

    // 7. Test Return Loan
    console.log('\n[7] Testing Book Return...');
    const returnResult = await service.returnLoan({
      loanId: loan.id,
      receivedByUserId: testUser.id,
      conditionOnReturn: 'GOOD',
      returnNotes: 'Returned in good order',
    });
    console.log('✓ Loan returned successfully. Status:', returnResult.loan.status);

    const copyAfterReturn = await service.findCopyByAccessionOrBarcode(copyToBorrow.accession_number);
    console.log('✓ Copy status after return:', copyAfterReturn.status);
    if (copyAfterReturn.status !== 'AVAILABLE') {
      throw new Error('Copy status was not reset to AVAILABLE');
    }

    // 8. Test Overdue Fine Assessment & Payment
    console.log('\n[8] Testing Overdue Fine Assessment & Payment...');
    // Simulate an overdue loan by issuing another copy and backdating due date
    const secondCopy = copies[1];
    const secondLoan = await service.issueLoan({
      copyId: secondCopy.id,
      memberId: testMember.id,
      loanDurationDays: 1,
      borrowerAcknowledgmentType: 'DIGITAL_ACK',
      borrowerSignature: 'E-ACK-CONFIRMED',
      issuedByUserId: testUser.id,
    });

    // Backdate due date by 5 days
    await db.query(
      `UPDATE library_loans SET due_date = current_timestamp - interval '5 days' WHERE id = $1`,
      [secondLoan.id]
    );

    // Return the overdue loan
    const overdueReturn = await service.returnLoan({
      loanId: secondLoan.id,
      receivedByUserId: testUser.id,
      conditionOnReturn: 'GOOD',
    });
    console.log('✓ Overdue return processed:', {
      overdue_days: overdueReturn.overdueDays,
      fine_assessed: overdueReturn.overdueFineAmount,
    });

    if (overdueReturn.fine) {
      console.log('✓ Recording fine payment...');
      const payment = await service.recordFinePayment(
        {
          fineId: overdueReturn.fine.id,
          amount: overdueReturn.overdueFineAmount,
          payment_method: 'CASH',
          reference_number: 'TXN-TEST-123',
          notes: 'Cash payment at circulation desk',
        },
        testUser.id
      );
      console.log('✓ Fine payment recorded:', {
        receipt_number: payment.receipt_number,
        amount: payment.amount,
        method: payment.payment_method,
      });
    }

    // 9. Test Reservations
    console.log('\n[9] Testing Book Reservations...');
    const reservation = await service.createReservation({
      book_id: book.id,
      member_id: testMember.id,
      notes: 'Please hold for AI project research',
    });
    console.log('✓ Reservation placed:', {
      id: reservation.id,
      priority: reservation.priority,
      status: reservation.status,
    });

    await service.cancelReservation(reservation.id, testUser.id);
    console.log('✓ Reservation cancelled successfully');

    // 10. Test Audit Logs
    console.log('\n[10] Testing Audit Logs...');
    const auditLogs = await service.listAuditLogs({ limit: 5 });
    console.log('✓ Audit logs count:', auditLogs.length);
    console.log(
      '✓ Recent actions recorded:',
      auditLogs.map((l) => `${l.action} on ${l.entity_type} by ${l.user_name || 'System'}`)
    );

    console.log('\n🎉 ALL LIBRARY INTEGRATION TESTS PASSED SUCCESSFULLY! 🎉\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ TEST FAILED:', err);
    process.exit(1);
  }
}

runTests();
