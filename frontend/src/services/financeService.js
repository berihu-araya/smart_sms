import { downloadFile, request } from './apiClient';

// ==========================================
// 1. SETTINGS
// ==========================================
export function getFinanceSettings() {
  return request('/api/v1/finance/config', { method: 'GET' });
}

export function updateFinanceSettings(data) {
  return request('/api/v1/finance/config', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// ==========================================
// 2. FEE CATEGORIES
// ==========================================
export function listFeeCategories() {
  return request('/api/v1/finance/fee-categories', { method: 'GET' });
}

export function createFeeCategory(data) {
  return request('/api/v1/finance/fee-categories', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateFeeCategory(id, data) {
  return request(`/api/v1/finance/fee-categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function deleteFeeCategory(id) {
  return request(`/api/v1/finance/fee-categories/${id}`, { method: 'DELETE' });
}

// ==========================================
// 3. FEE STRUCTURES (Fee Master)
// ==========================================
export function listFeeStructures(params = {}) {
  const query = new URLSearchParams(params).toString();
  return request(`/api/v1/finance/fee-structures${query ? `?${query}` : ''}`, { method: 'GET' });
}

export function createFeeStructure(data) {
  return request('/api/v1/finance/fee-structures', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateFeeStructure(id, data) {
  return request(`/api/v1/finance/fee-structures/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function deleteFeeStructure(id) {
  return request(`/api/v1/finance/fee-structures/${id}`, { method: 'DELETE' });
}

// ==========================================
// 4. FEE DISCOUNTS & SCHOLARSHIPS
// ==========================================
export function listFeeDiscounts() {
  return request('/api/v1/finance/fee-discounts', { method: 'GET' });
}

export function createFeeDiscount(data) {
  return request('/api/v1/finance/fee-discounts', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateFeeDiscount(id, data) {
  return request(`/api/v1/finance/fee-discounts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function deleteFeeDiscount(id) {
  return request(`/api/v1/finance/fee-discounts/${id}`, { method: 'DELETE' });
}

// ==========================================
// 5. INVOICES
// ==========================================
export function listInvoices(params = {}) {
  const query = new URLSearchParams(params).toString();
  return request(`/api/v1/finance/invoices${query ? `?${query}` : ''}`, { method: 'GET' });
}

export function getInvoiceById(id) {
  return request(`/api/v1/finance/invoices/${id}`, { method: 'GET' });
}

export function getMyInvoices() {
  return request('/api/v1/finance/invoices/my-invoices', { method: 'GET' });
}

export function createInvoice(data) {
  return request('/api/v1/finance/invoices', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function generateBatchInvoices(data) {
  return request('/api/v1/finance/invoices/batch', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function cancelInvoice(id, reason) {
  return request(`/api/v1/finance/invoices/${id}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

// ==========================================
// 6. PAYMENTS & RECEIPTS
// ==========================================
export function listPayments(params = {}) {
  const query = new URLSearchParams(params).toString();
  return request(`/api/v1/finance/payments${query ? `?${query}` : ''}`, { method: 'GET' });
}

export function getPaymentById(id) {
  return request(`/api/v1/finance/payments/${id}`, { method: 'GET' });
}

export function recordPayment(data) {
  return request('/api/v1/finance/payments', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ==========================================
// 7. BANK SLIPS
// ==========================================
export function listBankSlips(params = {}) {
  const query = new URLSearchParams(params).toString();
  return request(`/api/v1/finance/payments/bank-slips/list${query ? `?${query}` : ''}`, { method: 'GET' });
}

export function submitBankSlip(data) {
  return request('/api/v1/finance/payments/bank-slips/submit', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function reviewBankSlip(id, data) {
  return request(`/api/v1/finance/payments/bank-slips/${id}/review`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// ==========================================
// 8. EXPENSES
// ==========================================
export function listExpenseCategories() {
  return request('/api/v1/finance/expense-categories', { method: 'GET' });
}

export function createExpenseCategory(data) {
  return request('/api/v1/finance/expense-categories', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateExpenseCategory(id, data) {
  return request(`/api/v1/finance/expense-categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function deleteExpenseCategory(id) {
  return request(`/api/v1/finance/expense-categories/${id}`, { method: 'DELETE' });
}

export function listExpenses(params = {}) {
  const query = new URLSearchParams(params).toString();
  return request(`/api/v1/finance/expenses${query ? `?${query}` : ''}`, { method: 'GET' });
}

export function createExpense(data) {
  return request('/api/v1/finance/expenses', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateExpense(id, data) {
  return request(`/api/v1/finance/expenses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function deleteExpense(id) {
  return request(`/api/v1/finance/expenses/${id}`, { method: 'DELETE' });
}

// ==========================================
// 9. INCOMES
// ==========================================
export function listIncomeCategories() {
  return request('/api/v1/finance/income-categories', { method: 'GET' });
}

export function createIncomeCategory(data) {
  return request('/api/v1/finance/income-categories', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateIncomeCategory(id, data) {
  return request(`/api/v1/finance/income-categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function deleteIncomeCategory(id) {
  return request(`/api/v1/finance/income-categories/${id}`, { method: 'DELETE' });
}

export function listIncomes(params = {}) {
  const query = new URLSearchParams(params).toString();
  return request(`/api/v1/finance/incomes${query ? `?${query}` : ''}`, { method: 'GET' });
}

export function createIncome(data) {
  return request('/api/v1/finance/incomes', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function deleteIncome(id) {
  return request(`/api/v1/finance/incomes/${id}`, { method: 'DELETE' });
}

// ==========================================
// 10. PAYROLL
// ==========================================
export function listSalaryStructures() {
  return request('/api/v1/finance/payroll/structures', { method: 'GET' });
}

export function getSalaryStructure(userId) {
  return request(`/api/v1/finance/payroll/structures/user/${userId}`, { method: 'GET' });
}

export function upsertSalaryStructure(data) {
  return request('/api/v1/finance/payroll/structures', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function deleteSalaryStructure(id) {
  return request(`/api/v1/finance/payroll/structures/${id}`, { method: 'DELETE' });
}

export function listPayrollRuns() {
  return request('/api/v1/finance/payroll/runs', { method: 'GET' });
}

export function getPayrollRunById(id) {
  return request(`/api/v1/finance/payroll/runs/${id}`, { method: 'GET' });
}

export function downloadPayrollBankCsv(id) {
  return downloadFile(
    `/api/v1/finance/payroll/runs/${id}/bank-export`,
    `payroll-bank-export-${id}.csv`
  );
}

export function processMonthlyPayroll(data) {
  return request('/api/v1/finance/payroll/runs/process', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function markPayrollPaid(id) {
  return request(`/api/v1/finance/payroll/runs/${id}/disburse`, {
    method: 'PATCH',
  });
}

export { markPayrollPaid as disbursePayroll };

export function getPayslipById(id) {
  return request(`/api/v1/finance/payroll/payslips/${id}`, { method: 'GET' });
}

export function getMyPayslips() {
  return request('/api/v1/finance/payroll/payslips/my-payslips', { method: 'GET' });
}

// ==========================================
// 11. REPORTS & KPIS
// ==========================================
export function getFinanceOverviewKPIs() {
  return request('/api/v1/finance/reports/overview-kpis', { method: 'GET' });
}

export function getDefaultersReport(params = {}) {
  const query = new URLSearchParams(params).toString();
  return request(`/api/v1/finance/reports/defaulters${query ? `?${query}` : ''}`, { method: 'GET' });
}

export function getIncomeVsExpenseReport(year) {
  return request(`/api/v1/finance/reports/income-vs-expense${year ? `?year=${year}` : ''}`, { method: 'GET' });
}

export function getCashierShiftReport(date) {
  return request(`/api/v1/finance/reports/cashier-shift${date ? `?date=${date}` : ''}`, { method: 'GET' });
}
