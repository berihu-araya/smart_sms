const odooService = require('../../services/odoo.service');
const { db } = require('../../config/database');

/**
 * Controller for managing Smart SMS ↔ Odoo 18 ERP integration operations.
 */
class OdooIntegrationController {
  /**
   * Check connection and sync metrics with Odoo ERP
   */
  async getStatus(req, res, next) {
    try {
      if (!odooService.isEnabled()) {
        return res.json({
          success: true,
          enabled: false,
          message: 'Odoo integration is disabled (ODOO_ENABLED=false)',
        });
      }

      const status = await odooService.getSyncStatus();
      return res.json({
        success: true,
        enabled: true,
        odoo: status,
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * Batch synchronize unsynced students to Odoo ERP
   */
  async syncStudents(req, res, next) {
    try {
      if (!odooService.isEnabled()) {
        return res.status(400).json({ success: false, message: 'Odoo integration is disabled' });
      }

      const schoolId = req.user.school_id;
      const limit = Number(req.query.limit || 50);

      // Select students who haven't been synced or were updated after last sync
      const query = `
        SELECT s.*, 
               g.name as grade_name, 
               sec.name as section_name,
               p.id as parent_pk, p.full_name as parent_full_name, p.phone as parent_phone, p.email as parent_email, p.relationship as parent_relationship, p.address as parent_address
        FROM students s
        LEFT JOIN sections sec ON s.section_id = sec.id
        LEFT JOIN grades g ON sec.grade_id = g.id
        LEFT JOIN parents p ON s.parent_id = p.id
        WHERE (s.school_id = $1 OR s.school_id IS NULL) 
          AND s.deleted_at IS NULL
          AND (s.odoo_partner_id IS NULL OR s.updated_at > s.odoo_synced_at)
        LIMIT $2
      `;

      const result = await db.query(query, [schoolId, limit]);
      const students = result.rows;
      const synced = [];
      const errors = [];

      for (const row of students) {
        try {
          const studentPayload = {
            id: row.id,
            admission_number: row.admission_number,
            first_name: row.first_name,
            last_name: row.last_name,
            gender: row.gender,
            date_of_birth: row.date_of_birth,
            grade_name: row.grade_name,
            section_name: row.section_name,
            email: row.email,
            phone: row.phone,
            address: row.address,
          };

          const parentPayload = row.parent_pk
            ? {
                id: row.parent_pk,
                full_name: row.parent_full_name,
                phone: row.parent_phone,
                email: row.parent_email,
                relationship: row.parent_relationship,
                address: row.parent_address,
              }
            : null;

          const resData = await odooService.syncStudent({
            student: studentPayload,
            parent: parentPayload,
          });

          if (resData?.odoo_partner_id) {
            await db.query(
              `UPDATE students SET odoo_partner_id = $1, odoo_synced_at = CURRENT_TIMESTAMP WHERE id = $2`,
              [resData.odoo_partner_id, row.id]
            );
            synced.push({ student_id: row.id, odoo_partner_id: resData.odoo_partner_id });
          }
        } catch (e) {
          errors.push({ student_id: row.id, error: e.message });
        }
      }

      return res.json({
        success: true,
        total_found: students.length,
        synced_count: synced.length,
        synced,
        errors,
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * Batch synchronize unsynced invoices to Odoo ERP
   */
  async syncInvoices(req, res, next) {
    try {
      if (!odooService.isEnabled()) {
        return res.status(400).json({ success: false, message: 'Odoo integration is disabled' });
      }

      const schoolId = req.user.school_id;
      const limit = Number(req.query.limit || 50);

      const invQuery = `
        SELECT i.*, 
               ay.name as academic_year_name
        FROM student_fee_invoices i
        LEFT JOIN academic_years ay ON i.academic_year_id = ay.id
        WHERE (i.school_id = $1 OR i.school_id IS NULL)
          AND i.deleted_at IS NULL
          AND i.status != 'CANCELLED'
          AND i.odoo_move_id IS NULL
        LIMIT $2
      `;

      const invRes = await db.query(invQuery, [schoolId, limit]);
      const invoices = invRes.rows;
      const synced = [];
      const errors = [];

      for (const invoice of invoices) {
        try {
          // Fetch invoice items
          const itemsRes = await db.query(
            `SELECT item.*, fc.name as fee_category_name 
             FROM student_fee_invoice_items item
             LEFT JOIN fee_categories fc ON item.fee_category_id = fc.id
             WHERE item.invoice_id = $1`,
            [invoice.id]
          );

          const odooRes = await odooService.syncInvoice({
            invoice,
            student: { id: invoice.student_id },
            lines: itemsRes.rows,
          });

          if (odooRes?.odoo_invoice_id) {
            await db.query(
              `UPDATE student_fee_invoices 
               SET odoo_move_id = $1, odoo_invoice_number = $2, odoo_synced_at = CURRENT_TIMESTAMP 
               WHERE id = $3`,
              [odooRes.odoo_invoice_id, odooRes.invoice_number, invoice.id]
            );
            synced.push({ invoice_id: invoice.id, odoo_move_id: odooRes.odoo_invoice_id });
          }
        } catch (e) {
          errors.push({ invoice_id: invoice.id, error: e.message });
        }
      }

      return res.json({
        success: true,
        total_found: invoices.length,
        synced_count: synced.length,
        synced,
        errors,
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * Batch synchronize unsynced fee payments to Odoo ERP
   */
  async syncPayments(req, res, next) {
    try {
      if (!odooService.isEnabled()) {
        return res.status(400).json({ success: false, message: 'Odoo integration is disabled' });
      }

      const schoolId = req.user.school_id;
      const limit = Number(req.query.limit || 50);

      const payQuery = `
        SELECT p.*, i.invoice_number, i.total_amount, i.paid_amount, i.balance_amount
        FROM fee_payments p
        JOIN student_fee_invoices i ON p.invoice_id = i.id
        WHERE (p.school_id = $1 OR p.school_id IS NULL)
          AND p.deleted_at IS NULL
          AND p.status = 'COMPLETED'
          AND p.odoo_payment_id IS NULL
        LIMIT $2
      `;

      const payRes = await db.query(payQuery, [schoolId, limit]);
      const payments = payRes.rows;
      const synced = [];
      const errors = [];

      for (const payment of payments) {
        try {
          const odooRes = await odooService.syncPayment({
            payment,
            invoice: { id: payment.invoice_id, invoice_number: payment.invoice_number },
            student: { id: payment.student_id },
          });

          if (odooRes?.odoo_payment_id) {
            await db.query(
              `UPDATE fee_payments 
               SET odoo_payment_id = $1, odoo_synced_at = CURRENT_TIMESTAMP 
               WHERE id = $2`,
              [odooRes.odoo_payment_id, payment.id]
            );
            synced.push({ payment_id: payment.id, odoo_payment_id: odooRes.odoo_payment_id });
          }
        } catch (e) {
          errors.push({ payment_id: payment.id, error: e.message });
        }
      }

      return res.json({
        success: true,
        total_found: payments.length,
        synced_count: synced.length,
        synced,
        errors,
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * Batch synchronize unsynced staff members (Teachers, Librarians, Accountants, Drivers, Guards, Admins)
   * along with their full contract and independent allowances to Odoo ERP
   */
  async syncStaff(req, res, next) {
    try {
      if (!odooService.isEnabled()) {
        return res.status(400).json({ success: false, message: 'Odoo integration is disabled' });
      }

      const schoolId = req.user.school_id;
      const limit = Number(req.query.limit || 100);

      // Select all staff users (excluding students & parents) joined with teachers & salary structures
      const staffQuery = `
        SELECT u.id as user_id, 
               u.first_name, 
               u.last_name, 
               u.email, 
               u.phone, 
               r.name as role_name,
               t.id as teacher_pk,
               t.employee_number as teacher_employee_number,
               t.gender as teacher_gender,
               t.designation as teacher_designation,
               t.department as teacher_department,
               t.joining_date as teacher_joining_date,
               ss.base_salary,
               ss.housing_allowance,
               ss.transport_allowance,
               ss.medical_allowance,
               ss.professional_allowance,
               ss.other_allowances,
               ss.contract_type,
               ss.contract_start_date,
               ss.contract_end_date,
               u.odoo_employee_id as user_odoo_id,
               t.odoo_employee_id as teacher_odoo_id,
               u.odoo_synced_at as user_odoo_synced_at,
               t.odoo_synced_at as teacher_odoo_synced_at
        FROM users u
        JOIN roles r ON u.role_id = r.id
        LEFT JOIN teachers t ON t.user_id = u.id AND t.deleted_at IS NULL
        LEFT JOIN salary_structures ss ON ss.user_id = u.id AND ss.deleted_at IS NULL AND ss.is_active = TRUE
        WHERE r.name NOT IN ('Student', 'Parent')
          AND (u.school_id = $1 OR u.school_id IS NULL)
          AND u.deleted_at IS NULL
          AND (
            u.odoo_employee_id IS NULL 
            OR u.updated_at > u.odoo_synced_at
            OR (t.id IS NOT NULL AND (t.odoo_employee_id IS NULL OR t.updated_at > t.odoo_synced_at))
            OR (ss.id IS NOT NULL AND ss.updated_at > COALESCE(u.odoo_synced_at, '1970-01-01'::timestamptz))
          )
        ORDER BY r.name ASC, u.first_name ASC
        LIMIT $2
      `;

      const staffRes = await db.query(staffQuery, [schoolId, limit]);
      const staffMembers = staffRes.rows;
      const synced = [];
      const errors = [];

      for (const row of staffMembers) {
        try {
          // Construct normalized staff profile
          const staffPayload = {
            id: row.teacher_pk || row.user_id,
            user_id: row.user_id,
            employee_number: row.teacher_employee_number || `EMP-${row.role_name.slice(0, 3).toUpperCase()}-${row.user_id.slice(0, 8)}`,
            first_name: row.first_name,
            last_name: row.last_name,
            email: row.email,
            phone: row.phone,
            gender: row.teacher_gender,
            role_name: row.role_name,
            designation: row.teacher_designation || (row.role_name === 'Staff' ? 'Support & Operations Staff' : row.role_name),
            department: row.teacher_department,
            joining_date: row.teacher_joining_date,
          };

          // Construct salary structure and independent allowances breakdown
          const salaryStructurePayload = row.base_salary ? {
            base_salary: Number(row.base_salary || 0),
            housing_allowance: Number(row.housing_allowance || 0),
            transport_allowance: Number(row.transport_allowance || 0),
            medical_allowance: Number(row.medical_allowance || 0),
            professional_allowance: Number(row.professional_allowance || 0),
            other_allowances: Number(row.other_allowances || 0),
            contract_type: row.contract_type || 'PERMANENT',
            contract_start_date: row.contract_start_date,
            contract_end_date: row.contract_end_date,
          } : null;

          const resData = await odooService.syncStaff({
            staff: staffPayload,
            salaryStructure: salaryStructurePayload,
          });

          if (resData?.odoo_employee_id) {
            // Update users table
            await db.query(
              `UPDATE users SET odoo_employee_id = $1, odoo_synced_at = CURRENT_TIMESTAMP WHERE id = $2`,
              [resData.odoo_employee_id, row.user_id]
            );

            // Update teachers table if teacher record exists
            if (row.teacher_pk) {
              await db.query(
                `UPDATE teachers SET odoo_employee_id = $1, odoo_synced_at = CURRENT_TIMESTAMP WHERE id = $2`,
                [resData.odoo_employee_id, row.teacher_pk]
              );
            }

            synced.push({
              user_id: row.user_id,
              name: `${row.first_name} ${row.last_name}`,
              role: row.role_name,
              designation: staffPayload.designation,
              department: resData.department,
              odoo_employee_id: resData.odoo_employee_id,
              contract_id: resData.odoo_contract_id,
              wage: resData.base_salary,
              allowances: resData.allowances,
            });
          }
        } catch (e) {
          errors.push({ user_id: row.user_id, name: `${row.first_name} ${row.last_name}`, error: e.message });
        }
      }

      return res.json({
        success: true,
        total_found: staffMembers.length,
        synced_count: synced.length,
        synced,
        errors,
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * Batch synchronize disbursed payroll runs to Odoo ERP (General Ledger journal entries)
   */
  async syncPayroll(req, res, next) {
    try {
      if (!odooService.isEnabled()) {
        return res.status(400).json({ success: false, message: 'Odoo integration is disabled' });
      }

      const schoolId = req.user.school_id;
      const limit = Number(req.query.limit || 20);

      // Select approved or paid payroll runs that haven't been synced to Odoo
      const runQuery = `
        SELECT pr.*
        FROM payroll_runs pr
        WHERE (pr.school_id = $1 OR pr.school_id IS NULL)
          AND pr.deleted_at IS NULL
          AND pr.status IN ('APPROVED', 'PAID', 'DONE')
          AND pr.odoo_entry_id IS NULL
        ORDER BY pr.year DESC, pr.month DESC
        LIMIT $2
      `;

      const runRes = await db.query(runQuery, [schoolId, limit]);
      const runs = runRes.rows;
      const synced = [];
      const errors = [];

      for (const run of runs) {
        try {
          // Fetch payslips for this run to aggregate taxes and pensions if needed
          const slipsRes = await db.query(
            `SELECT * FROM payslips WHERE payroll_run_id = $1`,
            [run.id]
          );

          const odooRes = await odooService.syncPayrollRun({
            payrollRun: run,
            payslips: slipsRes.rows,
          });

          if (odooRes?.odoo_entry_id) {
            await db.query(
              `UPDATE payroll_runs 
               SET odoo_entry_id = $1, odoo_entry_number = $2, odoo_synced_at = CURRENT_TIMESTAMP
               WHERE id = $3`,
              [odooRes.odoo_entry_id, odooRes.entry_number, run.id]
            );
            synced.push({
              payroll_run_id: run.id,
              batch_reference: run.batch_reference,
              odoo_entry_id: odooRes.odoo_entry_id,
              entry_number: odooRes.entry_number,
              state: odooRes.state,
            });
          }
        } catch (e) {
          errors.push({ payroll_run_id: run.id, batch_reference: run.batch_reference, error: e.message });
        }
      }

      return res.json({
        success: true,
        total_found: runs.length,
        synced_count: synced.length,
        synced,
        errors,
      });
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = new OdooIntegrationController();
