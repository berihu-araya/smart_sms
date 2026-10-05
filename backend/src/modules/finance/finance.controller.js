/**
 * Finance Controller Layer
 * Handles incoming HTTP requests and standardizes responses.
 */

const FinanceRepository = require('./finance.repository');
const FinanceService = require('./finance.service');
const { db } = require('../../config/database');
const {
  validateFeeCategory,
  validateFeeStructure,
  validateFeeDiscount,
  validateCreateInvoice,
  validateBatchInvoice,
  validateRecordPayment,
  validateBankSlipSubmission,
  validateExpense,
  validateIncome,
  validateSalaryStructure,
  validatePayrollRun,
} = require('./finance.validation');

const repo = new FinanceRepository(db); // Initialize the repository with the database connection
const service = new FinanceService(repo, db); // Initialize the service with the repository and database connection

// Helper for extracting school_id from authenticated user
function getSchoolId(req) {
  return req.user?.school_id || null;
} // Helper for extracting user_id safely from authenticated user payload (supports sub and id)

// Helper for extracting user_id safely from authenticated user payload (supports sub and id)
function getUserId(req) {
  return req.user?.id || req.user?.sub || req.user?.userId || null;
}

// 1. SETTINGS
async function getSettings(req, res, next) {
  try {
    const data = await repo.getSettings(getSchoolId(req));
    res.json({ success: true, message: 'Finance settings retrieved', data });
  } catch (err) {
    next(err);
  }
}

async function updateSettings(req, res, next) {
  try {
    const data = await repo.upsertSettings(getSchoolId(req), req.body);
    res.json({ success: true, message: 'Finance settings updated', data });
  } catch (err) {
    next(err);
  }
}

// 2. FEE CATEGORIES
async function listFeeCategories(req, res, next) {
  try {
    const data = await repo.listFeeCategories(getSchoolId(req));
    res.json({ success: true, message: 'Fee categories retrieved', data });
  } catch (err) {
    next(err);
  }
}

async function createFeeCategory(req, res, next) {
  try {
    const errors = validateFeeCategory(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join('; '), data: null });
    }
    const data = await repo.createFeeCategory(getSchoolId(req), req.body);
    res.status(201).json({ success: true, message: 'Fee category created', data });
  } catch (err) {
    next(err);
  }
}

async function updateFeeCategory(req, res, next) {
  try {
    const data = await repo.updateFeeCategory(req.params.id, getSchoolId(req), req.body);
    if (!data) return res.status(404).json({ success: false, message: 'Fee category not found', data: null });
    res.json({ success: true, message: 'Fee category updated', data });
  } catch (err) {
    next(err);
  }
}

async function deleteFeeCategory(req, res, next) {
  try {
    const success = await repo.deleteFeeCategory(req.params.id, getSchoolId(req));
    if (!success) return res.status(404).json({ success: false, message: 'Fee category not found', data: null });
    res.json({ success: true, message: 'Fee category deleted', data: null });
  } catch (err) {
    next(err);
  }
}

// 3. FEE STRUCTURES (Fee Master)
async function listFeeStructures(req, res, next) {
  try {
    const data = await repo.listFeeStructures(getSchoolId(req), req.query);
    res.json({ success: true, message: 'Fee structures retrieved', data });
  } catch (err) {
    next(err);
  }
}

async function createFeeStructure(req, res, next) {
  try {
    const errors = validateFeeStructure(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join('; '), data: null });
    }
    const data = await repo.createFeeStructure(getSchoolId(req), req.body);
    res.status(201).json({ success: true, message: 'Fee structure created', data });
  } catch (err) {
    next(err);
  }
}

async function updateFeeStructure(req, res, next) {
  try {
    const data = await repo.updateFeeStructure(req.params.id, getSchoolId(req), req.body);
    if (!data) return res.status(404).json({ success: false, message: 'Fee structure not found', data: null });
    res.json({ success: true, message: 'Fee structure updated', data });
  } catch (err) {
    next(err);
  }
}

