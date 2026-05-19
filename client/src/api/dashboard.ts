import apiClient from './client';

export function fetchDashboardData() {
  return apiClient.get('/dashboard');
}

export function fetchHuinongTrend(origin: string, days?: number) {
  const params: any = { origin };
  if (days) params.days = days;
  return apiClient.get('/dashboard/huinong-trend', { params });
}

export function fetchXinfadiTrend(days?: number) {
  const params: any = {};
  if (days) params.days = days;
  return apiClient.get('/dashboard/xinfadi-trend', { params });
}

export function fetchJiangnanTrend(days?: number) {
  const params: any = {};
  if (days) params.days = days;
  return apiClient.get('/dashboard/jiangnan-trend', { params });
}
