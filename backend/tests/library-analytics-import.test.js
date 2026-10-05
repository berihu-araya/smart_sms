/**
 * Library Module Analytics & Bulk Import Test Suite
 */

const { db } = require('../src/config/database');
const LibraryRepository = require('../src/modules/library/library.repository');
const LibraryService = require('../src/modules/library/library.service');

async function runTests() {
  console.log('--- STARTING LIBRARY ANALYTICS & BULK IMPORT TESTS ---');
  const repository = new LibraryRepository(db);
  const service = new LibraryService(repository);

  try {
    // 1. Test Detailed Analytics
    console.log('\n[1] Testing Detailed Analytics API...');
    const analytics = await service.getDetailedAnalytics();
    console.log('✓ Analytics overview KPIs:', {
      total_titles: analytics.overview.total_titles,
      total_copies: analytics.overview.total_copies,
      active_loans: analytics.overview.active_loans,
      overdue_loans: analytics.overview.overdue_loans,
      punctuality_rate: `${analytics.overview.punctuality_rate}%`,
      catalog_utilization: `${analytics.overview.catalog_utilization}%`,
      total_fines_collected: analytics.overview.total_fines_collected,
    });
    console.log('✓ Top borrowed books count:', analytics.top_books.length);
    console.log('✓ Overdue aging distribution:', analytics.overdue_aging);
    console.log('✓ Circulation monthly trends count:', analytics.circulation_trends.length);
    console.log('✓ Active patrons count:', analytics.active_patrons.length);
    console.log('✓ Category distribution count:', analytics.category_distribution.length);

    // 2. Test Bulk Book Import
    console.log('\n[2] Testing Bulk Books Import...');
    const sampleBooks = [
      {
        title: 'Deep Learning with Python (2nd Ed)',
        isbn: `978-${Date.now().toString().slice(-9)}`,
        category_name: 'Computer Science',
        subject_name: 'Machine Learning',
        publisher_name: 'Manning Publications',
        authors: ['François Chollet'],
        publication_year: 2021,
        language: 'English',
        shelf_location: 'Shelf CS-04',
        initial_copies: 2,
        cover_image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400',
        description: 'Comprehensive guide to deep learning using Python and Keras.',
      },
      {
        title: 'Design Patterns: Elements of Reusable Object-Oriented Software',
        isbn: `978-${(Date.now() + 1).toString().slice(-9)}`,
        category_name: 'Software Engineering',
        subject_name: 'Architecture',
        publisher_name: 'Addison-Wesley',
        authors: ['Erich Gamma', 'Richard Helm', 'Ralph Johnson', 'John Vlissides'],
        publication_year: 1994,
        language: 'English',
        shelf_location: 'Shelf SE-01',
        initial_copies: 3,
        cover_image: 'https://images.unsplash.com/photo-1532012164546-f432f2e3777a?w=400',
        description: 'Classic Gang of Four design patterns guide.',
      },
    ];

    const bookImportResult = await service.importBooksBatch(sampleBooks);
    console.log('✓ Bulk Books Import succeeded:', {
      imported_count: bookImportResult.imported_count,
      errors: bookImportResult.errors,
      first_book_title: bookImportResult.books[0]?.title,
    });

    if (bookImportResult.imported_count !== 2) {
      throw new Error(`Expected 2 books imported, got ${bookImportResult.imported_count}`);
    }

    // 3. Test Bulk Copy Import
    console.log('\n[3] Testing Bulk Copies Import...');
    const createdBook = bookImportResult.books[0];
    const sampleCopies = [
      {
        book_id: createdBook.id,
        accession_number: `ACC-TEST-${Date.now().toString().slice(-4)}-1`,
        barcode: `BC-TEST-${Date.now().toString().slice(-4)}-1`,
        condition: 'NEW',
        status: 'AVAILABLE',
        shelf_location: 'Shelf CS-04',
        acquisition_price: 59.99,
      },
      {
        isbn: sampleBooks[1].isbn,
        accession_number: `ACC-TEST-${Date.now().toString().slice(-4)}-2`,
        barcode: `BC-TEST-${Date.now().toString().slice(-4)}-2`,
        condition: 'GOOD',
        status: 'AVAILABLE',
        shelf_location: 'Shelf SE-01',
        acquisition_price: 49.99,
      },
    ];

    const copyImportResult = await service.importCopiesBatch(sampleCopies);
    console.log('✓ Bulk Copies Import succeeded:', {
      imported_count: copyImportResult.imported_count,
      errors: copyImportResult.errors,
    });

    if (copyImportResult.imported_count !== 2) {
      throw new Error(`Expected 2 copies imported, got ${copyImportResult.imported_count}`);
    }

    // 4. Test Bulk Member Import
    console.log('\n[4] Testing Bulk Members Import...');
    // Find an existing user in the database
    const userRes = await db.query('SELECT email FROM users WHERE deleted_at IS NULL LIMIT 2');
    if (userRes.rows.length > 0) {
      const sampleMembers = userRes.rows.map((u, idx) => ({
        email: u.email,
        member_number: `MEMB-TEST-${Date.now().toString().slice(-4)}-${idx + 1}`,
        max_books_allowed: 5,
        status: 'ACTIVE',
      }));

      const memberImportResult = await service.importMembersBatch(sampleMembers);
      console.log('✓ Bulk Members Import succeeded:', {
        imported_count: memberImportResult.imported_count,
        errors: memberImportResult.errors,
      });
    }

    console.log('\n🎉 ALL LIBRARY ANALYTICS & BULK IMPORT TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('\n❌ TEST FAILED:', err);
    process.exitCode = 1;
  } finally {
    await db.end();
  }
}

runTests();
