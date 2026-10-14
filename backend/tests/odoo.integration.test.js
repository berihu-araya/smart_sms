const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const odooService = require('../src/services/odoo.service');

describe('Odoo 18 ERP Integration Service Tests', () => {
  test('OdooService is initialized with correct configuration structure', () => {
    assert.ok(odooService);
    assert.strictEqual(typeof odooService.isEnabled, 'function');
    assert.strictEqual(typeof odooService.syncStudent, 'function');
    assert.strictEqual(typeof odooService.syncInvoice, 'function');
    assert.strictEqual(typeof odooService.syncPayment, 'function');
    assert.strictEqual(typeof odooService.getSyncStatus, 'function');
  });

  test('OdooService safely skips calls when ODOO_ENABLED is false', async () => {
    // Ensure service is disabled for this test case
    const originalState = odooService.enabled;
    odooService.enabled = false;

    try {
      const studentRes = await odooService.syncStudent({
        student: { id: 'test-123', admission_number: 'ADM-01', first_name: 'John', last_name: 'Doe' },
        parent: null,
      });
      assert.deepStrictEqual(studentRes, { skipped: true });

      const invoiceRes = await odooService.syncInvoice({
        invoice: { id: 'inv-123', invoice_number: 'INV-01', student_id: 'test-123', total_amount: 5000 },
        student: { id: 'test-123' },
        lines: [{ description: 'Tuition Fee', amount: 5000, quantity: 1 }],
      });
      assert.deepStrictEqual(invoiceRes, { skipped: true });

      const paymentRes = await odooService.syncPayment({
        payment: { id: 'pay-123', receipt_number: 'REC-01', amount: 5000, payment_method: 'CASH' },
        invoice: { id: 'inv-123', invoice_number: 'INV-01' },
        student: { id: 'test-123' },
      });
      assert.deepStrictEqual(paymentRes, { skipped: true });

      const statusRes = await odooService.getSyncStatus();
      assert.strictEqual(statusRes.enabled, false);
    } finally {
      odooService.enabled = originalState;
    }
  });

  test('OdooService correctly formats student payload with parent info', async () => {
    let capturedPayload = null;
    const originalRequest = odooService.request;

    odooService.request = async (path, options) => {
      capturedPayload = JSON.parse(options.body);
      return { status: 'success', data: { odoo_partner_id: 42 } };
    };

    const originalEnabled = odooService.enabled;
    odooService.enabled = true;

    try {
      const res = await odooService.syncStudent({
        student: {
          id: 'std-uuid-1',
          admission_number: 'ADM-2026-101',
          first_name: 'Abebe',
          last_name: 'Bikila',
          gender: 'male',
          date_of_birth: '2010-05-12',
          grade_name: 'Grade 10',
          section_name: 'Section A',
          email: 'abebe@example.com',
          phone: '+251911000000',
        },
        parent: {
          id: 'par-uuid-1',
          full_name: 'Bikila Parent',
          email: 'parent@example.com',
          phone: '+251922000000',
          relationship: 'Father',
        },
      });

      assert.strictEqual(res.odoo_partner_id, 42);
      assert.strictEqual(capturedPayload.student_id, 'std-uuid-1');
      assert.strictEqual(capturedPayload.admission_number, 'ADM-2026-101');
      assert.strictEqual(capturedPayload.full_name, 'Abebe Bikila');
      assert.strictEqual(capturedPayload.parent.full_name, 'Bikila Parent');
      assert.strictEqual(capturedPayload.parent.relationship, 'Father');
    } finally {
      odooService.request = originalRequest;
      odooService.enabled = originalEnabled;
    }
  });

  test('OdooService correctly formats fee invoice and payment payloads', async () => {
    let capturedInvoice = null;
    let capturedPayment = null;
    const originalRequest = odooService.request;

    odooService.request = async (path, options) => {
      if (path.includes('invoice')) {
        capturedInvoice = JSON.parse(options.body);
        return { status: 'success', data: { odoo_invoice_id: 101, invoice_number: 'INV/2026/0001' } };
      }
      if (path.includes('payment')) {
        capturedPayment = JSON.parse(options.body);
        return { status: 'success', data: { odoo_payment_id: 202 } };
      }
    };

    const originalEnabled = odooService.enabled;
    odooService.enabled = true;

    try {
      // 1. Test Invoice push
      const invRes = await odooService.syncInvoice({
        invoice: {
          id: 'inv-uuid-9',
          invoice_number: 'INV-2026-00009',
          student_id: 'std-uuid-1',
          issue_date: '2026-10-15',
          due_date: '2026-10-30',
          academic_year_name: '2026/2027',
          term_name: 'Term 1',
        },
        student: { id: 'std-uuid-1' },
        lines: [
          { description: 'Tuition Fee', amount: 8000, quantity: 1, fee_category_name: 'Tuition' },
          { description: 'Transport Fee', amount: 2000, quantity: 1, fee_category_name: 'Transport' },
        ],
      });

      assert.strictEqual(invRes.odoo_invoice_id, 101);
      assert.strictEqual(capturedInvoice.invoice_number, 'INV-2026-00009');
      assert.strictEqual(capturedInvoice.lines.length, 2);
      assert.strictEqual(capturedInvoice.lines[0].amount, 8000);

      // 2. Test Payment push
      const payRes = await odooService.syncPayment({
        payment: {
          id: 'pay-uuid-55',
          receipt_number: 'REC-202610-00055',
          amount: 10000,
          payment_date: '2026-10-16',
          payment_method: 'BANK_TRANSFER',
          bank_name: 'Commercial Bank of Ethiopia',
          transaction_reference: 'TXN-998877',
        },
        invoice: { invoice_number: 'INV-2026-00009' },
        student: { id: 'std-uuid-1' },
      });

      assert.strictEqual(payRes.odoo_payment_id, 202);
      assert.strictEqual(capturedPayment.payment_reference, 'pay-uuid-55');
      assert.strictEqual(capturedPayment.receipt_number, 'REC-202610-00055');
      assert.strictEqual(capturedPayment.invoice_number, 'INV-2026-00009');
      assert.strictEqual(capturedPayment.payment_method, 'BANK_TRANSFER');
      assert.strictEqual(capturedPayment.amount, 10000);
    } finally {
      odooService.request = originalRequest;
      odooService.enabled = originalEnabled;
    }
  });

  test('OdooService correctly formats staff and payroll payloads', async () => {
    let capturedStaff = null;
    let capturedPayroll = null;
    const originalRequest = odooService.request;

    odooService.request = async (path, options) => {
      if (path.includes('staff')) {
        capturedStaff = JSON.parse(options.body);
        return { status: 'success', data: { odoo_employee_id: 303, odoo_contract_id: 404 } };
      }
      if (path.includes('payroll')) {
        capturedPayroll = JSON.parse(options.body);
        return { status: 'success', data: { odoo_entry_id: 505, entry_number: 'MISC/2026/0001', state: 'posted' } };
      }
    };

    const originalEnabled = odooService.enabled;
    odooService.enabled = true;

    try {
      // 1. Test Staff Push with full allowances & department mapping
      const staffRes = await odooService.syncStaff({
        staff: {
          id: 'stf-uuid-1',
          employee_number: 'LIB-001',
          first_name: 'Sara',
          last_name: 'Worku',
          gender: 'female',
          email: 'sara.worku@school.com',
          phone: '+251911223344',
          designation: 'Head Librarian',
          role_name: 'Librarian',
          department: 'Library Services',
          joining_date: '2024-09-01',
        },
        salaryStructure: {
          base_salary: 22000,
          housing_allowance: 4000,
          transport_allowance: 2000,
          medical_allowance: 1000,
          professional_allowance: 1500,
          other_allowances: 500,
          contract_type: 'PERMANENT',
          contract_start_date: '2024-09-01',
          contract_end_date: '2026-08-31',
        },
      });

      assert.strictEqual(staffRes.odoo_employee_id, 303);
      assert.strictEqual(staffRes.odoo_contract_id, 404);
      assert.strictEqual(capturedStaff.staff_id, 'stf-uuid-1');
      assert.strictEqual(capturedStaff.employee_number, 'LIB-001');
      assert.strictEqual(capturedStaff.full_name, 'Sara Worku');
      assert.strictEqual(capturedStaff.gender, 'female');
      assert.strictEqual(capturedStaff.designation, 'Head Librarian');
      assert.strictEqual(capturedStaff.department_name, 'Library Services');
      assert.strictEqual(capturedStaff.base_salary, 22000);
      assert.strictEqual(capturedStaff.housing_allowance, 4000);
      assert.strictEqual(capturedStaff.transport_allowance, 2000);
      assert.strictEqual(capturedStaff.medical_allowance, 1000);
      assert.strictEqual(capturedStaff.professional_allowance, 1500);
      assert.strictEqual(capturedStaff.other_allowances, 500);
      assert.strictEqual(capturedStaff.contract_start_date, '2024-09-01');
      assert.strictEqual(capturedStaff.contract_end_date, '2026-08-31');

      // 2. Test Payroll Push
      const payrollRes = await odooService.syncPayrollRun({
        payrollRun: {
          id: 'run-uuid-1',
          batch_reference: 'PAY-RUN-202610-001',
          month: 10,
          year: 2026,
          total_staff_count: 15,
          total_gross_amount: 350000,
          total_deductions_amount: 70000,
          total_net_amount: 280000,
          total_tax_amount: 45000,
          total_pension_employee_amount: 24500,
          total_pension_employer_amount: 38500,
        },
      });

      assert.strictEqual(payrollRes.odoo_entry_id, 505);
      assert.strictEqual(capturedPayroll.payroll_run_id, 'run-uuid-1');
      assert.strictEqual(capturedPayroll.batch_reference, 'PAY-RUN-202610-001');
      assert.strictEqual(capturedPayroll.month, 10);
      assert.strictEqual(capturedPayroll.year, 2026);
      assert.strictEqual(capturedPayroll.total_gross, 350000);
      assert.strictEqual(capturedPayroll.total_net, 280000);
      assert.strictEqual(capturedPayroll.total_tax, 45000);
      assert.strictEqual(capturedPayroll.total_pension_employee, 24500);
      assert.strictEqual(capturedPayroll.total_pension_employer, 38500);
    } finally {
      odooService.request = originalRequest;
      odooService.enabled = originalEnabled;
    }
  });
});