async function deleteFeeStructure(req, res, next) {
  try {
    const success = await repo.deleteFeeStructure(req.params.id, getSchoolId(req));
    if (!success) return res.status(404).json({ success: false, message: 'Fee structure not found', data: null });
    res.json({ success: true, message: 'Fee structure deleted', data: null });
  } catch (err) {
    next(err);
  }
}

// 4. FEE DISCOUNTS
async function listFeeDiscounts(req, res, next) {
  try {
    const data = await repo.listFeeDiscounts(getSchoolId(req));
    res.json({ success: true, message: 'Fee discounts retrieved', data });
  } catch (err) {
    next(err);
  }
}

async function createFeeDiscount(req, res, next) {
  try {
    const errors = validateFeeDiscount(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join('; '), data: null });
    }
    const data = await repo.createFeeDiscount(getSchoolId(req), req.body);
    res.status(201).json({ success: true, message: 'Fee discount created', data });
  } catch (err) {
    next(err);
  }
}

async function updateFeeDiscount(req, res, next) {
  try {
    const data = await repo.updateFeeDiscount(req.params.id, getSchoolId(req), req.body);
    if (!data) return res.status(404).json({ success: false, message: 'Fee discount not found', data: null });
    res.json({ success: true, message: 'Fee discount updated', data });
  } catch (err) {
    next(err);
  }
}

async function deleteFeeDiscount(req, res, next) {
  try {
    const success = await repo.deleteFeeDiscount(req.params.id, getSchoolId(req));
    if (!success) return res.status(404).json({ success: false, message: 'Fee discount not found', data: null });
    res.json({ success: true, message: 'Fee discount deleted', data: null });
  } catch (err) {
    next(err);
  }
}

// 5. INVOICES
async function listInvoices(req, res, next) {
  try {
    const { data, meta } = await repo.listInvoices(getSchoolId(req), req.query);
    res.json({ success: true, message: 'Invoices retrieved successfully', data, meta });
  } catch (err) {
    next(err);
  }
}

async function getInvoiceById(req, res, next) {
  try {
    const data = await repo.getInvoiceById(req.params.id, getSchoolId(req));
    if (!data) return res.status(404).json({ success: false, message: 'Invoice not found', data: null });
    res.json({ success: true, message: 'Invoice details retrieved', data });
  } catch (err) {
    next(err);
  }
}

async function getMyInvoices(req, res, next) {
  try {
    const data = await repo.getMyInvoices(req.user, getSchoolId(req));
    res.json({ success: true, message: 'Student invoices retrieved', data });
  } catch (err) {
    next(err);
  }
}

async function createInvoice(req, res, next) {
  try {
    const errors = validateCreateInvoice(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join('; '), data: null });
    }
    const data = await service.createCustomInvoice(getSchoolId(req), getUserId(req), req.body);
    res.status(201).json({ success: true, message: 'Student invoice generated successfully', data });
  } catch (err) {
    next(err);
  }
}

async function generateBatchInvoices(req, res, next) {
  try {
    const errors = validateBatchInvoice(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join('; '), data: null });
    }
    const data = await service.generateBatchInvoices(getSchoolId(req), getUserId(req), req.body);
    res.status(201).json({ success: true, message: 'Batch invoices generated successfully', data });
  } catch (err) {
    next(err);
  }
}

async function cancelInvoice(req, res, next) {
  try {
    const data = await service.cancelInvoice(getSchoolId(req), req.params.id, req.body.reason);
    res.json({ success: true, message: 'Invoice cancelled successfully', data });
  } catch (err) {
    next(err);
  }
}

// 6. PAYMENTS
async function listPayments(req, res, next) {
  try {
    const { data, meta } = await repo.listPayments(getSchoolId(req), req.query);
    res.json({ success: true, message: 'Fee payments retrieved successfully', data, meta });
  } catch (err) {
    next(err);
  }
}

