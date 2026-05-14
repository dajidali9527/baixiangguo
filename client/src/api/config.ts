import apiClient from './client';

export function fetchDataSources() {
  return apiClient.get('/config/sources');
}

export function updateDataSource(id: number, data: Record<string, unknown>) {
  return apiClient.put(`/config/sources/${id}`, data);
}

export function fetchTaskStatus() {
  return apiClient.get('/config/tasks');
}

export function fetchExecutionLogs() {
  return apiClient.get('/config/logs');
}

export function manualCrawl(sourceId: number = 1) {
  return apiClient.post('/crawler/manual', { sourceId });
}
