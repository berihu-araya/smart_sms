import { request } from './apiClient';

export async function getSchoolSettings() {
  const response = await request('/api/v1/settings');
  return response.data;
}

export async function updateSchoolSettings(payload) {
  const response = await request('/api/v1/settings', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return response.data;
}

export default {
  getSchoolSettings,
  updateSchoolSettings,
};
