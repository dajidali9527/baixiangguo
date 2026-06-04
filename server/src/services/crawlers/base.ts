import pool from '../../config/database.js';

export const MIN_DATE = new Date('2026-04-01');

export async function randomDelay(minMs: number = 1000, maxMs: number = 3000): Promise<void> {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  await new Promise(resolve => setTimeout(resolve, delay));
}

export function toDateOnly(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function formatDateForDb(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getAllDatesBetween(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = [];
  const current = new Date(startDate);
  while (current <= endDate) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

export function getValidDatesBetween(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = [];
  const current = new Date(startDate);
  while (current <= endDate) {
    const day = current.getDay();
    if (day === 2 || day === 4 || day === 6) {
      dates.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

export function sanitize(v: any): string {
  if (v === null || v === undefined) return '';
  return String(v).replace(/\s+/g, ' ').trim();
}

export function formatDateForXinfadi(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}/${month}/${day}`;
}

export async function createTaskExecution(
  sourceId: number,
  sourceName: string,
  sourceType: string,
  status: string,
  executionType: string
): Promise<number> {
  try {
    const [result] = await pool.query(
      'INSERT INTO task_executions (source_id, source_name, source_type, status, execution_type, execution_time) VALUES (?, ?, ?, ?, ?, NOW())',
      [sourceId, sourceName, sourceType, status, executionType]
    );
    return (result as any).insertId;
  } catch (err) {
    console.error('createTaskExecution error:', err);
    return 0;
  }
}

export async function updateTaskExecution(
  taskId: number,
  status: string,
  duration: string,
  records: number,
  errorMessage?: string
): Promise<void> {
  try {
    await pool.query(
      'UPDATE task_executions SET status = ?, duration = ?, records = ?, error_message = ? WHERE id = ?',
      [status, duration, records, errorMessage || '', taskId]
    );
  } catch (err) {
    console.error('updateTaskExecution error:', err);
  }
}

export async function updateDataSourceStatus(
  sourceId: number,
  status: string,
  duration: string,
  records: number,
  executionType: string
): Promise<void> {
  try {
    await pool.query(
      'UPDATE data_sources SET last_run = NOW(), status = ?, duration = ?, records = ?, execution_type = ? WHERE id = ?',
      [status, duration, records, executionType, sourceId]
    );
  } catch (err) {
    console.error('updateDataSourceStatus error:', err);
  }
}

export async function logCrawl(sourceId: number | null, level: 'info' | 'success' | 'error', message: string): Promise<void> {
  try {
    const safeMessage = message.length > 5000 ? message.substring(0, 5000) + '...[truncated]' : message;
    await pool.query(
      'INSERT INTO crawl_logs (source_id, level, message) VALUES (?, ?, ?)',
      [sourceId, level, safeMessage]
    );
  } catch (err) {
    console.error('Failed to log crawl:', err);
  }
}

export async function checkDataExists(sourceId: number, recordDate: string, category2: string, sourceType: string = 'bxx'): Promise<boolean> {
  try {
    let query = 'SELECT id FROM price_records WHERE source_type = ? AND source_id = ? AND record_date = ?';
    const params: any[] = [sourceType, sourceId, recordDate];

    if (sourceType === 'jiangnan') {
      query += ' AND origin = ? LIMIT 1';
      params.push(category2);
    } else {
      query += ' AND category2 = ? LIMIT 1';
      params.push(category2);
    }

    const [rows] = await pool.query(query, params);
    return (rows as any[]).length > 0;
  } catch (err) {
    console.error('Check data exists error:', err);
    return false;
  }
}

export async function getLatestDateFromDb(sourceId: number, sourceType: string = 'bxx'): Promise<Date> {
  try {
    const [rows] = await pool.query(
      'SELECT MAX(record_date) as last_date FROM price_records WHERE source_type = ? AND source_id = ?',
      [sourceType, sourceId]
    );
    const lastDateRow = rows as any[];
    if (lastDateRow[0]?.last_date) {
      return new Date(lastDateRow[0].last_date);
    }
    return new Date('2026-03-31');
  } catch (err) {
    console.error('Get latest date error:', err);
    return new Date('2026-03-31');
  }
}