async function getPaymentById(req, res, next) {
  try {
    const data = await repo.getPaymentById(req.params.id, getSchoolId(req));
    if (!data) return res.status(404).json({ success: false, message: 'Payment receipt not found', data: null });
    res.json({ success: true, message: 'Payment receipt details retrieved', data });
  } catch (err) {
    next(err);
  }
}

async function recordPayment(req, res, next) {
  try {
    const errors = validateRecordPayment(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join('; '), data: null });
    }
    const data = await service.recordPayment(getSchoolId(req), getUserId(req), req.body);
    res.status(201).json({ success: true, message: 'Payment recorded and receipt generated', data });
  } catch (err) {
    next(err);
  }
}

// 7. BANK SLIPS
async function listBankSlips(req, res, next) {
  try {
    const data = await repo.listBankSlips(getSchoolId(req), req.query);
    res.json({ success: true, message: 'Bank slip submissions retrieved', data });
  } catch (err) {
    next(err);
  }
}

async function submitBankSlip(req, res, next) {
  try {
    const errors = validateBankSlipSubmission(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join('; '), data: null });
    }
    const data = await repo.createBankSlipSubmission(getSchoolId(req), getUserId(req), req.body);
    res.status(201).json({ success: true, message: 'Bank deposit slip submitted for accountant review', data });
  } catch (err) {
    next(err);
  }
}

async function reviewBankSlip(req, res, next) {
  try {
    const data = await service.reviewBankSlip(getSchoolId(req), getUserId(req), req.params.id, req.body);
    res.json({ success: true, message: `Bank slip has been ${req.body.action.toLowerCase()}ed`, data });
  } catch (err) {
    next(err);
  }
}

// 8. EXPENSES
async function listExpenseCategories(req, res, next) {
  try {
    const data = await repo.listExpenseCategories(getSchoolId(req));
    res.json({ success: true, message: 'Expense categories retrieved', data });
  } catch (err) {
    next(err);
  }
}

async function createExpenseCategory(req, res, next) {
  try {
    const data = await repo.createExpenseCategory(getSchoolId(req), req.body);
    res.status(201).json({ success: true, message: 'Expense category created', data });
  } catch (err) {
    next(err);
  }
}

async function updateExpenseCategory(req, res, next) {
  try {
    const data = await repo.updateExpenseCategory(req.params.id, getSchoolId(req), req.body);
    if (!data) return res.status(404).json({ success: false, message: 'Expense category not found', data: null });
    res.json({ success: true, message: 'Expense category updated', data });
  } catch (err) {
    next(err);
  }
}

async function deleteExpenseCategory(req, res, next) {
  try {
    const success = await repo.deleteExpenseCategory(req.params.id, getSchoolId(req));
    if (!success) return res.status(404).json({ success: false, message: 'Expense category not found', data: null });
    res.json({ success: true, message: 'Expense category deleted', data: null });
  } catch (err) {
    next(err);
  }
}

async function listExpenses(req, res, next) {
  try {
    const { data, meta } = await repo.listExpenses(getSchoolId(req), req.query);
    res.json({ success: true, message: 'Expenses retrieved successfully', data, meta });
  } catch (err) {
    next(err);
  }
}

async function createExpense(req, res, next) {
  try {
    const errors = validateExpense(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join('; '), data: null });
    }
    const data = await repo.createExpense(getSchoolId(req), getUserId(req), req.body);
    res.status(201).json({ success: true, message: 'Expense voucher logged successfully', data });
  } catch (err) {
    next(err);
  }
}

async function updateExpense(req, res, next) {
  try {
    const data = await repo.updateExpense(req.params.id, getSchoolId(req), req.body);
    if (!data) return res.status(404).json({ success: false, message: 'Expense voucher not found', data: null });
    res.json({ success: true, message: 'Expense voucher updated', data });
  } catch (err) {
    next(err);
  }
}

async function deleteExpense(req, res, next) {
  try {
    const success = await repo.deleteExpense(req.params.id, getSchoolId(req));
    if (!success) return res.status(404).json({ success: false, message: 'Expense voucher not found', data: null });
    res.json({ success: true, message: 'Expense voucher deleted', data: null });
  } catch (err) {
    next(err);
  }
}

