const config = require('../config/env');

class OdooService {
  constructor() {
    this.baseUrl = config.odoo.baseUrl.replace(/\/+$/, '');
    this.db = config.odoo.db;
    this.login = config.odoo.login;
    this.password = config.odoo.password;
    this.companyId = config.odoo.companyId;
    this.enabled = config.odoo.enabled;

    this.accessToken = null;
    this.tokenExpiresAt = 0;
  }

  /**
   * Check if Odoo integration is configured and enabled
   */
  isEnabled() {
    return Boolean(this.enabled);
  }

  /**
   * Obtain or refresh Bearer JWT token from Odoo ERP hb_jwt endpoint
   */
  async getAuthToken(forceRefresh = false) {
    const now = Date.now();
    // Return cached token if valid for at least 60 more seconds
    if (!forceRefresh && this.accessToken && now < this.tokenExpiresAt - 60000) {
      return this.accessToken;
    }

    const url = `${this.baseUrl}/api/auth/login`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          db: this.db,
          login: this.login,
          password: this.password,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Odoo auth failed [${response.status}]: ${errorText}`);
      }

      const data = await response.json();
      const token = data.access_token || data.token;
      if (!token) {
        throw new Error('Odoo auth response missing access_token');
      }

      this.accessToken = token;
      // Default ttl 15 days or response expires_in (seconds)
      const ttlMs = (data.expires_in || 15 * 86400) * 1000;
      this.tokenExpiresAt = now + ttlMs;

      return this.accessToken;
    } catch (err) {
      console.error('[OdooService] Authentication error:', err.message);
      throw err;
    }
  }

  /**
   * Internal authenticated HTTP request helper with automatic 401 token refresh retry
   */
  async request(path, options = {}) {
    if (!this.isEnabled()) {
      return { skipped: true, reason: 'Odoo integration is disabled in configuration' };
    }

    let token = await this.getAuthToken();
    const url = `${this.baseUrl}/${path.replace(/^\/+/, '')}`;

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    };

    let response = await fetch(url, {
      ...options,
      headers,
    });

    // If token expired, clear cache and retry once
    if (response.status === 401) {
      console.warn('[OdooService] Token expired or invalid, refreshing and retrying...');
      token = await this.getAuthToken(true);
      headers.Authorization = `Bearer ${token}`;
      response = await fetch(url, {
        ...options,
        headers,
      });
    }

    const json = await response.json().catch(() => null);

    if (!response.ok) {
      const errMsg = json?.error || json?.message || `HTTP ${response.status}: ${response.statusText}`;
      const error = new Error(`Odoo API Error [${response.status}]: ${errMsg}`);
      error.status = response.status;
      error.details = json?.details || json;
      throw error;
    }

    return json;
  }

  /**
   * Push student and parent partner records to Odoo ERP
   * @param {Object} studentData
   */
  async syncStudent({ student, parent }) {
    if (!this.isEnabled()) {
      return { skipped: true };
    }

    const payload = {
      student_id: String(student.id),
      admission_number: String(student.admission_number || student.id),
      full_name: `${student.first_name || ''} ${student.last_name || ''}`.trim(),
      gender: student.gender || undefined,
      date_of_birth: student.date_of_birth ? new Date(student.date_of_birth).toISOString().split('T')[0] : undefined,
      grade_name: student.grade_name || undefined,
      section_name: student.section_name || undefined,
      email: student.email || undefined,
      phone: student.phone || undefined,
      address: student.address || undefined,
      company_id: this.companyId,
    };

    if (parent) {
      payload.parent = {
        parent_id: String(parent.id || parent.user_id),
        full_name: `${parent.first_name || ''} ${parent.last_name || ''}`.trim() || parent.full_name || 'Parent/Guardian',
        email: parent.email || undefined,
        phone: parent.phone || undefined,
        relationship: parent.relationship || undefined,
        address: parent.address || undefined,
      };
    }

    const result = await this.request('api/v1/sms/student/push', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return result?.data || result;
  }

  /**
   * Push fee invoice to Odoo ERP
   * @param {Object} params
   */
  async syncInvoice({ invoice, student, lines }) {
    if (!this.isEnabled()) {
      return { skipped: true };
    }

    const invoiceLines = (lines && lines.length > 0)
      ? lines.map((item) => ({
          name: item.description || item.fee_category_name || 'School Fee',
          amount: Number(item.amount || item.unit_price || 0),
          quantity: Number(item.quantity || 1),
          fee_category: item.fee_category_name || undefined,
        }))
      : [
          {
            name: invoice.title || 'Student Fee Invoice',
            amount: Number(invoice.total_amount || 0),
            quantity: 1,
          },
        ];

    const payload = {
      invoice_number: String(invoice.invoice_number || invoice.id),
      student_id: String(invoice.student_id || student.id),
      invoice_date: new Date(invoice.issue_date || invoice.created_at || Date.now()).toISOString().split('T')[0],
      due_date: new Date(invoice.due_date || Date.now()).toISOString().split('T')[0],
      academic_year: invoice.academic_year_name || undefined,
      term: invoice.term_name || undefined,
      currency: 'ETB',
      lines: invoiceLines,
      auto_post: true,
      company_id: this.companyId,
    };

    const result = await this.request('api/v1/sms/invoice/push', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return result?.data || result;
  }

  /**
   * Push fee payment to Odoo ERP and reconcile against the invoice
   * @param {Object} params
   */
  async syncPayment({ payment, invoice, student }) {
    if (!this.isEnabled()) {
      return { skipped: true };
    }

    const payload = {
      payment_reference: String(payment.id || payment.transaction_reference),
      receipt_number: String(payment.receipt_number || payment.id),
      invoice_number: String(invoice.invoice_number || invoice.id),
      student_id: String(payment.student_id || student?.id || invoice.student_id),
      amount: Number(payment.amount),
      payment_date: new Date(payment.payment_date || Date.now()).toISOString().split('T')[0],
      payment_method: (payment.payment_method || 'CASH').toUpperCase(),
      bank_name: payment.bank_name || undefined,
      transaction_reference: payment.transaction_reference || undefined,
      memo: payment.remarks || `Payment ${payment.receipt_number}`,
      company_id: this.companyId,
    };

    const result = await this.request('api/v1/sms/payment/push', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return result?.data || result;
  }

  /**
   * Check synchronization status and health with Odoo ERP
   */
  async getSyncStatus() {
    if (!this.isEnabled()) {
      return {
        enabled: false,
        message: 'Odoo integration is currently disabled (ODOO_ENABLED=false)',
      };
    }

    return this.request('api/v1/sms/sync/status', {
      method: 'GET',
    });
  }
}

module.exports = new OdooService();
