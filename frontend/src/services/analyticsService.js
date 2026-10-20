import { request } from './apiClient';

/**
 * Executive Institutional Analytics Client Service
 */
export async function getInstitutionalAnalytics(params = {}) {
  const cleanParams = {};
  Object.keys(params).forEach((key) => {
    if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
      cleanParams[key] = params[key];
    }
  });

  const query = new URLSearchParams(cleanParams).toString();
  const endpoint = query ? `/api/v1/analytics/institutional?${query}` : '/api/v1/analytics/institutional';
  const response = await request(endpoint);
  return response.data;
}

const analyticsService = {
  getInstitutionalAnalytics,
};

export default analyticsService;