// 9. INCOMES
async function listIncomeCategories(req, res, next) {
  try {
    const data = await repo.listIncomeCategories(getSchoolId(req));
    res.json({ success: true, message: 'Income categories retrieved', data });
  } catch (err) {
    next(err);
  }
}

async function createIncomeCategory(req, res, next) {
  try {
    const data = await repo.createIncomeCategory(getSchoolId(req), req.body);
    res.status(201).json({ success: true, message: 'Income category created', data });
  } catch (err) {
    next(err);
  }
}

async function updateIncomeCategory(req, res, next) {
  try {
    const data = await repo.updateIncomeCategory(req.params.id, getSchoolId(req), req.body);
    if (!data) return res.status(404).json({ success: false, message: 'Income category not found', data: null });
    res.json({ success: true, message: 'Income category updated', data });
  } catch (err) {
    next(err);
  }
}

async function deleteIncomeCategory(req, res, next) {
  try {
    const success = await repo.deleteIncomeCategory(req.params.id, getSchoolId(req));
    if (!success) return res.status(404).json({ success: false, message: 'Income category not found', data: null });
    res.json({ success: true, message: 'Income category deleted', data: null });
  } catch (err) {
    next(err);
  }
}

async function listIncomes(req, res, next) {
  try {
    const { data, meta } = await repo.listIncomes(getSchoolId(req), req.query);
    res.json({ success: true, message: 'Direct revenues retrieved', data, meta });
  } catch (err) {
    next(err);
  }
}

async function createIncome(req, res, next) {
  try {
    const errors = validateIncome(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join('; '), data: null });
    }
    const data = await repo.createIncome(getSchoolId(req), getUserId(req), req.body);
    res.status(201).json({ success: true, message: 'Revenue recorded successfully', data });
  } catch (err) {
    next(err);
  }
}

async function deleteIncome(req, res, next) {
  try {
    const success = await repo.deleteIncome(req.params.id, getSchoolId(req));
    if (!success) return res.status(404).json({ success: false, message: 'Revenue record not found', data: null });
    res.json({ success: true, message: 'Revenue record deleted', data: null });
  } catch (err) {
    next(err);
  }
}

// 10. PAYROLL & COMPENSATION
async function listSalaryStructures(req, res, next) {
  try {
    const data = await repo.listSalaryStructures(getSchoolId(req));
    res.json({ success: true, message: 'Staff salary structures retrieved', data });
  } catch (err) {
    next(err);
  }
}

async function getSalaryStructure(req, res, next) {
  try {
    const data = await repo.getSalaryStructureByUserId(req.params.userId, getSchoolId(req));
    res.json({ success: true, message: 'Salary structure retrieved', data });
  } catch (err) {
    next(err);
  }
}

async function deleteSalaryStructure(req, res, next) {
  try {
    const success = await repo.deleteSalaryStructure(req.params.id, getSchoolId(req));
    if (!success) {
      return res.status(404).json({ success: false, message: 'Salary structure not found', data: null });
    }
    res.json({ success: true, message: 'Salary structure deleted', data: null });
  } catch (err) {
    next(err);
  }
}

async function upsertSalaryStructure(req, res, next) {
  try {
    const errors = validateSalaryStructure(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join('; '), data: null });
    }
    const data = await repo.upsertSalaryStructure(getSchoolId(req), req.body);
    res.status(200).json({ success: true, message: 'Staff salary structure configured', data });
  } catch (err) {
    next(err);
  }
}

async function listPayrollRuns(req, res, next) {
  try {
    const data = await repo.listPayrollRuns(getSchoolId(req));
    res.json({ success: true, message: 'Payroll run history retrieved', data });
  } catch (err) {
    next(err);
  }
}

async function getPayrollRunById(req, res, next) {
  try {
    const data = await repo.getPayrollRunById(req.params.id, getSchoolId(req));
    if (!data) return res.status(404).json({ success: false, message: 'Payroll run not found', data: null });
    res.json({ success: true, message: 'Payroll run details retrieved', data });
  } catch (err) {
    next(err);
  }
}

