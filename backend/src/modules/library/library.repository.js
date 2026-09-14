/**
 * Library Repository
 * High-performance PostgreSQL data access layer for Smart SMS Library Module.
 */

class LibraryRepository {
  constructor(database) {
    this.db = database;
  }

  // ==========================================
  // 1. SETTINGS / POLICIES
  // ==========================================

  async getSettings(schoolId = null) {
    let query = `
      SELECT * FROM library_settings 
      WHERE (school_id = $1 OR ($1 IS NULL AND school_id IS NULL))
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    const res = await this.db.query(query, [schoolId]);
    if (res.rows.length > 0) {
      return res.rows[0];
    }
    // Fallback to global default row
    const fallbackRes = await this.db.query(`SELECT * FROM library_settings ORDER BY created_at ASC LIMIT 1`);
    return fallbackRes.rows[0] || null;
  }

  async updateSettings(data, schoolId = null) {
    const current = await this.getSettings(schoolId);
    if (!current) {
      const insertQuery = `
        INSERT INTO library_settings (
          school_id, library_name, branch, opening_hours,
          max_active_loans_student, max_active_loans_teacher, max_active_loans_staff,
          default_student_loan_period, default_teacher_loan_period, default_staff_loan_period,
          max_loan_period, max_renewal_count, fine_per_overdue_day,
          allow_reservations, allow_renewals, allow_student_borrowing,
          allow_teacher_borrowing, allow_staff_borrowing, require_signature,
          require_librarian_approval, reservation_hold_period, max_outstanding_fine,
          updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22,
          current_timestamp
        ) RETURNING *
      `;
      const values = [
        schoolId,
        data.library_name || 'Central Library',
        data.branch || 'Main Campus',
        data.opening_hours || 'Mon-Fri 08:00 - 17:00',
        data.max_active_loans_student ?? 3,
        data.max_active_loans_teacher ?? 10,
        data.max_active_loans_staff ?? 5,
        data.default_student_loan_period ?? 14,
        data.default_teacher_loan_period ?? 30,
        data.default_staff_loan_period ?? 21,
        data.max_loan_period ?? 60,
        data.max_renewal_count ?? 2,
        data.fine_per_overdue_day ?? 2.00,
        data.allow_reservations ?? true,
        data.allow_renewals ?? true,
        data.allow_student_borrowing ?? true,
        data.allow_teacher_borrowing ?? true,
        data.allow_staff_borrowing ?? true,
        data.require_signature ?? true,
        data.require_librarian_approval ?? false,
        data.reservation_hold_period ?? 3,
        data.max_outstanding_fine ?? 50.00,
      ];
      const res = await this.db.query(insertQuery, values);
      return res.rows[0];
    }

    const updateQuery = `
      UPDATE library_settings SET
        library_name = COALESCE($1, library_name),
        branch = COALESCE($2, branch),
        opening_hours = COALESCE($3, opening_hours),
        max_active_loans_student = COALESCE($4, max_active_loans_student),
        max_active_loans_teacher = COALESCE($5, max_active_loans_teacher),
        max_active_loans_staff = COALESCE($6, max_active_loans_staff),
        default_student_loan_period = COALESCE($7, default_student_loan_period),
        default_teacher_loan_period = COALESCE($8, default_teacher_loan_period),
        default_staff_loan_period = COALESCE($9, default_staff_loan_period),
        max_loan_period = COALESCE($10, max_loan_period),
        max_renewal_count = COALESCE($11, max_renewal_count),
        fine_per_overdue_day = COALESCE($12, fine_per_overdue_day),
        allow_reservations = COALESCE($13, allow_reservations),
        allow_renewals = COALESCE($14, allow_renewals),
        allow_student_borrowing = COALESCE($15, allow_student_borrowing),
        allow_teacher_borrowing = COALESCE($16, allow_teacher_borrowing),
        allow_staff_borrowing = COALESCE($17, allow_staff_borrowing),
        require_signature = COALESCE($18, require_signature),
        require_librarian_approval = COALESCE($19, require_librarian_approval),
        reservation_hold_period = COALESCE($20, reservation_hold_period),
        max_outstanding_fine = COALESCE($21, max_outstanding_fine),
        updated_at = current_timestamp
      WHERE id = $22
      RETURNING *
    `;
    const values = [
      data.library_name,
      data.branch,
      data.opening_hours,
      data.max_active_loans_student,
      data.max_active_loans_teacher,
      data.max_active_loans_staff,
      data.default_student_loan_period,
      data.default_teacher_loan_period,
      data.default_staff_loan_period,
      data.max_loan_period,
      data.max_renewal_count,
      data.fine_per_overdue_day,
      data.allow_reservations,
      data.allow_renewals,
      data.allow_student_borrowing,
      data.allow_teacher_borrowing,
      data.allow_staff_borrowing,
      data.require_signature,
      data.require_librarian_approval,
      data.reservation_hold_period,
      data.max_outstanding_fine,
      current.id,
    ];
    const res = await this.db.query(updateQuery, values);
    return res.rows[0];
  }

  // ==========================================
  // 2. CATEGORIES
  // ==========================================

  async listCategories(schoolId = null) {
    const query = `
      SELECT c.*, 
        COUNT(b.id) FILTER (WHERE b.deleted_at IS NULL)::int AS book_count
      FROM library_categories c
      LEFT JOIN library_books b ON b.category_id = c.id
      WHERE (c.school_id = $1 OR c.school_id IS NULL) AND c.deleted_at IS NULL
      GROUP BY c.id
      ORDER BY c.name ASC
    `;
    const res = await this.db.query(query, [schoolId]);
    return res.rows;
  }

  async createCategory({ name, code, description, schoolId }) {
    const res = await this.db.query(
      `INSERT INTO library_categories (name, code, description, school_id) VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, code, description, schoolId]
    );
    return res.rows[0];
  }

  async updateCategory(id, { name, code, description }) {
    const res = await this.db.query(
      `UPDATE library_categories SET name = COALESCE($1, name), code = COALESCE($2, code), description = COALESCE($3, description), updated_at = current_timestamp WHERE id = $4 AND deleted_at IS NULL RETURNING *`,
      [name, code, description, id]
    );
    return res.rows[0] || null;
  }

  async deleteCategory(id) {
    const res = await this.db.query(
      `UPDATE library_categories SET deleted_at = current_timestamp WHERE id = $1 AND deleted_at IS NULL RETURNING id`,
      [id]
    );
    return res.rows.length > 0;
  }

  // ==========================================
  // 3. SUBJECTS
  // ==========================================

  async listSubjects(schoolId = null) {
    const query = `
      SELECT s.*, 
        COUNT(b.id) FILTER (WHERE b.deleted_at IS NULL)::int AS book_count
      FROM library_subjects s
      LEFT JOIN library_books b ON b.subject_id = s.id
      WHERE (s.school_id = $1 OR s.school_id IS NULL) AND s.deleted_at IS NULL
      GROUP BY s.id
      ORDER BY s.name ASC
    `;
    const res = await this.db.query(query, [schoolId]);
    return res.rows;
  }

  async createSubject({ name, code, description, schoolId }) {
    const res = await this.db.query(
      `INSERT INTO library_subjects (name, code, description, school_id) VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, code, description, schoolId]
    );
    return res.rows[0];
  }

  async updateSubject(id, { name, code, description }) {
    const res = await this.db.query(
      `UPDATE library_subjects SET name = COALESCE($1, name), code = COALESCE($2, code), description = COALESCE($3, description), updated_at = current_timestamp WHERE id = $4 AND deleted_at IS NULL RETURNING *`,
      [name, code, description, id]
    );
    return res.rows[0] || null;
  }

  async deleteSubject(id) {
    const res = await this.db.query(
      `UPDATE library_subjects SET deleted_at = current_timestamp WHERE id = $1 AND deleted_at IS NULL RETURNING id`,
      [id]
    );
    return res.rows.length > 0;
  }

  // ==========================================
  // 4. AUTHORS & PUBLISHERS
  // ==========================================

  async listAuthors(schoolId = null) {
    const query = `
      SELECT a.*, 
        COUNT(ba.book_id)::int AS book_count
      FROM library_authors a
      LEFT JOIN library_book_authors ba ON ba.author_id = a.id
      WHERE (a.school_id = $1 OR a.school_id IS NULL) AND a.deleted_at IS NULL
      GROUP BY a.id
      ORDER BY a.name ASC
    `;
    const res = await this.db.query(query, [schoolId]);
    return res.rows;
  }

  async createAuthor({ name, biography, schoolId }) {
    const res = await this.db.query(
      `INSERT INTO library_authors (name, biography, school_id) VALUES ($1, $2, $3) RETURNING *`,
      [name, biography, schoolId]
    );
    return res.rows[0];
  }

  async updateAuthor(id, { name, biography }) {
    const res = await this.db.query(
      `UPDATE library_authors SET name = COALESCE($1, name), biography = COALESCE($2, biography), updated_at = current_timestamp WHERE id = $3 AND deleted_at IS NULL RETURNING *`,
      [name, biography, id]
    );
    return res.rows[0] || null;
  }

  async deleteAuthor(id) {
    const res = await this.db.query(
      `UPDATE library_authors SET deleted_at = current_timestamp WHERE id = $1 AND deleted_at IS NULL RETURNING id`,
      [id]
    );
    return res.rows.length > 0;
  }

  async listPublishers(schoolId = null) {
    const query = `
      SELECT p.*, 
        COUNT(b.id) FILTER (WHERE b.deleted_at IS NULL)::int AS book_count
      FROM library_publishers p
      LEFT JOIN library_books b ON b.publisher_id = p.id
      WHERE (p.school_id = $1 OR p.school_id IS NULL) AND p.deleted_at IS NULL
      GROUP BY p.id
      ORDER BY p.name ASC
    `;
    const res = await this.db.query(query, [schoolId]);
    return res.rows;
  }

  async createPublisher({ name, contact_email, contact_phone, address, schoolId }) {
    const res = await this.db.query(
      `INSERT INTO library_publishers (name, contact_email, contact_phone, address, school_id) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, contact_email, contact_phone, address, schoolId]
    );
    return res.rows[0];
  }

  async updatePublisher(id, { name, contact_email, contact_phone, address }) {
    const res = await this.db.query(
      `UPDATE library_publishers SET 
        name = COALESCE($1, name), 
        contact_email = COALESCE($2, contact_email), 
        contact_phone = COALESCE($3, contact_phone), 
        address = COALESCE($4, address), 
        updated_at = current_timestamp 
      WHERE id = $5 AND deleted_at IS NULL RETURNING *`,
      [name, contact_email, contact_phone, address, id]
    );
    return res.rows[0] || null;
  }

  async deletePublisher(id) {
    const res = await this.db.query(
      `UPDATE library_publishers SET deleted_at = current_timestamp WHERE id = $1 AND deleted_at IS NULL RETURNING id`,
      [id]
    );
    return res.rows.length > 0;
  }

  // ==========================================
  // 5. BOOKS & COPIES CATALOG
  // ==========================================

  async listBooks({ search, categoryId, subjectId, authorId, availability, schoolId, limit = 50, offset = 0 }) {
    let query = `
      SELECT 
        b.*,
        c.name AS category_name,
        c.code AS category_code,
        s.name AS subject_name,
        s.code AS subject_code,
        p.name AS publisher_name,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object('id', a.id, 'name', a.name)
          ) FILTER (WHERE a.id IS NOT NULL), '[]'
        ) AS authors,
        (SELECT COUNT(*)::int FROM library_book_copies lbc WHERE lbc.book_id = b.id AND lbc.deleted_at IS NULL) AS total_copies_count,
        (SELECT COUNT(*)::int FROM library_book_copies lbc WHERE lbc.book_id = b.id AND lbc.status = 'AVAILABLE' AND lbc.deleted_at IS NULL) AS available_copies_count,
        (SELECT COUNT(*)::int FROM library_book_copies lbc WHERE lbc.book_id = b.id AND lbc.status = 'BORROWED' AND lbc.deleted_at IS NULL) AS borrowed_copies_count,
        (SELECT COUNT(*)::int FROM library_reservations lr WHERE lr.book_id = b.id AND lr.status IN ('PENDING', 'READY_FOR_PICKUP')) AS reservations_count
      FROM library_books b
      LEFT JOIN library_categories c ON c.id = b.category_id
      LEFT JOIN library_subjects s ON s.id = b.subject_id
      LEFT JOIN library_publishers p ON p.id = b.publisher_id
      LEFT JOIN library_book_authors ba ON ba.book_id = b.id
      LEFT JOIN library_authors a ON a.id = ba.author_id AND a.deleted_at IS NULL
      WHERE (b.school_id = $1 OR b.school_id IS NULL) AND b.deleted_at IS NULL
    `;
    const params = [schoolId];

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      query += ` AND (
        LOWER(b.title) LIKE $${params.length} 
        OR LOWER(COALESCE(b.isbn, '')) LIKE $${params.length}
        OR LOWER(COALESCE(b.ddc_number, '')) LIKE $${params.length}
        OR LOWER(COALESCE(b.shelf_location, '')) LIKE $${params.length}
      )`;
    }

    if (categoryId) {
      params.push(categoryId);
      query += ` AND b.category_id = $${params.length}`;
    }

    if (subjectId) {
      params.push(subjectId);
      query += ` AND b.subject_id = $${params.length}`;
    }

    if (authorId) {
      params.push(authorId);
      query += ` AND EXISTS (SELECT 1 FROM library_book_authors ba2 WHERE ba2.book_id = b.id AND ba2.author_id = $${params.length})`;
    }

    query += ` GROUP BY b.id, c.name, c.code, s.name, s.code, p.name`;

    if (availability === 'AVAILABLE') {
      query += ` HAVING (SELECT COUNT(*) FROM library_book_copies lbc WHERE lbc.book_id = b.id AND lbc.status = 'AVAILABLE' AND lbc.deleted_at IS NULL) > 0`;
    } else if (availability === 'UNAVAILABLE') {
      query += ` HAVING (SELECT COUNT(*) FROM library_book_copies lbc WHERE lbc.book_id = b.id AND lbc.status = 'AVAILABLE' AND lbc.deleted_at IS NULL) = 0`;
    }

    query += ` ORDER BY b.title ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const res = await this.db.query(query, params);
    return res.rows;
  }

  async getBookById(id) {
    const query = `
      SELECT 
        b.*,
        c.name AS category_name,
        c.code AS category_code,
        s.name AS subject_name,
        s.code AS subject_code,
        p.name AS publisher_name,
        p.contact_email AS publisher_email,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object('id', a.id, 'name', a.name, 'biography', a.biography)
          ) FILTER (WHERE a.id IS NOT NULL), '[]'
        ) AS authors,
        (SELECT COUNT(*)::int FROM library_book_copies lbc WHERE lbc.book_id = b.id AND lbc.deleted_at IS NULL) AS total_copies_count,
        (SELECT COUNT(*)::int FROM library_book_copies lbc WHERE lbc.book_id = b.id AND lbc.status = 'AVAILABLE' AND lbc.deleted_at IS NULL) AS available_copies_count,
        (SELECT COUNT(*)::int FROM library_book_copies lbc WHERE lbc.book_id = b.id AND lbc.status = 'BORROWED' AND lbc.deleted_at IS NULL) AS borrowed_copies_count
      FROM library_books b
      LEFT JOIN library_categories c ON c.id = b.category_id
      LEFT JOIN library_subjects s ON s.id = b.subject_id
      LEFT JOIN library_publishers p ON p.id = b.publisher_id
      LEFT JOIN library_book_authors ba ON ba.book_id = b.id
      LEFT JOIN library_authors a ON a.id = ba.author_id AND a.deleted_at IS NULL
      WHERE b.id = $1 AND b.deleted_at IS NULL
      GROUP BY b.id, c.name, c.code, s.name, s.code, p.name, p.contact_email
    `;
    const res = await this.db.query(query, [id]);
    return res.rows[0] || null;
  }

  async createBook(data, authorIds = [], schoolId = null) {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      const insertBookQuery = `
        INSERT INTO library_books (
          school_id, title, isbn, edition, category_id, subject_id, publisher_id,
          publication_year, language, pages, ddc_number, shelf_location, cover_image, description
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
      `;
      const values = [
        schoolId,
        data.title,
        data.isbn,
        data.edition,
        data.category_id || null,
        data.subject_id || null,
        data.publisher_id || null,
        data.publication_year || null,
        data.language || 'English',
        data.pages || null,
        data.ddc_number || null,
        data.shelf_location || null,
        data.cover_image || null,
        data.description || null,
      ];
      const bookRes = await client.query(insertBookQuery, values);
      const book = bookRes.rows[0];

      if (Array.isArray(authorIds) && authorIds.length > 0) {
        for (const authorId of authorIds) {
          await client.query(
            `INSERT INTO library_book_authors (book_id, author_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [book.id, authorId]
          );
        }
      }

      await client.query('COMMIT');
      return await this.getBookById(book.id);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async updateBook(id, data, authorIds = null) {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      const updateQuery = `
        UPDATE library_books SET
          title = COALESCE($1, title),
          isbn = COALESCE($2, isbn),
          edition = COALESCE($3, edition),
          category_id = COALESCE($4, category_id),
          subject_id = COALESCE($5, subject_id),
          publisher_id = COALESCE($6, publisher_id),
          publication_year = COALESCE($7, publication_year),
          language = COALESCE($8, language),
          pages = COALESCE($9, pages),
          ddc_number = COALESCE($10, ddc_number),
          shelf_location = COALESCE($11, shelf_location),
          cover_image = COALESCE($12, cover_image),
          description = COALESCE($13, description),
          updated_at = current_timestamp
        WHERE id = $14 AND deleted_at IS NULL
        RETURNING id
      `;
      const values = [
        data.title,
        data.isbn,
        data.edition,
        data.category_id,
        data.subject_id,
        data.publisher_id,
        data.publication_year,
        data.language,
        data.pages,
        data.ddc_number,
        data.shelf_location,
        data.cover_image,
        data.description,
        id,
      ];
      const res = await client.query(updateQuery, values);
      if (res.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      if (Array.isArray(authorIds)) {
        await client.query(`DELETE FROM library_book_authors WHERE book_id = $1`, [id]);
        for (const authorId of authorIds) {
          await client.query(
            `INSERT INTO library_book_authors (book_id, author_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [id, authorId]
          );
        }
      }

      await client.query('COMMIT');
      return await this.getBookById(id);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async deleteBook(id) {
    const res = await this.db.query(
      `UPDATE library_books SET deleted_at = current_timestamp WHERE id = $1 AND deleted_at IS NULL RETURNING id`,
      [id]
    );
    if (res.rows.length > 0) {
      await this.db.query(`UPDATE library_book_copies SET deleted_at = current_timestamp WHERE book_id = $1`, [id]);
      return true;
    }
    return false;
  }

  // ==========================================
  // 6. BOOK COPIES
  // ==========================================

  async listCopiesByBook(bookId) {
    const query = `
      SELECT 
        lbc.*,
        b.title AS book_title,
        b.isbn,
        b.shelf_location,
        ll.id AS active_loan_id,
        ll.due_date AS active_due_date,
        ll.issue_date AS active_issue_date,
        lm.member_number AS borrower_member_number,
        (u.first_name || ' ' || u.last_name) AS borrower_name,
        COALESCE(r.name, '') AS borrower_role
      FROM library_book_copies lbc
      INNER JOIN library_books b ON b.id = lbc.book_id
      LEFT JOIN library_loans ll ON ll.copy_id = lbc.id AND ll.status = 'ACTIVE'
      LEFT JOIN library_members lm ON lm.id = ll.member_id
      LEFT JOIN users u ON u.id = lm.user_id
      LEFT JOIN roles r ON r.id = u.role_id
      WHERE lbc.book_id = $1 AND lbc.deleted_at IS NULL
      ORDER BY lbc.accession_number ASC
    `;
    const res = await this.db.query(query, [bookId]);
    return res.rows;
  }

  async findCopyByAccessionOrBarcode(identifier, schoolId = null) {
    if (!identifier) return null;
    const cleanId = String(identifier).trim();

    // 1. Match by Accession Number, Barcode, or Copy UUID (case-insensitive)
    const query = `
      SELECT 
        lbc.*,
        b.title AS book_title,
        b.isbn,
        b.cover_image,
        b.shelf_location,
        c.name AS category_name,
        s.name AS subject_name,
        (SELECT COUNT(*)::int FROM library_book_copies WHERE book_id = b.id AND status = 'AVAILABLE' AND deleted_at IS NULL) AS available_copies_count
      FROM library_book_copies lbc
      INNER JOIN library_books b ON b.id = lbc.book_id
      LEFT JOIN library_categories c ON c.id = b.category_id
      LEFT JOIN library_subjects s ON s.id = b.subject_id
      WHERE (LOWER(lbc.accession_number) = LOWER($1) OR LOWER(lbc.barcode) = LOWER($1) OR lbc.id::text = $1)
        AND (lbc.school_id = $2 OR lbc.school_id IS NULL)
        AND lbc.deleted_at IS NULL
        AND b.deleted_at IS NULL
      LIMIT 1
    `;
    const res = await this.db.query(query, [cleanId, schoolId]);
    if (res.rows.length > 0) {
      return res.rows[0];
    }

    // 2. Fallback: Match by Book ISBN or Title and select the first AVAILABLE copy
    const fallbackQuery = `
      SELECT 
        lbc.*,
        b.title AS book_title,
        b.isbn,
        b.cover_image,
        b.shelf_location,
        c.name AS category_name,
        s.name AS subject_name,
        (SELECT COUNT(*)::int FROM library_book_copies WHERE book_id = b.id AND status = 'AVAILABLE' AND deleted_at IS NULL) AS available_copies_count
      FROM library_book_copies lbc
      INNER JOIN library_books b ON b.id = lbc.book_id
      LEFT JOIN library_categories c ON c.id = b.category_id
      LEFT JOIN library_subjects s ON s.id = b.subject_id
      WHERE (LOWER(b.isbn) = LOWER($1) OR LOWER(b.title) = LOWER($1) OR b.id::text = $1)
        AND (lbc.school_id = $2 OR lbc.school_id IS NULL)
        AND lbc.status = 'AVAILABLE'
        AND lbc.deleted_at IS NULL
        AND b.deleted_at IS NULL
      ORDER BY lbc.accession_number ASC
      LIMIT 1
    `;
    const fallbackRes = await this.db.query(fallbackQuery, [cleanId, schoolId]);
    if (fallbackRes.rows.length > 0) {
      return fallbackRes.rows[0];
    }

    return null;
  }

  async createBookCopy(data, schoolId = null) {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      const insertCopyQuery = `
        INSERT INTO library_book_copies (
          school_id, book_id, accession_number, barcode, call_number,
          condition, status, acquisition_date, price, remarks
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;
      const values = [
        schoolId,
        data.book_id,
        data.accession_number,
        data.barcode || data.accession_number,
        data.call_number || null,
        data.condition || 'EXCELLENT',
        data.status || 'AVAILABLE',
        data.acquisition_date || new Date(),
        data.price || null,
        data.remarks || null,
      ];
      const copyRes = await client.query(insertCopyQuery, values);
      const copy = copyRes.rows[0];

      // Refresh cached counters on book
      await client.query(
        `
        UPDATE library_books SET
          total_copies = (SELECT COUNT(*) FROM library_book_copies WHERE book_id = $1 AND deleted_at IS NULL),
          available_copies = (SELECT COUNT(*) FROM library_book_copies WHERE book_id = $1 AND status = 'AVAILABLE' AND deleted_at IS NULL)
        WHERE id = $1
        `,
        [data.book_id]
      );

      await client.query('COMMIT');
      return copy;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async createBulkCopies({ book_id, quantity, accession_prefix = 'LIB', call_number, condition = 'EXCELLENT', price }, schoolId = null) {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      const currentYear = new Date().getFullYear();
      const countRes = await client.query(`SELECT COUNT(*)::int AS count FROM library_book_copies`);
      let seq = (countRes.rows[0].count || 0) + 1;

      const createdCopies = [];
      for (let i = 0; i < quantity; i++) {
        const accession = `${accession_prefix}-${currentYear}-${String(seq).padStart(5, '0')}`;
        seq++;

        const res = await client.query(
          `
          INSERT INTO library_book_copies (
            school_id, book_id, accession_number, barcode, call_number, condition, status, acquisition_date, price
          ) VALUES ($1, $2, $3, $4, $5, $6, 'AVAILABLE', current_date, $7)
          RETURNING *
          `,
          [schoolId, book_id, accession, accession, call_number || null, condition, price || null]
        );
        createdCopies.push(res.rows[0]);
      }

      await client.query(
        `
        UPDATE library_books SET
          total_copies = (SELECT COUNT(*) FROM library_book_copies WHERE book_id = $1 AND deleted_at IS NULL),
          available_copies = (SELECT COUNT(*) FROM library_book_copies WHERE book_id = $1 AND status = 'AVAILABLE' AND deleted_at IS NULL)
        WHERE id = $1
        `,
        [book_id]
      );

      await client.query('COMMIT');
      return createdCopies;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async updateCopy(id, data) {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      const updateQuery = `
        UPDATE library_book_copies SET
          accession_number = COALESCE($1, accession_number),
          barcode = COALESCE($2, barcode),
          call_number = COALESCE($3, call_number),
          condition = COALESCE($4, condition),
          status = COALESCE($5, status),
          price = COALESCE($6, price),
          remarks = COALESCE($7, remarks),
          updated_at = current_timestamp
        WHERE id = $8 AND deleted_at IS NULL
        RETURNING *
      `;
      const values = [
        data.accession_number,
        data.barcode,
        data.call_number,
        data.condition,
        data.status,
        data.price,
        data.remarks,
        id,
      ];
      const res = await client.query(updateQuery, values);
      const copy = res.rows[0];

      if (copy) {
        await client.query(
          `
          UPDATE library_books SET
            total_copies = (SELECT COUNT(*) FROM library_book_copies WHERE book_id = $1 AND deleted_at IS NULL),
            available_copies = (SELECT COUNT(*) FROM library_book_copies WHERE book_id = $1 AND status = 'AVAILABLE' AND deleted_at IS NULL)
          WHERE id = $1
          `,
          [copy.book_id]
        );
      }

      await client.query('COMMIT');
      return copy || null;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async deleteCopy(id) {
    const copyRes = await this.db.query(
      `UPDATE library_book_copies SET deleted_at = current_timestamp WHERE id = $1 AND deleted_at IS NULL RETURNING book_id`,
      [id]
    );
    if (copyRes.rows.length > 0) {
      const bookId = copyRes.rows[0].book_id;
      await this.db.query(
        `
        UPDATE library_books SET
          total_copies = (SELECT COUNT(*) FROM library_book_copies WHERE book_id = $1 AND deleted_at IS NULL),
          available_copies = (SELECT COUNT(*) FROM library_book_copies WHERE book_id = $1 AND status = 'AVAILABLE' AND deleted_at IS NULL)
        WHERE id = $1
        `,
        [bookId]
      );
      return true;
    }
    return false;
  }

  // ==========================================
  // 7. MEMBERS
  // ==========================================

  async listMembers({ search, memberType, status, schoolId, limit = 50, offset = 0 }) {
    let query = `
      SELECT 
        lm.*,
        u.first_name,
        u.last_name,
        (u.first_name || ' ' || u.last_name) AS full_name,
        u.email,
        u.phone,
        COALESCE(r.name, '') AS role_name,
        u.profile_image,
        (
          SELECT COUNT(*)::int 
          FROM library_loans ll 
          WHERE ll.member_id = lm.id AND ll.status = 'ACTIVE'
        ) AS active_loans_count,
        (
          SELECT COUNT(*)::int 
          FROM library_loans ll 
          WHERE ll.member_id = lm.id AND ll.status = 'ACTIVE' AND ll.due_date < current_timestamp
        ) AS overdue_loans_count,
        (
          SELECT COALESCE(SUM(lf.amount - lf.amount_paid), 0)::numeric(10,2)
          FROM library_fines lf
          WHERE lf.member_id = lm.id AND lf.status IN ('UNPAID', 'PARTIALLY_PAID')
        ) AS outstanding_fines_sum,
        (
          SELECT COUNT(*)::int 
          FROM library_loans ll 
          WHERE ll.member_id = lm.id
        ) AS total_borrowed_lifetime
      FROM library_members lm
      INNER JOIN users u ON u.id = lm.user_id
      LEFT JOIN roles r ON r.id = u.role_id
      WHERE (lm.school_id = $1 OR lm.school_id IS NULL) AND lm.deleted_at IS NULL AND u.deleted_at IS NULL
    `;
    const params = [schoolId];

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      query += ` AND (
        LOWER(lm.member_number) LIKE $${params.length}
        OR LOWER(u.first_name || ' ' || u.last_name) LIKE $${params.length}
        OR LOWER(COALESCE(u.email, '')) LIKE $${params.length}
        OR LOWER(COALESCE(u.phone, '')) LIKE $${params.length}
      )`;
    }

    if (memberType) {
      params.push(memberType.toUpperCase());
      query += ` AND lm.member_type = $${params.length}`;
    }

    if (status) {
      params.push(status.toUpperCase());
      query += ` AND lm.status = $${params.length}`;
    }

    query += ` ORDER BY lm.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const res = await this.db.query(query, params);
    return res.rows;
  }

  async findMemberById(id) {
    const query = `
      SELECT 
        lm.*,
        u.first_name,
        u.last_name,
        (u.first_name || ' ' || u.last_name) AS full_name,
        u.email,
        u.phone,
        COALESCE(r.name, '') AS role_name,
        u.profile_image,
        (SELECT COUNT(*)::int FROM library_loans ll WHERE ll.member_id = lm.id AND ll.status = 'ACTIVE') AS active_loans_count,
        (SELECT COUNT(*)::int FROM library_loans ll WHERE ll.member_id = lm.id AND ll.status = 'ACTIVE' AND ll.due_date < current_timestamp) AS overdue_loans_count,
        (SELECT COALESCE(SUM(lf.amount - lf.amount_paid), 0)::numeric(10,2) FROM library_fines lf WHERE lf.member_id = lm.id AND lf.status IN ('UNPAID', 'PARTIALLY_PAID')) AS outstanding_fines_sum
      FROM library_members lm
      INNER JOIN users u ON u.id = lm.user_id
      LEFT JOIN roles r ON r.id = u.role_id
      WHERE lm.id = $1 AND lm.deleted_at IS NULL
    `;
    const res = await this.db.query(query, [id]);
    return res.rows[0] || null;
  }

  async findMemberByUserId(userId) {
    const query = `
      SELECT 
        lm.*,
        u.first_name,
        u.last_name,
        (u.first_name || ' ' || u.last_name) AS full_name,
        u.email,
        u.phone,
        COALESCE(r.name, '') AS role_name,
        (SELECT COUNT(*)::int FROM library_loans ll WHERE ll.member_id = lm.id AND ll.status = 'ACTIVE') AS active_loans_count,
        (SELECT COALESCE(SUM(lf.amount - lf.amount_paid), 0)::numeric(10,2) FROM library_fines lf WHERE lf.member_id = lm.id AND lf.status IN ('UNPAID', 'PARTIALLY_PAID')) AS outstanding_fines_sum
      FROM library_members lm
      INNER JOIN users u ON u.id = lm.user_id
      LEFT JOIN roles r ON r.id = u.role_id
      WHERE lm.user_id = $1 AND lm.deleted_at IS NULL
      LIMIT 1
    `;
    const res = await this.db.query(query, [userId]);
    return res.rows[0] || null;
  }

  async findMemberByIdentifier(identifier, schoolId = null) {
    const query = `
      SELECT 
        lm.*,
        u.first_name,
        u.last_name,
        (u.first_name || ' ' || u.last_name) AS full_name,
        u.email,
        u.phone,
        COALESCE(r.name, '') AS role_name,
        (SELECT COUNT(*)::int FROM library_loans ll WHERE ll.member_id = lm.id AND ll.status = 'ACTIVE') AS active_loans_count,
        (SELECT COALESCE(SUM(lf.amount - lf.amount_paid), 0)::numeric(10,2) FROM library_fines lf WHERE lf.member_id = lm.id AND lf.status IN ('UNPAID', 'PARTIALLY_PAID')) AS outstanding_fines_sum
      FROM library_members lm
      INNER JOIN users u ON u.id = lm.user_id
      LEFT JOIN roles r ON r.id = u.role_id
      WHERE (lm.id::text = $1 OR lm.user_id::text = $1 OR LOWER(lm.member_number) = LOWER($1) OR LOWER(u.email) = LOWER($1) OR u.phone = $1)
        AND (lm.school_id = $2 OR lm.school_id IS NULL)
        AND lm.deleted_at IS NULL
      LIMIT 1
    `;
    const res = await this.db.query(query, [identifier, schoolId]);
    if (res.rows.length > 0) {
      return res.rows[0];
    }

    // Fallback: If not yet in library_members, search users table by email, ID or phone and auto-sync
    const userRes = await this.db.query(
      `SELECT u.id, u.school_id FROM users u WHERE (LOWER(u.email) = LOWER($1) OR u.id::text = $1 OR u.phone = $1) AND u.deleted_at IS NULL LIMIT 1`,
      [identifier]
    );
    if (userRes.rows.length > 0) {
      return await this.createOrSyncMember(userRes.rows[0].id, schoolId || userRes.rows[0].school_id);
    }

    return null;
  }

  async createOrSyncMember(userId, schoolId = null, overrideType = null) {
    const userRes = await this.db.query(
      `SELECT u.id, u.first_name, u.last_name, COALESCE(r.name, '') AS role_name, u.school_id FROM users u LEFT JOIN roles r ON r.id = u.role_id WHERE u.id = $1 AND u.deleted_at IS NULL`,
      [userId]
    );
    if (userRes.rows.length === 0) return null;
    const user = userRes.rows[0];

    const existingMember = await this.findMemberByUserId(userId);
    if (existingMember) return existingMember;

    let memberType = 'STUDENT';
    const roleLower = (user.role_name || '').toLowerCase();
    if (roleLower.includes('teacher')) memberType = 'TEACHER';
    else if (roleLower.includes('staff') || roleLower.includes('admin') || roleLower.includes('librarian')) memberType = 'STAFF';
    if (overrideType) memberType = overrideType;

    const prefix = memberType === 'STUDENT' ? 'STU' : memberType === 'TEACHER' ? 'TCH' : 'STF';
    const year = new Date().getFullYear();
    const countRes = await this.db.query(`SELECT COUNT(*)::int AS count FROM library_members WHERE member_type = $1`, [memberType]);
    const seq = (countRes.rows[0].count || 0) + 1;
    const memberNumber = `LIB-${prefix}-${year}-${String(seq).padStart(4, '0')}`;

    const insertQuery = `
      INSERT INTO library_members (
        school_id, user_id, member_number, member_type, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, 'ACTIVE', current_timestamp, current_timestamp)
      RETURNING *
    `;
    const res = await this.db.query(insertQuery, [schoolId || user.school_id, userId, memberNumber, memberType]);
    return await this.findMemberById(res.rows[0].id);
  }

  async syncAllEligibleUsers(schoolId = null) {
    const usersRes = await this.db.query(
      `
      SELECT u.id, COALESCE(r.name, '') AS role_name, u.school_id
      FROM users u
      LEFT JOIN roles r ON r.id = u.role_id
      LEFT JOIN library_members lm ON lm.user_id = u.id AND lm.deleted_at IS NULL
      WHERE lm.id IS NULL AND u.deleted_at IS NULL AND u.status = 'ACTIVE'
        AND (u.school_id = $1 OR $1 IS NULL)
      `,
      [schoolId]
    );

    let syncedCount = 0;
    for (const user of usersRes.rows) {
      await this.createOrSyncMember(user.id, user.school_id || schoolId);
      syncedCount++;
    }
    return syncedCount;
  }

  async updateMemberStatus(id, status, notes = null) {
    const res = await this.db.query(
      `UPDATE library_members SET status = $1, notes = COALESCE($2, notes), updated_at = current_timestamp WHERE id = $3 AND deleted_at IS NULL RETURNING *`,
      [status, notes, id]
    );
    return res.rows[0] || null;
  }

  // ==========================================
  // 8. CIRCULATION & LOANS (ISSUE, RETURN, RENEW)
  // ==========================================

  async listLoans({ search, status, memberId, bookId, copyId, isOverdue, schoolId, limit = 50, offset = 0 }) {
    let query = `
      SELECT 
        ll.*,
        b.title AS book_title,
        b.isbn,
        b.cover_image,
        b.shelf_location,
        lbc.accession_number,
        lbc.barcode,
        lbc.call_number,
        lm.member_number,
        lm.member_type,
        (u.first_name || ' ' || u.last_name) AS member_name,
        u.email AS member_email,
        u.phone AS member_phone,
        COALESCE(r.name, '') AS member_role,
        (issuer.first_name || ' ' || issuer.last_name) AS issued_by_name,
        (receiver.first_name || ' ' || receiver.last_name) AS received_by_name,
        CASE 
          WHEN ll.status = 'ACTIVE' AND ll.due_date < current_timestamp THEN 
            EXTRACT(DAY FROM (current_timestamp - ll.due_date))::int
          ELSE 0 
        END AS days_overdue,
        (
          SELECT COALESCE(SUM(lf.amount - lf.amount_paid), 0)::numeric(10,2)
          FROM library_fines lf
          WHERE lf.loan_id = ll.id AND lf.status IN ('UNPAID', 'PARTIALLY_PAID')
        ) AS unpaid_fines_amount
      FROM library_loans ll
      INNER JOIN library_books b ON b.id = ll.book_id
      INNER JOIN library_book_copies lbc ON lbc.id = ll.copy_id
      INNER JOIN library_members lm ON lm.id = ll.member_id
      INNER JOIN users u ON u.id = lm.user_id
      LEFT JOIN roles r ON r.id = u.role_id
      LEFT JOIN users issuer ON issuer.id = ll.issued_by
      LEFT JOIN users receiver ON receiver.id = ll.received_by
      WHERE (ll.school_id = $1 OR ll.school_id IS NULL)
    `;
    const params = [schoolId];

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      query += ` AND (
        LOWER(b.title) LIKE $${params.length}
        OR LOWER(lbc.accession_number) LIKE $${params.length}
        OR LOWER(lm.member_number) LIKE $${params.length}
        OR LOWER(u.first_name || ' ' || u.last_name) LIKE $${params.length}
      )`;
    }

    if (status) {
      params.push(status.toUpperCase());
      query += ` AND ll.status = $${params.length}`;
    }

    if (memberId) {
      params.push(memberId);
      query += ` AND ll.member_id = $${params.length}`;
    }

    if (bookId) {
      params.push(bookId);
      query += ` AND ll.book_id = $${params.length}`;
    }

    if (copyId) {
      params.push(copyId);
      query += ` AND ll.copy_id = $${params.length}`;
    }

    if (isOverdue === true || isOverdue === 'true') {
      query += ` AND ll.status = 'ACTIVE' AND ll.due_date < current_timestamp`;
    }

    query += ` ORDER BY ll.issue_date DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const res = await this.db.query(query, params);
    return res.rows;
  }

  async getLoanById(id) {
    const query = `
      SELECT 
        ll.*,
        b.title AS book_title,
        b.isbn,
        b.cover_image,
        b.shelf_location,
        lbc.accession_number,
        lbc.barcode,
        lbc.call_number,
        lm.member_number,
        lm.member_type,
        (u.first_name || ' ' || u.last_name) AS member_name,
        u.email AS member_email,
        u.phone AS member_phone,
        COALESCE(r.name, '') AS member_role,
        (issuer.first_name || ' ' || issuer.last_name) AS issued_by_name,
        (receiver.first_name || ' ' || receiver.last_name) AS received_by_name,
        COALESCE(
          json_agg(
            jsonb_build_object(
              'id', lr.id, 
              'previous_due_date', lr.previous_due_date, 
              'new_due_date', lr.new_due_date, 
              'renewal_date', lr.renewal_date,
              'notes', lr.notes
            )
          ) FILTER (WHERE lr.id IS NOT NULL), '[]'
        ) AS renewals
      FROM library_loans ll
      INNER JOIN library_books b ON b.id = ll.book_id
      INNER JOIN library_book_copies lbc ON lbc.id = ll.copy_id
      INNER JOIN library_members lm ON lm.id = ll.member_id
      INNER JOIN users u ON u.id = lm.user_id
      LEFT JOIN roles r ON r.id = u.role_id
      LEFT JOIN users issuer ON issuer.id = ll.issued_by
      LEFT JOIN users receiver ON receiver.id = ll.received_by
      LEFT JOIN library_renewals lr ON lr.loan_id = ll.id
      WHERE ll.id = $1
      GROUP BY ll.id, b.id, lbc.id, lm.id, u.id, r.name, issuer.id, receiver.id
    `;
    const res = await this.db.query(query, [id]);
    return res.rows[0] || null;
  }

  /**
   * Atomic Book Issue with Lock & Verification
   */
  async issueLoan({
    copyId,
    memberId,
    issuedByUserId,
    loanDurationDays,
    conditionOnIssue = 'GOOD',
    borrowerAcknowledgmentType = 'SIGNATURE',
    borrowerSignature = null,
    issueNotes = null,
    schoolId = null,
  }) {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      // 1. Lock and fetch copy
      const copyRes = await client.query(
        `SELECT * FROM library_book_copies WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`,
        [copyId]
      );
      if (copyRes.rows.length === 0) {
        throw new Error('Book copy does not exist');
      }
      const copy = copyRes.rows[0];
      if (copy.status !== 'AVAILABLE') {
        throw new Error(`This copy is currently ${copy.status.toLowerCase()} and cannot be issued`);
      }

      // 2. Lock and fetch member
      const memberRes = await client.query(
        `SELECT * FROM library_members WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`,
        [memberId]
      );
      if (memberRes.rows.length === 0) {
        throw new Error('Library member does not exist');
      }
      const member = memberRes.rows[0];
      if (member.status !== 'ACTIVE') {
        throw new Error(`Member is currently ${member.status.toLowerCase()}`);
      }

      // 3. Compute Due Date
      const issueDate = new Date();
      const dueDate = new Date(issueDate.getTime() + loanDurationDays * 24 * 60 * 60 * 1000);

      // 4. Insert Loan
      const insertLoanQuery = `
        INSERT INTO library_loans (
          school_id, copy_id, book_id, member_id, issued_by,
          loan_duration_days, issue_date, due_date, status,
          condition_on_issue, borrower_acknowledgment_type, borrower_signature, issue_notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'ACTIVE', $9, $10, $11, $12)
        RETURNING *
      `;
      const loanValues = [
        schoolId || copy.school_id,
        copy.id,
        copy.book_id,
        member.id,
        issuedByUserId,
        loanDurationDays,
        issueDate,
        dueDate,
        conditionOnIssue,
        borrowerAcknowledgmentType,
        borrowerSignature,
        issueNotes,
      ];
      const loanRes = await client.query(insertLoanQuery, loanValues);
      const loan = loanRes.rows[0];

      // 5. Update copy status to BORROWED
      await client.query(`UPDATE library_book_copies SET status = 'BORROWED', updated_at = current_timestamp WHERE id = $1`, [copy.id]);

      // 6. Decrement available copies on book
      await client.query(
        `
        UPDATE library_books SET
          available_copies = (SELECT COUNT(*) FROM library_book_copies WHERE book_id = $1 AND status = 'AVAILABLE' AND deleted_at IS NULL),
          total_copies = (SELECT COUNT(*) FROM library_book_copies WHERE book_id = $1 AND deleted_at IS NULL)
        WHERE id = $1
        `,
        [copy.book_id]
      );

      // 7. Record Audit Log
      await client.query(
        `
        INSERT INTO library_audit_logs (school_id, user_id, action, entity_type, entity_id, details)
        VALUES ($1, $2, 'LOAN_ISSUED', 'LOAN', $3, $4)
        `,
        [
          schoolId || copy.school_id,
          issuedByUserId,
          loan.id,
          JSON.stringify({
            copy_id: copy.id,
            accession_number: copy.accession_number,
            book_id: copy.book_id,
            member_id: member.id,
            due_date: dueDate,
            duration: loanDurationDays,
          }),
        ]
      );

      await client.query('COMMIT');
      return await this.getLoanById(loan.id);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Atomic Book Return with Overdue Fine Calculation
   */
  async returnLoan({
    loanId,
    receivedByUserId,
    conditionOnReturn = 'GOOD',
    returnNotes = null,
    damageFineAmount = 0,
    policyFineRatePerDay = 2.00,
    schoolId = null,
  }) {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      // 1. Lock and fetch loan
      const loanRes = await client.query(
        `SELECT * FROM library_loans WHERE id = $1 FOR UPDATE`,
        [loanId]
      );
      if (loanRes.rows.length === 0) {
        throw new Error('Loan transaction does not exist');
      }
      const loan = loanRes.rows[0];
      if (loan.status !== 'ACTIVE' && loan.status !== 'OVERDUE') {
        throw new Error(`Loan is already ${loan.status.toLowerCase()}`);
      }

      const returnDate = new Date();
      const dueDate = new Date(loan.due_date);

      // 2. Check overdue and calculate fine
      let overdueDays = 0;
      let overdueFineAmount = 0;
      if (returnDate > dueDate) {
        const diffTime = Math.abs(returnDate - dueDate);
        overdueDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        overdueFineAmount = Number((overdueDays * Number(policyFineRatePerDay)).toFixed(2));
      }

      // 3. Update loan record
      await client.query(
        `
        UPDATE library_loans SET
          return_date = $1,
          status = 'RETURNED',
          condition_on_return = $2,
          return_notes = $3,
          received_by = $4,
          updated_at = current_timestamp
        WHERE id = $5
        `,
        [returnDate, conditionOnReturn, returnNotes, receivedByUserId, loan.id]
      );

      // 4. Update copy status
      const copyStatus = conditionOnReturn === 'DAMAGED' ? 'DAMAGED' : 'AVAILABLE';
      await client.query(
        `UPDATE library_book_copies SET status = $1, condition = $2, updated_at = current_timestamp WHERE id = $3`,
        [copyStatus, conditionOnReturn, loan.copy_id]
      );

      // 5. Update book counter
      await client.query(
        `
        UPDATE library_books SET
          available_copies = (SELECT COUNT(*) FROM library_book_copies WHERE book_id = $1 AND status = 'AVAILABLE' AND deleted_at IS NULL)
        WHERE id = $1
        `,
        [loan.book_id]
      );

      // 6. Create Overdue Fine if applicable
      let createdFine = null;
      if (overdueFineAmount > 0) {
        const fineRes = await client.query(
          `
          INSERT INTO library_fines (
            school_id, loan_id, member_id, fine_type, amount, status, overdue_days, reason
          ) VALUES ($1, $2, $3, 'OVERDUE', $4, 'UNPAID', $5, $6)
          RETURNING *
          `,
          [
            schoolId || loan.school_id,
            loan.id,
            loan.member_id,
            overdueFineAmount,
            overdueDays,
            `Overdue return by ${overdueDays} days (Rate: ${policyFineRatePerDay}/day)`,
          ]
        );
        createdFine = fineRes.rows[0];
      }

      // 7. Create Damage Fine if applicable
      if (Number(damageFineAmount) > 0) {
        await client.query(
          `
          INSERT INTO library_fines (
            school_id, loan_id, member_id, fine_type, amount, status, reason
          ) VALUES ($1, $2, $3, 'DAMAGED_BOOK', $4, 'UNPAID', $5)
          `,
          [
            schoolId || loan.school_id,
            loan.id,
            loan.member_id,
            Number(damageFineAmount),
            `Book returned in damaged condition: ${returnNotes || conditionOnReturn}`,
          ]
        );
      }

      // 8. Fulfill next pending reservation if available
      if (copyStatus === 'AVAILABLE') {
        const resQuery = `
          SELECT * FROM library_reservations 
          WHERE book_id = $1 AND status = 'PENDING' 
          ORDER BY priority ASC, reservation_date ASC 
          LIMIT 1 
          FOR UPDATE
        `;
        const reservationRes = await client.query(resQuery, [loan.book_id]);
        if (reservationRes.rows.length > 0) {
          const pendingRes = reservationRes.rows[0];
          const holdUntil = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days hold
          await client.query(
            `UPDATE library_reservations SET status = 'READY_FOR_PICKUP', copy_id = $1, hold_until = $2, updated_at = current_timestamp WHERE id = $3`,
            [loan.copy_id, holdUntil, pendingRes.id]
          );
          await client.query(`UPDATE library_book_copies SET status = 'RESERVED' WHERE id = $1`, [loan.copy_id]);
        }
      }

      // 9. Audit log
      await client.query(
        `
        INSERT INTO library_audit_logs (school_id, user_id, action, entity_type, entity_id, details)
        VALUES ($1, $2, 'LOAN_RETURNED', 'LOAN', $3, $4)
        `,
        [
          schoolId || loan.school_id,
          receivedByUserId,
          loan.id,
          JSON.stringify({
            copy_id: loan.copy_id,
            member_id: loan.member_id,
            overdue_days: overdueDays,
            fine_assessed: overdueFineAmount,
            damage_fine: damageFineAmount,
            condition: conditionOnReturn,
          }),
        ]
      );

      await client.query('COMMIT');
      return {
        loan: await this.getLoanById(loan.id),
        overdueDays,
        overdueFineAmount,
        fine: createdFine,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Atomic Loan Renewal
   */
  async renewLoan({ loanId, renewedByUserId, renewalDays, maxRenewalCount = 2, schoolId = null }) {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      const loanRes = await client.query(
        `SELECT * FROM library_loans WHERE id = $1 FOR UPDATE`,
        [loanId]
      );
      if (loanRes.rows.length === 0) {
        throw new Error('Loan does not exist');
      }
      const loan = loanRes.rows[0];
      if (loan.status !== 'ACTIVE') {
        throw new Error('Only active loans can be renewed');
      }

      if (loan.renewal_count >= maxRenewalCount) {
        throw new Error(`Maximum renewals limit reached (${maxRenewalCount} times)`);
      }

      // Check if book has pending reservations
      const resCheck = await client.query(
        `SELECT COUNT(*)::int AS count FROM library_reservations WHERE book_id = $1 AND status = 'PENDING'`,
        [loan.book_id]
      );
      if (resCheck.rows[0].count > 0) {
        throw new Error('Cannot renew because another member has reserved this book');
      }

      const prevDueDate = new Date(loan.due_date);
      const baseDate = prevDueDate > new Date() ? prevDueDate : new Date();
      const newDueDate = new Date(baseDate.getTime() + renewalDays * 24 * 60 * 60 * 1000);

      // 1. Update loan
      await client.query(
        `
        UPDATE library_loans SET
          due_date = $1,
          renewal_count = renewal_count + 1,
          updated_at = current_timestamp
        WHERE id = $2
        `,
        [newDueDate, loan.id]
      );

      // 2. Insert renewal log
      await client.query(
        `
        INSERT INTO library_renewals (loan_id, renewed_by, previous_due_date, new_due_date, renewal_date, notes)
        VALUES ($1, $2, $3, $4, current_timestamp, $5)
        `,
        [loan.id, renewedByUserId, prevDueDate, newDueDate, `Renewed by ${renewalDays} days`]
      );

      // 3. Audit log
      await client.query(
        `
        INSERT INTO library_audit_logs (school_id, user_id, action, entity_type, entity_id, details)
        VALUES ($1, $2, 'LOAN_RENEWED', 'LOAN', $3, $4)
        `,
        [
          schoolId || loan.school_id,
          renewedByUserId,
          loan.id,
          JSON.stringify({
            renewal_count: loan.renewal_count + 1,
            previous_due_date: prevDueDate,
            new_due_date: newDueDate,
          }),
        ]
      );

      await client.query('COMMIT');
      return await this.getLoanById(loan.id);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // ==========================================
  // 9. RESERVATIONS
  // ==========================================

  async listReservations({ bookId, memberId, status, schoolId, limit = 50, offset = 0 }) {
    let query = `
      SELECT 
        lr.*,
        b.title AS book_title,
        b.isbn,
        b.cover_image,
        lbc.accession_number,
        lm.member_number,
        (u.first_name || ' ' || u.last_name) AS member_name,
        u.email AS member_email,
        COALESCE(r.name, '') AS member_role
      FROM library_reservations lr
      INNER JOIN library_books b ON b.id = lr.book_id
      INNER JOIN library_members lm ON lm.id = lr.member_id
      INNER JOIN users u ON u.id = lm.user_id
      LEFT JOIN roles r ON r.id = u.role_id
      LEFT JOIN library_book_copies lbc ON lbc.id = lr.copy_id
      WHERE (lr.school_id = $1 OR lr.school_id IS NULL)
    `;
    const params = [schoolId];

    if (bookId) {
      params.push(bookId);
      query += ` AND lr.book_id = $${params.length}`;
    }

    if (memberId) {
      params.push(memberId);
      query += ` AND lr.member_id = $${params.length}`;
    }

    if (status) {
      params.push(status.toUpperCase());
      query += ` AND lr.status = $${params.length}`;
    }

    query += ` ORDER BY lr.reservation_date DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const res = await this.db.query(query, params);
    return res.rows;
  }

  async createReservation({ book_id, member_id, notes, schoolId }) {
    // Check if member already has active reservation for this book
    const existing = await this.db.query(
      `SELECT id FROM library_reservations WHERE book_id = $1 AND member_id = $2 AND status IN ('PENDING', 'READY_FOR_PICKUP')`,
      [book_id, member_id]
    );
    if (existing.rows.length > 0) {
      throw new Error('You already have an active reservation for this book');
    }

    // Check priority position
    const prioRes = await this.db.query(
      `SELECT COUNT(*)::int AS count FROM library_reservations WHERE book_id = $1 AND status = 'PENDING'`,
      [book_id]
    );
    const priority = (prioRes.rows[0].count || 0) + 1;

    const res = await this.db.query(
      `
      INSERT INTO library_reservations (school_id, book_id, member_id, priority, notes, status, reservation_date)
      VALUES ($1, $2, $3, $4, $5, 'PENDING', current_timestamp)
      RETURNING *
      `,
      [schoolId, book_id, member_id, priority, notes]
    );
    return res.rows[0];
  }

  async cancelReservation(id, memberId = null) {
    let query = `UPDATE library_reservations SET status = 'CANCELLED', updated_at = current_timestamp WHERE id = $1`;
    const params = [id];
    if (memberId) {
      params.push(memberId);
      query += ` AND member_id = $2`;
    }
    query += ` RETURNING *`;
    const res = await this.db.query(query, params);
    return res.rows[0] || null;
  }

  // ==========================================
  // 10. FINES & PAYMENTS & WAIVERS
  // ==========================================

  async listFines({ search, status, memberId, schoolId, limit = 50, offset = 0 }) {
    let query = `
      SELECT 
        lf.*,
        lm.member_number,
        lm.member_type,
        (u.first_name || ' ' || u.last_name) AS member_name,
        u.email AS member_email,
        u.phone AS member_phone,
        COALESCE(r.name, '') AS member_role,
        b.title AS book_title,
        b.isbn,
        lbc.accession_number,
        (waiver.first_name || ' ' || waiver.last_name) AS waived_by_name,
        COALESCE(
          json_agg(
            jsonb_build_object(
              'id', lfp.id,
              'amount', lfp.amount,
              'payment_method', lfp.payment_method,
              'reference_number', lfp.reference_number,
              'payment_date', lfp.payment_date,
              'receipt_number', lfp.receipt_number,
              'received_by_name', receiver.first_name || ' ' || receiver.last_name
            )
          ) FILTER (WHERE lfp.id IS NOT NULL), '[]'
        ) AS payments
      FROM library_fines lf
      INNER JOIN library_members lm ON lm.id = lf.member_id
      INNER JOIN users u ON u.id = lm.user_id
      LEFT JOIN roles r ON r.id = u.role_id
      LEFT JOIN library_loans ll ON ll.id = lf.loan_id
      LEFT JOIN library_books b ON b.id = ll.book_id
      LEFT JOIN library_book_copies lbc ON lbc.id = ll.copy_id
      LEFT JOIN users waiver ON waiver.id = lf.waived_by
      LEFT JOIN library_fine_payments lfp ON lfp.fine_id = lf.id
      LEFT JOIN users receiver ON receiver.id = lfp.received_by
      WHERE (lf.school_id = $1 OR lf.school_id IS NULL)
    `;
    const params = [schoolId];

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      query += ` AND (
        LOWER(lm.member_number) LIKE $${params.length}
        OR LOWER(u.first_name || ' ' || u.last_name) LIKE $${params.length}
        OR LOWER(COALESCE(b.title, '')) LIKE $${params.length}
      )`;
    }

    if (status) {
      params.push(status.toUpperCase());
      query += ` AND lf.status = $${params.length}`;
    }

    if (memberId) {
      params.push(memberId);
      query += ` AND lf.member_id = $${params.length}`;
    }

    query += ` GROUP BY lf.id, lm.id, u.id, r.name, b.id, lbc.id, waiver.id`;
    query += ` ORDER BY lf.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const res = await this.db.query(query, params);
    return res.rows;
  }

  async recordFinePayment({ fineId, amount, paymentMethod = 'CASH', referenceNumber, notes, receivedByUserId, schoolId = null }) {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      const fineRes = await client.query(`SELECT * FROM library_fines WHERE id = $1 FOR UPDATE`, [fineId]);
      if (fineRes.rows.length === 0) {
        throw new Error('Fine record not found');
      }
      const fine = fineRes.rows[0];
      if (fine.status === 'PAID' || fine.status === 'WAIVED') {
        throw new Error(`Fine is already ${fine.status.toLowerCase()}`);
      }

      const currentBalance = Number(fine.amount) - Number(fine.amount_paid);
      const payAmount = Number(amount);
      if (payAmount > currentBalance) {
        throw new Error(`Payment amount (${payAmount}) exceeds remaining balance (${currentBalance})`);
      }

      const receiptNumber = `REC-LIB-${Date.now().toString().slice(-6)}`;

      // 1. Insert payment
      const paymentRes = await client.query(
        `
        INSERT INTO library_fine_payments (
          fine_id, amount, payment_method, reference_number, received_by, receipt_number, notes, payment_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, current_timestamp)
        RETURNING *
        `,
        [fineId, payAmount, paymentMethod, referenceNumber || null, receivedByUserId, receiptNumber, notes || null]
      );

      // 2. Update fine balance & status
      const newPaid = Number(fine.amount_paid) + payAmount;
      const newStatus = newPaid >= Number(fine.amount) ? 'PAID' : 'PARTIALLY_PAID';
      await client.query(
        `UPDATE library_fines SET amount_paid = $1, status = $2, updated_at = current_timestamp WHERE id = $3`,
        [newPaid, newStatus, fineId]
      );

      // 3. Audit log
      await client.query(
        `
        INSERT INTO library_audit_logs (school_id, user_id, action, entity_type, entity_id, details)
        VALUES ($1, $2, 'FINE_PAID', 'FINE', $3, $4)
        `,
        [
          schoolId || fine.school_id,
          receivedByUserId,
          fineId,
          JSON.stringify({
            amount_paid: payAmount,
            receipt_number: receiptNumber,
            status: newStatus,
            payment_method: paymentMethod,
          }),
        ]
      );

      await client.query('COMMIT');
      return paymentRes.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async waiveFine({ fineId, waivedByUserId, waivedReason, schoolId = null }) {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      const fineRes = await client.query(`SELECT * FROM library_fines WHERE id = $1 FOR UPDATE`, [fineId]);
      if (fineRes.rows.length === 0) {
        throw new Error('Fine record not found');
      }
      const fine = fineRes.rows[0];
      if (fine.status === 'PAID' || fine.status === 'WAIVED') {
        throw new Error(`Fine is already ${fine.status.toLowerCase()}`);
      }

      await client.query(
        `
        UPDATE library_fines SET 
          status = 'WAIVED', 
          waived_by = $1, 
          waived_reason = $2, 
          updated_at = current_timestamp 
        WHERE id = $3
        `,
        [waivedByUserId, waivedReason, fineId]
      );

      await client.query(
        `
        INSERT INTO library_audit_logs (school_id, user_id, action, entity_type, entity_id, details)
        VALUES ($1, $2, 'FINE_WAIVED', 'FINE', $3, $4)
        `,
        [
          schoolId || fine.school_id,
          waivedByUserId,
          fineId,
          JSON.stringify({
            waived_amount: Number(fine.amount) - Number(fine.amount_paid),
            reason: waivedReason,
          }),
        ]
      );

      await client.query('COMMIT');
      return true;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // ==========================================
  // 11. REPORTS & KPI ANALYTICS
  // ==========================================

  async getLibraryStats(schoolId = null) {
    const statsQuery = `
      SELECT
        (SELECT COUNT(*)::int FROM library_books WHERE deleted_at IS NULL AND (school_id = $1 OR $1 IS NULL)) AS total_titles,
        (SELECT COUNT(*)::int FROM library_book_copies WHERE deleted_at IS NULL AND (school_id = $1 OR $1 IS NULL)) AS total_copies,
        (SELECT COUNT(*)::int FROM library_book_copies WHERE status = 'AVAILABLE' AND deleted_at IS NULL AND (school_id = $1 OR $1 IS NULL)) AS available_copies,
        (SELECT COUNT(*)::int FROM library_book_copies WHERE status = 'BORROWED' AND deleted_at IS NULL AND (school_id = $1 OR $1 IS NULL)) AS borrowed_copies,
        (SELECT COUNT(*)::int FROM library_book_copies WHERE status IN ('LOST', 'DAMAGED', 'MAINTENANCE') AND deleted_at IS NULL AND (school_id = $1 OR $1 IS NULL)) AS damaged_or_lost_copies,
        (SELECT COUNT(*)::int FROM library_loans WHERE status = 'ACTIVE' AND (school_id = $1 OR $1 IS NULL)) AS active_loans,
        (SELECT COUNT(*)::int FROM library_loans WHERE status = 'ACTIVE' AND due_date < current_timestamp AND (school_id = $1 OR $1 IS NULL)) AS overdue_loans,
        (SELECT COUNT(*)::int FROM library_members WHERE status = 'ACTIVE' AND deleted_at IS NULL AND (school_id = $1 OR $1 IS NULL)) AS active_members,
        (SELECT COUNT(*)::int FROM library_reservations WHERE status IN ('PENDING', 'READY_FOR_PICKUP') AND (school_id = $1 OR $1 IS NULL)) AS active_reservations,
        (SELECT COALESCE(SUM(amount_paid), 0)::numeric(10,2) FROM library_fine_payments lfp INNER JOIN library_fines lf ON lf.id = lfp.fine_id WHERE (lf.school_id = $1 OR $1 IS NULL)) AS total_fines_collected,
        (SELECT COALESCE(SUM(amount - amount_paid), 0)::numeric(10,2) FROM library_fines WHERE status IN ('UNPAID', 'PARTIALLY_PAID') AND (school_id = $1 OR $1 IS NULL)) AS outstanding_fines
    `;
    const res = await this.db.query(statsQuery, [schoolId]);
    return res.rows[0];
  }

  async getTopBorrowedBooks(schoolId = null, limit = 10) {
    const query = `
      SELECT 
        b.id,
        b.title,
        b.isbn,
        b.cover_image,
        c.name AS category_name,
        s.name AS subject_name,
        COUNT(ll.id)::int AS borrow_count
      FROM library_books b
      INNER JOIN library_loans ll ON ll.book_id = b.id
      LEFT JOIN library_categories c ON c.id = b.category_id
      LEFT JOIN library_subjects s ON s.id = b.subject_id
      WHERE (b.school_id = $1 OR b.school_id IS NULL) AND b.deleted_at IS NULL
      GROUP BY b.id, c.name, s.name
      ORDER BY borrow_count DESC
      LIMIT $2
    `;
    const res = await this.db.query(query, [schoolId, limit]);
    return res.rows;
  }

  // ==========================================
  // 12. AUDIT LOGS
  // ==========================================

  async listAuditLogs({ action, entityType, userId, schoolId, limit = 50, offset = 0 }) {
    let query = `
      SELECT 
        la.*,
        (u.first_name || ' ' || u.last_name) AS user_name,
        u.email AS user_email,
        COALESCE(r.name, '') AS user_role
      FROM library_audit_logs la
      LEFT JOIN users u ON u.id = la.user_id
      LEFT JOIN roles r ON r.id = u.role_id
      WHERE (la.school_id = $1 OR la.school_id IS NULL)
    `;
    const params = [schoolId];

    if (action) {
      params.push(action);
      query += ` AND la.action = $${params.length}`;
    }

    if (entityType) {
      params.push(entityType);
      query += ` AND la.entity_type = $${params.length}`;
    }

    if (userId) {
      params.push(userId);
      query += ` AND la.user_id = $${params.length}`;
    }

    query += ` ORDER BY la.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const res = await this.db.query(query, params);
    return res.rows;
  }
}

module.exports = LibraryRepository;
