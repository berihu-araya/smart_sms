import { request } from './apiClient';

export async function listAuditLogs(params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.append('page', params.page);
  if (params.limit) query.append('limit', params.limit);
  if (params.search) query.append('search', params.search);
  if (params.action && params.action !== 'ALL') query.append('action', params.action);
  if (params.resourceType && params.resourceType !== 'ALL') query.append('resourceType', params.resourceType);
  if (params.startDate) query.append('startDate', params.startDate);
  if (params.endDate) query.append('endDate', params.endDate);
  if (params.userId) query.append('userId', params.userId);

  const qs = query.toString() ? `?${query.toString()}` : '';
  const response = await request(`/api/v1/audit-logs${qs}`);
  return response;
}

export async function getAuditLogById(id) {
  const response = await request(`/api/v1/audit-logs/${id}`);
  return response.data;
}

export function getExportAuditLogsUrl(params = {}) {
  const query = new URLSearchParams();
  if (params.search) query.append('search', params.search);
  if (params.action && params.action !== 'ALL') query.append('action', params.action);
  if (params.resourceType && params.resourceType !== 'ALL') query.append('resourceType', params.resourceType);
  if (params.startDate) query.append('startDate', params.startDate);
  if (params.endDate) query.append('endDate', params.endDate);

  const qs = query.toString() ? `?${query.toString()}` : '';
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  return `${baseUrl}/api/v1/audit-logs/export${qs}`;
}

export default {
  listAuditLogs,
  getAuditLogById,
  getExportAuditLogsUrl,
};
