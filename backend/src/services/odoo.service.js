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

    // If apiKey is configured, use it directly (Odoo API key or shared secret)
    if (config.odoo.apiKey) {
      this.accessToken = config.odoo.apiKey;
      this.tokenExpiresAt = Date.now() + 365 * 86400000;
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
   * Push staff/teacher record and compensation to Odoo ERP (hr.employee & hr.contract)
   * @param {Object} params
   */
  async syncStaff({ staff, salaryStructure }) {
    if (!this.isEnabled()) {
      return { skipped: true };
    }

    const payload = {
      staff_id: String(staff.id || staff.user_id),
      employee_number: String(staff.employee_number || staff.id),
      full_name: `${staff.first_name || ''} ${staff.last_name || ''}`.trim() || staff.name || 'Staff Member',
      email: staff.email || undefined,
      phone: staff.phone || undefined,
      gender: staff.gender ? staff.gender.toLowerCase() : undefined,
      designation: staff.designation || staff.role_name || 'Teacher',
      department_name: staff.department || 'Academics',
      base_salary: Number(salaryStructure?.base_salary || staff.base_salary || 0),
      contract_type: salaryStructure?.contract_type || 'PERMANENT',
      contract_start_date: staff.joining_date
        ? new Date(staff.joining_date).toISOString().split('T')[0]
        : salaryStructure?.contract_start_date
          ? new Date(salaryStructure.contract_start_date).toISOString().split('T')[0]
          : undefined,
      company_id: this.companyId,
    };

    const result = await this.request('api/v1/sms/staff/push', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return result?.data || result;
  }

  /**
   * Push monthly payroll run disbursement to Odoo ERP as balanced General Ledger journal entry
   * @param {Object} params
   */
  async syncPayrollRun({ payrollRun, payslips = [] }) {
    if (!this.isEnabled()) {
      return { skipped: true };
    }

    // Calculate aggregated taxes and pensions across payslips if not directly on payrollRun
    let totalTax = Number(payrollRun.total_tax_amount || 0);
    let totalPensionEmp = Number(payrollRun.total_pension_employee_amount || 0);
    let totalPensionEmpr = Number(payrollRun.total_pension_employer_amount || 0);

    if (payslips.length > 0 && totalTax === 0) {
      totalTax = payslips.reduce((sum, p) => sum + Number(p.tax_deduction || 0), 0);
    }
    if (payslips.length > 0 && totalPensionEmp === 0) {
      totalPensionEmp = payslips.reduce((sum, p) => sum + Number(p.pension_deduction || p.employee_pension || 0), 0);
    }
    if (payslips.length > 0 && totalPensionEmpr === 0) {
      totalPensionEmpr = payslips.reduce((sum, p) => sum + Number(p.employer_pension || 0), 0);
    }

    const payload = {
      payroll_run_id: String(payrollRun.id),
      batch_reference: String(payrollRun.batch_reference || `PAY-${payrollRun.year}-${payrollRun.month}`),
      month: Number(payrollRun.month),
      year: Number(payrollRun.year),
      total_staff_count: Number(payrollRun.total_staff_count || payslips.length || 1),
      total_gross: Number(payrollRun.total_gross_amount || 0),
      total_deductions: Number(payrollRun.total_deductions_amount || 0),
      total_net: Number(payrollRun.total_net_amount || 0),
      total_tax: Math.round(totalTax * 100) / 100,
      total_pension_employee: Math.round(totalPensionEmp * 100) / 100,
      total_pension_employer: Math.round(totalPensionEmpr * 100) / 100,
      company_id: this.companyId,
    };

    const result = await this.request('api/v1/sms/payroll/push', {
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
