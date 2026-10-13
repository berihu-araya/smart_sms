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
}

module.exports = new OdooIntegrationController();