async function processMonthlyPayroll(req, res, next) {
  try {
    const errors = validatePayrollRun(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join('; '), data: null });
    }
    const data = await service.processMonthlyPayroll(getSchoolId(req), getUserId(req), req.body);
    res.status(201).json({ success: true, message: 'Monthly payroll run processed successfully', data });
  } catch (err) {
    next(err);
  }
}

async function disbursePayroll(req, res, next) {
  try {
    const data = await service.disbursePayroll(getSchoolId(req), getUserId(req), req.params.id);
    res.json({ success: true, message: 'Payroll run marked as disbursed and payslips released', data });
  } catch (err) {
    next(err);
  }
}

async function getPayslipById(req, res, next) {
  try {
    const data = await repo.getPayslipById(req.params.id, getSchoolId(req));
    if (!data) return res.status(404).json({ success: false, message: 'Payslip not found', data: null });
    res.json({ success: true, message: 'Payslip details retrieved', data });
  } catch (err) {
    next(err);
  }
}

async function getMyPayslips(req, res, next) {
  try {
    const data = await repo.getMyPayslips(getUserId(req));
    res.json({ success: true, message: 'My payslips retrieved', data });
  } catch (err) {
    next(err);
  }
}

async function exportBankCsv(req, res, next) {
  try {
    const { filename, csvContent } = await service.generateBankExportCsv(getSchoolId(req), req.params.id);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (err) {
    next(err);
  }
}

// 11. REPORTS
async function getOverviewKPIs(req, res, next) {
  try {
    const data = await repo.getOverviewKPIs(getSchoolId(req));
    res.json({ success: true, message: 'Financial summary KPIs retrieved', data });
  } catch (err) {
    next(err);
  }
}

async function getDefaultersReport(req, res, next) {
  try {
    const data = await repo.getDefaultersReport(getSchoolId(req), req.query);
    res.json({ success: true, message: 'Fee defaulters aging report retrieved', data });
  } catch (err) {
    next(err);
  }
}

async function getIncomeVsExpenseReport(req, res, next) {
  try {
    const data = await repo.getIncomeVsExpenseReport(getSchoolId(req), req.query.year);
    res.json({ success: true, message: 'Income vs Expense annual statement retrieved', data });
  } catch (err) {
    next(err);
  }
}

async function getCashierShiftReport(req, res, next) {
  try {
    const data = await repo.getCashierShiftReport(getSchoolId(req), req.query.date);
    res.json({ success: true, message: 'Cashier shift close register retrieved', data });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getSettings,
  updateSettings,
  listFeeCategories,
  createFeeCategory,
  updateFeeCategory,
  deleteFeeCategory,
  listFeeStructures,
  createFeeStructure,
  updateFeeStructure,
  deleteFeeStructure,
  listFeeDiscounts,
  createFeeDiscount,
  updateFeeDiscount,
  deleteFeeDiscount,
  listInvoices,
  getInvoiceById,
  getMyInvoices,
  createInvoice,
  generateBatchInvoices,
  cancelInvoice,
  listPayments,
  getPaymentById,
  recordPayment,
  listBankSlips,
  submitBankSlip,
  reviewBankSlip,
  listExpenseCategories,
  createExpenseCategory,
  updateExpenseCategory,
  deleteExpenseCategory,
  listExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  listIncomeCategories,
  createIncomeCategory,
  updateIncomeCategory,
  deleteIncomeCategory,
  listIncomes,
  createIncome,
  deleteIncome,
  listSalaryStructures,
  getSalaryStructure,
  deleteSalaryStructure,
  upsertSalaryStructure,
  listPayrollRuns,
  getPayrollRunById,
  processMonthlyPayroll,
  disbursePayroll,
  getPayslipById,
  getMyPayslips,
  exportBankCsv,
  getOverviewKPIs,
  getDefaultersReport,
  getIncomeVsExpenseReport,
  getCashierShiftReport,
};
