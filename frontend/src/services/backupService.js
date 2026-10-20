import { request } from './apiClient';

export async function listBackups() {
  const response = await request('/api/v1/settings/backups');
  return response.data || [];
}

export async function triggerBackup(backupType = 'MANUAL') {
  const response = await request('/api/v1/settings/backups/trigger', {
    method: 'POST',
    body: JSON.stringify({ backupType }),
  });
  return response.data;
}

export function getBackupDownloadUrl(id) {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  return `${baseUrl}/api/v1/settings/backups/${id}/download`;
}

export default {
  listBackups,
  triggerBackup,
  getBackupDownloadUrl,
};
