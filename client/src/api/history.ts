import apiClient from './client';

export function fetchHistoryData(params: {
  source?: string;
  keyword?: string;
  date?: string;
  page?: number;
  pageSize?: number;
}) {
  return apiClient.get('/history', { params });
}
