export interface ApiResponse<T> {
  code: number;
  data: T;
  message: string;
}

export interface PaginatedData<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface DataSource {
  id: number;
  type: string;
  platform: string;
  name: string;
  url: string;
  scope: string;
  schedule: string;
  enabled: boolean;
  status: 'success' | 'failed' | 'running';
  lastRun: string;
  duration: string;
  records: number;
  executionType: string;
  executionTime?: string;
}

export interface TaskLog {
  time: string;
  level: 'info' | 'success' | 'error';
  message: string;
}