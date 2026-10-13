import { request } from './apiClient';

export async function getOdooStatus() {
  const response = await request('/api/v1/finance/odoo/status');
  return response.data || response;
}

export async function triggerSyncStudents(limit = 50) {
  const response = await request(`/api/v1/finance/odoo/sync/students?limit=${limit}`, {
    method: 'POST',
  });
  return response.data || response;
}

export async function triggerSyncInvoices(limit = 50) {
  const response = await request(`/api/v1/finance/odoo/sync/invoices?limit=${limit}`, {
    method: 'POST',
  });
  return response.data || response;
}

export async function triggerSyncPayments(limit = 50) {
  const response = await request(`/api/v1/finance/odoo/sync/payments?limit=${limit}`, {
    method: 'POST',
  });
  return response.data || response;
}

export default {
  getOdooStatus,
  triggerSyncStudents,
  triggerSyncInvoices,
  triggerSyncPayments,
};
