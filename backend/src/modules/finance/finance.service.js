/**
 * Finance Service Layer
 * Enforces business rules, transactions, and domain calculations.
 */

function calculateProgressiveIncomeTax(taxableIncome) {
  if (taxableIncome <= 600) return 0;
  if (taxableIncome <= 1650) return Number(((taxableIncome * 0.10) - 60).toFixed(2));
  if (taxableIncome <= 3200) return Number(((taxableIncome * 0.15) - 142.50).toFixed(2));
  if (taxableIncome <= 5250) return Number(((taxableIncome * 0.20) - 302.50).toFixed(2));
  if (taxableIncome <= 7800) return Number(((taxableIncome * 0.25) - 565.00).toFixed(2));
  if (taxableIncome <= 10900) return Number(((taxableIncome * 0.30) - 955.00).toFixed(2));
  return Number(((taxableIncome * 0.35) - 1500.00).toFixed(2));
}

class FinanceService {
  constructor(repository, database) {
    this.repo = repository;
    this.db = database;
  }

  // ==========================================
  // 1. INVOICE CREATION & BATCH GENERATION
  // ==========================================
  async createCustomInvoice(schoolId, userId, data) {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      // Fetch student info
      const studentRes = await client.query(
        `SELECT id, section_id, (SELECT grade_id FROM sections WHERE id = students.section_id) as grade_id 
         FROM students WHERE id = $1 AND (school_id = $2 OR school_id IS NULL) AND deleted_at IS NULL`,
        [data.student_id, schoolId]
      );
      if (studentRes.rows.length === 0) {
        throw new Error('Student not found');
      }
      const student = studentRes.rows[0];

      // Sequential invoice number
      const countRes = await client.query(
        `SELECT COUNT(*) FROM student_fee_invoices WHERE (school_id = $1 OR school_id IS NULL)`,
        [schoolId]
      );
      const count = Number(countRes.rows[0].count) + 1;
      const yearMonth = new Date().toISOString().slice(0, 7).replace('-', '');
      const invoiceNumber = `INV-${yearMonth}-${String(count).padStart(5, '0')}`;

      // Calculate totals from items
      let subtotal = 0;
      let totalDiscount = 0;
      const processedItems = [];

      for (const item of data.items) {
        const base = Number(item.base_amount) || 0;
        let discount = Number(item.discount_amount) || 0;

        if (item.fee_discount_id) {
          const discRes = await client.query(
            `SELECT * FROM fee_discounts WHERE id = $1 AND (school_id = $2 OR school_id IS NULL) AND deleted_at IS NULL`,
            [item.fee_discount_id, schoolId]
          );
          if (discRes.rows.length > 0) {
            const disc = discRes.rows[0];
            if (disc.discount_type === 'PERCENTAGE') {
              discount = (base * Number(disc.value)) / 100;
            } else {
              discount = Number(disc.value);
            }
          }
        }

        const finalAmount = Math.max(0, base - discount);
        subtotal += base;
        totalDiscount += discount;

        processedItems.push({
          fee_structure_id: item.fee_structure_id || null,
          fee_category_id: item.fee_category_id,
          fee_discount_id: item.fee_discount_id || null,
          description: item.description,
          base_amount: base,
          discount_amount: discount,
          final_amount: finalAmount,
        });
      }

      const fineAmount = Number(data.fine_amount) || 0;
      const totalAmount = (subtotal - totalDiscount) + fineAmount;

      // Insert invoice header
      const invRes = await client.query(
        `INSERT INTO student_fee_invoices 
         (school_id, invoice_number, student_id, academic_year_id, grade_id, section_id, title, month, term_name, issue_date, due_date, subtotal_amount, discount_amount, fine_amount, total_amount, paid_amount, balance_amount, status, notes, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 0.00, $15, 'UNPAID', $16, $17)
         RETURNING *`,
        [
          schoolId,
          invoiceNumber,
          data.student_id,
          data.academic_year_id || null,
          data.grade_id || student.grade_id,
          data.section_id || student.section_id,
          data.title.trim(),
          data.month ? Number(data.month) : null,
          data.term_name || null,
          data.issue_date || new Date(),
          data.due_date,
          subtotal,
          totalDiscount,
          fineAmount,
          totalAmount,
          data.notes || null,
          userId,
        ]
      );
      const invoice = invRes.rows[0];

      // Insert line items
      for (const item of processedItems) {
        await client.query(
          `INSERT INTO student_fee_invoice_items 
           (invoice_id, fee_structure_id, fee_category_id, fee_discount_id, description, base_amount, discount_amount, final_amount, paid_amount)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0.00)`,
          [
            invoice.id,
            item.fee_structure_id,
            item.fee_category_id,
            item.fee_discount_id,
            item.description,
            item.base_amount,
            item.discount_amount,
            item.final_amount,
          ]
        );
      }

      await client.query('COMMIT');
      return invoice;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async generateBatchInvoices(schoolId, userId, batchData) {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      // 1. Fetch applicable students
      let studentQuery = `
        SELECT s.id, s.section_id, sec.grade_id
        FROM students s
        LEFT JOIN sections sec ON sec.id = s.section_id
        WHERE (s.school_id = $1 OR s.school_id IS NULL)
          AND s.deleted_at IS NULL
          AND s.status = 'ACTIVE'
      `;
      const studentParams = [schoolId];

      if (batchData.section_id) {
        studentParams.push(batchData.section_id);
        studentQuery += ` AND s.section_id = $${studentParams.length}`;
      } else if (batchData.grade_id) {
        studentParams.push(batchData.grade_id);
        studentQuery += ` AND sec.grade_id = $${studentParams.length}`;
      }

      const studentsRes = await client.query(studentQuery, studentParams);
      if (studentsRes.rows.length === 0) {
        throw new Error('No active students found matching the selected grade/section');
      }

      // 2. Fetch fee structures for the grade & year
      let structQuery = `
        SELECT fs.*, fc.name as category_name
        FROM fee_structures fs
        INNER JOIN fee_categories fc ON fc.id = fs.fee_category_id
        WHERE (fs.school_id = $1 OR fs.school_id IS NULL)
          AND fs.deleted_at IS NULL
          AND fs.is_active = TRUE
      `;
      const structParams = [schoolId];

      if (batchData.academic_year_id) {
        structParams.push(batchData.academic_year_id);
        structQuery += ` AND (fs.academic_year_id = $${structParams.length} OR fs.academic_year_id IS NULL)`;
      }
      if (batchData.grade_id) {
        structParams.push(batchData.grade_id);
        structQuery += ` AND (fs.grade_id = $${structParams.length} OR fs.grade_id IS NULL)`;
      }

      const structRes = await client.query(structQuery, structParams);
      if (structRes.rows.length === 0) {
        throw new Error('No active fee structures configured for the specified academic year and grade');
      }

      const feeStructures = structRes.rows;
      const countRes = await client.query(
        `SELECT COUNT(*) FROM student_fee_invoices WHERE (school_id = $1 OR school_id IS NULL)`,
        [schoolId]
      );
      let runningCount = Number(countRes.rows[0].count);
      const yearMonth = new Date().toISOString().slice(0, 7).replace('-', '');

      let totalGenerated = 0;
      let totalAmountSum = 0;

      for (const student of studentsRes.rows) {
        runningCount++;
        const invoiceNumber = `INV-${yearMonth}-${String(runningCount).padStart(5, '0')}`;

        // Compute items
        let subtotal = 0;
        const items = [];

        for (const struct of feeStructures) {
          // If structure has grade_id and doesn't match student grade, skip
          if (struct.grade_id && struct.grade_id !== student.grade_id) continue;

          const base = Number(struct.amount);
          subtotal += base;

          items.push({
            fee_structure_id: struct.id,
            fee_category_id: struct.fee_category_id,
            description: `${struct.name} (${struct.category_name})`,
            base_amount: base,
            discount_amount: 0,
            final_amount: base,
          });
        }

        if (items.length === 0) continue;

        const invRes = await client.query(
          `INSERT INTO student_fee_invoices 
           (school_id, invoice_number, student_id, academic_year_id, grade_id, section_id, title, month, term_name, issue_date, due_date, subtotal_amount, discount_amount, fine_amount, total_amount, paid_amount, balance_amount, status, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 0.00, 0.00, $12, 0.00, $12, 'UNPAID', $13)
           RETURNING id`,
          [
            schoolId,
            invoiceNumber,
            student.id,
            batchData.academic_year_id,
            student.grade_id || batchData.grade_id,
            student.section_id,
            batchData.title.trim(),
            batchData.month ? Number(batchData.month) : null,
            batchData.term_name || null,
            batchData.issue_date || new Date(),
            batchData.due_date,
            subtotal,
            userId,
          ]
        );
        const invoiceId = invRes.rows[0].id;

        for (const item of items) {
          await client.query(
            `INSERT INTO student_fee_invoice_items 
             (invoice_id, fee_structure_id, fee_category_id, description, base_amount, discount_amount, final_amount, paid_amount)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 0.00)`,
            [
              invoiceId,
              item.fee_structure_id,
              item.fee_category_id,
              item.description,
              item.base_amount,
              item.discount_amount,
              item.final_amount,
            ]
          );
        }

        totalGenerated++;
        totalAmountSum += subtotal;
      }

      await client.query('COMMIT');
      return {
        totalGenerated,
        totalAmount: totalAmountSum,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async cancelInvoice(schoolId, invoiceId, reason) {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      const invRes = await client.query(
        `SELECT * FROM student_fee_invoices 
         WHERE id = $1 AND (school_id = $2 OR school_id IS NULL) AND deleted_at IS NULL 
         FOR UPDATE`,
        [invoiceId, schoolId]
      );
      if (invRes.rows.length === 0) {
        throw new Error('Invoice not found');
      }
      const inv = invRes.rows[0];
      if (Number(inv.paid_amount) > 0) {
        throw new Error('Cannot cancel an invoice with recorded payments. Please refund or reverse payments first.');
      }

      await client.query(
        `UPDATE student_fee_invoices 
         SET status = 'CANCELLED', notes = CONCAT(COALESCE(notes, ''), ' [Cancelled: ', $1::text, ']'), updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [reason || 'Administrative cancellation', invoiceId]
      );

      await client.query('COMMIT');
      return { success: true };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // ==========================================
  // 2. PAYMENTS & RECEIPT ISSUANCE
  // ==========================================
  async recordPayment(schoolId, userId, paymentData) {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      // 1. Lock invoice row
      const invRes = await client.query(
        `SELECT * FROM student_fee_invoices 
         WHERE id = $1 AND (school_id = $2 OR school_id IS NULL) AND deleted_at IS NULL 
         FOR UPDATE`,
        [paymentData.invoice_id, schoolId]
      );
      if (invRes.rows.length === 0) {
        throw new Error('Invoice not found');
      }
      const invoice = invRes.rows[0];

      if (invoice.status === 'CANCELLED') {
        throw new Error('Cannot accept payment for a cancelled invoice');
      }

      const balance = Number(invoice.balance_amount);
      const paymentAmount = Number(paymentData.amount);

      if (paymentAmount <= 0) {
        throw new Error('Payment amount must be greater than zero');
      }
      if (paymentAmount > balance) {
        throw new Error(`Payment amount (${paymentAmount}) exceeds outstanding balance of (${balance})`);
      }

      // 2. Generate sequential receipt number
      const countRes = await client.query(
        `SELECT COUNT(*) FROM fee_payments WHERE (school_id = $1 OR school_id IS NULL)`,
        [schoolId]
      );
      const count = Number(countRes.rows[0].count) + 1;
      const yearMonth = new Date().toISOString().slice(0, 7).replace('-', '');
      const receiptNumber = `REC-${yearMonth}-${String(count).padStart(5, '0')}`;

      // 3. Insert payment
      const payRes = await client.query(
        `INSERT INTO fee_payments 
         (school_id, receipt_number, invoice_id, student_id, amount, payment_method, payment_date, transaction_reference, bank_name, slip_image_url, status, verified_by, verified_at, remarks, received_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'COMPLETED', $11, CURRENT_TIMESTAMP, $12, $13)
         RETURNING *`,
        [
          schoolId,
          receiptNumber,
          invoice.id,
          invoice.student_id,
          paymentAmount,
          paymentData.payment_method,
          paymentData.payment_date || new Date(),
          paymentData.transaction_reference || null,
          paymentData.bank_name || null,
          paymentData.slip_image_url || null,
          userId,
          paymentData.remarks || null,
          userId,
        ]
      );
      const payment = payRes.rows[0];

      // 4. Update invoice balances
      const newPaid = Number(invoice.paid_amount) + paymentAmount;
      const newBalance = Number(invoice.total_amount) - newPaid;
      const newStatus = newBalance <= 0 ? 'PAID' : 'PARTIALLY_PAID';

      await client.query(
        `UPDATE student_fee_invoices 
         SET paid_amount = $1, balance_amount = $2, status = $3, updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [newPaid, newBalance, newStatus, invoice.id]
      );

      await client.query('COMMIT');
      return payment;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // ==========================================
  // 3. BANK SLIP REVIEW WORKFLOW
  // ==========================================
  async reviewBankSlip(schoolId, reviewerUserId, slipId, reviewData) {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      const slipRes = await client.query(
        `SELECT * FROM bank_slip_submissions 
         WHERE id = $1 AND (school_id = $2 OR school_id IS NULL) 
         FOR UPDATE`,
        [slipId, schoolId]
      );
      if (slipRes.rows.length === 0) {
        throw new Error('Bank slip submission not found');
      }
      const slip = slipRes.rows[0];

      if (slip.status !== 'PENDING') {
        throw new Error(`Bank slip has already been reviewed (Status: ${slip.status})`);
      }

      if (reviewData.action === 'APPROVE') {
        // 1. Update slip status
        await client.query(
          `UPDATE bank_slip_submissions 
           SET status = 'APPROVED', reviewed_by = $1, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [reviewerUserId, slipId]
        );

        // 2. Automatically record payment against the invoice
        const invRes = await client.query(
          `SELECT * FROM student_fee_invoices WHERE id = $1 FOR UPDATE`,
          [slip.invoice_id]
        );
        if (invRes.rows.length === 0) {
          throw new Error('Associated invoice not found');
        }
        const invoice = invRes.rows[0];

        const countRes = await client.query(
          `SELECT COUNT(*) FROM fee_payments WHERE (school_id = $1 OR school_id IS NULL)`,
          [schoolId]
        );
        const count = Number(countRes.rows[0].count) + 1;
        const yearMonth = new Date().toISOString().slice(0, 7).replace('-', '');
        const receiptNumber = `REC-${yearMonth}-${String(count).padStart(5, '0')}`;

        const paymentAmount = Number(slip.amount);

        await client.query(
          `INSERT INTO fee_payments 
           (school_id, receipt_number, invoice_id, student_id, amount, payment_method, payment_date, transaction_reference, bank_name, slip_image_url, status, verified_by, verified_at, remarks, received_by)
           VALUES ($1, $2, $3, $4, $5, 'BANK_SLIP', $6, $7, $8, $9, 'COMPLETED', $10, CURRENT_TIMESTAMP, $11, $10)`,
          [
            schoolId,
            receiptNumber,
            invoice.id,
            invoice.student_id,
            paymentAmount,
            slip.deposit_date,
            slip.reference_number,
            slip.bank_name,
            slip.slip_attachment_url,
            reviewerUserId,
            `Bank slip verification: ${reviewData.remarks || 'Approved by accountant'}`,
          ]
        );

        const newPaid = Number(invoice.paid_amount) + paymentAmount;
        const newBalance = Math.max(0, Number(invoice.total_amount) - newPaid);
        const newStatus = newBalance <= 0 ? 'PAID' : 'PARTIALLY_PAID';

        await client.query(
          `UPDATE student_fee_invoices 
           SET paid_amount = $1, balance_amount = $2, status = $3, updated_at = CURRENT_TIMESTAMP
           WHERE id = $4`,
          [newPaid, newBalance, newStatus, invoice.id]
        );
      } else if (reviewData.action === 'REJECT') {
        await client.query(
          `UPDATE bank_slip_submissions 
           SET status = 'REJECTED', rejection_reason = $1, reviewed_by = $2, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
           WHERE id = $3`,
          [reviewData.rejection_reason || 'Bank slip verification rejected', reviewerUserId, slipId]
        );
      } else {
        throw new Error("action must be 'APPROVE' or 'REJECT'");
      }

      await client.query('COMMIT');
      return { success: true, action: reviewData.action };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // ==========================================
  // 4. MONTHLY PAYROLL PROCESSING ENGINE
  // ==========================================
  async processMonthlyPayroll(schoolId, userId, data) {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      const month = Number(data.month);
      const year = Number(data.year);

      // Check for duplicate payroll run
      const dupRes = await client.query(
        `SELECT id, status FROM payroll_runs 
         WHERE (school_id = $1 OR school_id IS NULL) AND month = $2 AND year = $3 AND deleted_at IS NULL`,
        [schoolId, month, year]
      );
      if (dupRes.rows.length > 0) {
        throw new Error(`Payroll for ${month}/${year} has already been generated (Status: ${dupRes.rows[0].status})`);
      }

      // Fetch active staff salary structures
      const structuresRes = await client.query(
        `SELECT ss.*, u.first_name, u.last_name
         FROM salary_structures ss
         INNER JOIN users u ON u.id = ss.user_id
         WHERE (ss.school_id = $1 OR ss.school_id IS NULL)
           AND ss.deleted_at IS NULL
           AND ss.is_active = TRUE
           AND u.deleted_at IS NULL`,
        [schoolId]
      );
      if (structuresRes.rows.length === 0) {
        throw new Error('No active staff salary structures configured. Please configure staff compensation first.');
      }

      const countRes = await client.query(
        `SELECT COUNT(*) FROM payroll_runs WHERE (school_id = $1 OR school_id IS NULL)`,
        [schoolId]
      );
      const batchCount = Number(countRes.rows[0].count) + 1;
      const batchRef = `PAY-RUN-${year}${String(month).padStart(2, '0')}-${String(batchCount).padStart(3, '0')}`;

      // Insert payroll run header
      const runRes = await client.query(
        `INSERT INTO payroll_runs 
         (school_id, batch_reference, month, year, status, processed_by, remarks)
         VALUES ($1, $2, $3, $4, 'PROCESSED', $5, $6)
         RETURNING id`,
        [schoolId, batchRef, month, year, userId, data.remarks || null]
      );
      const payrollRunId = runRes.rows[0].id;

      let totalStaffCount = 0;
      let totalGross = 0;
      let totalDeductions = 0;
      let totalNet = 0;

      let payslipCounter = 0;

      for (const struct of structuresRes.rows) {
        payslipCounter++;
        const payslipNumber = `PS-${year}${String(month).padStart(2, '0')}-${String(payslipCounter).padStart(4, '0')}`;

        const baseSalary = Number(struct.base_salary);
        const housing = Number(struct.housing_allowance);
        const transport = Number(struct.transport_allowance);
        const medical = Number(struct.medical_allowance);
        const otherAllowances = Number(struct.other_allowances);

        const totalAllowances = housing + transport + medical + otherAllowances;
        const grossSalary = baseSalary + totalAllowances;

        // Statutory Pension: 7% Employee, 11% Employer
        const pensionEmployeeRate = Number(struct.pension_employee_percentage) || 7.0;
        const pensionEmployerRate = Number(struct.pension_employer_percentage) || 11.0;
        const pensionEmployee = Number(((baseSalary * pensionEmployeeRate) / 100).toFixed(2));
        const pensionEmployer = Number(((baseSalary * pensionEmployerRate) / 100).toFixed(2));

        // Income tax (progressive calculation on taxable income: gross - non-taxable transport)
        const taxableIncome = Math.max(0, grossSalary - (transport > 2200 ? transport - 2200 : 0)); // standard transport exemption
        const taxDeduction = calculateProgressiveIncomeTax(taxableIncome);

        const otherDeductions = 0.00;
        const staffDeductions = pensionEmployee + taxDeduction + otherDeductions;
        const netSalary = Math.max(0, Number((grossSalary - staffDeductions).toFixed(2)));

        // Insert payslip
        const psRes = await client.query(
          `INSERT INTO payslips 
           (payroll_run_id, school_id, user_id, payslip_number, base_salary, total_allowances, gross_salary, tax_deduction, pension_employee_deduction, pension_employer_contribution, other_deductions, total_deductions, net_salary, payment_method, bank_account_number, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'BANK_TRANSFER', $14, 'GENERATED')
           RETURNING id`,
          [
            payrollRunId,
            schoolId,
            struct.user_id,
            payslipNumber,
            baseSalary,
            totalAllowances,
            grossSalary,
            taxDeduction,
            pensionEmployee,
            pensionEmployer,
            otherDeductions,
            staffDeductions,
            netSalary,
            struct.bank_account_number || null,
          ]
        );
        const payslipId = psRes.rows[0].id;

        // Insert itemized allowance/deduction breakdowns
        const items = [];
        if (housing > 0) items.push({ type: 'ALLOWANCE', name: 'Housing Allowance', amount: housing });
        if (transport > 0) items.push({ type: 'ALLOWANCE', name: 'Transport Allowance', amount: transport });
        if (medical > 0) items.push({ type: 'ALLOWANCE', name: 'Medical Allowance', amount: medical });
        if (otherAllowances > 0) items.push({ type: 'ALLOWANCE', name: 'Other Allowances', amount: otherAllowances });

        items.push({ type: 'DEDUCTION', name: `Pension Fund (${pensionEmployeeRate}%)`, amount: pensionEmployee });
        if (taxDeduction > 0) items.push({ type: 'DEDUCTION', name: 'Employment Income Tax', amount: taxDeduction });

        for (const itm of items) {
          await client.query(
            `INSERT INTO payslip_items (payslip_id, item_type, name, amount) VALUES ($1, $2, $3, $4)`,
            [payslipId, itm.type, itm.name, itm.amount]
          );
        }

        totalStaffCount++;
        totalGross += grossSalary;
        totalDeductions += staffDeductions;
        totalNet += netSalary;
      }

      // Update header totals
      await client.query(
        `UPDATE payroll_runs 
         SET total_staff_count = $1, total_gross_amount = $2, total_deductions_amount = $3, total_net_amount = $4, updated_at = CURRENT_TIMESTAMP
         WHERE id = $5`,
        [totalStaffCount, totalGross, totalDeductions, totalNet, payrollRunId]
      );

      await client.query('COMMIT');
      return {
        id: payrollRunId,
        batchReference: batchRef,
        totalStaffCount,
        totalGross,
        totalDeductions,
        totalNet,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async disbursePayroll(schoolId, userId, runId) {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      const runRes = await client.query(
        `SELECT * FROM payroll_runs 
         WHERE id = $1 AND (school_id = $2 OR school_id IS NULL) AND deleted_at IS NULL 
         FOR UPDATE`,
        [runId, schoolId]
      );
      if (runRes.rows.length === 0) {
        throw new Error('Payroll run not found');
      }

      await client.query(
        `UPDATE payroll_runs 
         SET status = 'DISBURSED', approved_by = $1, disbursed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [userId, runId]
      );

      await client.query(
        `UPDATE payslips 
         SET status = 'PAID', payment_date = CURRENT_DATE, updated_at = CURRENT_TIMESTAMP
         WHERE payroll_run_id = $1`,
        [runId]
      );

      await client.query('COMMIT');
      return { success: true };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async generateBankExportCsv(schoolId, runId) {
    const run = await this.repo.getPayrollRunById(runId, schoolId);
    if (!run) throw new Error('Payroll run not found');

    const headers = ['Payslip Number', 'Employee Name', 'Bank Name', 'Account Number', 'Net Amount', 'Payment Month'];
    const rows = (run.payslips || []).map((ps) => [
      ps.payslip_number,
      `"${ps.first_name} ${ps.last_name}"`,
      `"${ps.bank_name || 'Commercial Bank of Ethiopia'}"`,
      `"${ps.bank_account_number || ''}"`,
      Number(ps.net_salary).toFixed(2),
      `"${run.month}/${run.year}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    return {
      filename: `Bank_Salary_Transfer_${run.batch_reference}.csv`,
      csvContent,
    };
  }
}

module.exports = FinanceService;
