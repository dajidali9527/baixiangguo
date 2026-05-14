import { Request, Response } from 'express';
import pool from '../config/database.js';

export async function getDataSources(_req: Request, res: Response) {
  try {
    const [rows] = await pool.query('SELECT * FROM data_sources ORDER BY id');
    res.json({ code: 200, data: rows, message: 'ok' });
  } catch (err) {
    console.error('getDataSources error:', err);
    res.status(500).json({ code: 500, data: null, message: '服务器内部错误' });
  }
}

export async function updateDataSource(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { url, scope, schedule, enabled } = req.body;
    await pool.query(
      `UPDATE data_sources SET url = ?, scope = ?, schedule = ?, enabled = ? WHERE id = ?`,
      [url, scope, schedule, enabled ? 1 : 0, id]
    );
    const [rows] = await pool.query('SELECT * FROM data_sources WHERE id = ?', [id]);
    const updated = (rows as Record<string, unknown>[])[0];
    if (!updated) {
      res.status(404).json({ code: 404, data: null, message: '数据源不存在' });
      return;
    }
    res.json({ code: 200, data: updated, message: '保存成功' });
  } catch (err) {
    console.error('updateDataSource error:', err);
    res.status(500).json({ code: 500, data: null, message: '服务器内部错误' });
  }
}

export async function getTaskStatus(_req: Request, res: Response) {
  try {
    const [rows] = await pool.query(
      `SELECT id, source_name as name, source_type as type, status, 
              DATE_FORMAT(execution_time, '%Y-%m-%d %H:%i') as executionTime,
              duration, records,
              execution_type as executionType
       FROM task_executions 
       ORDER BY execution_time DESC`
    );
    res.json({ code: 200, data: rows, message: 'ok' });
  } catch (err) {
    console.error('getTaskStatus error:', err);
    res.status(500).json({ code: 500, data: null, message: '服务器内部错误' });
  }
}

export async function getExecutionLogs(_req: Request, res: Response) {
  try {
    const [rows] = await pool.query(
      `SELECT TIME_FORMAT(created_at, '%H:%i:%s') as time,
              level, message FROM crawl_logs ORDER BY created_at DESC LIMIT 100`
    );
    res.json({ 
      code: 200, 
      data: { 
        list: rows, 
        total: (rows as any[]).length, 
        page: 1, 
        pageSize: 100 
      }, 
      message: 'ok' 
    });
  } catch (err) {
    console.error('getExecutionLogs error:', err);
    res.status(500).json({ code: 500, data: null, message: '服务器内部错误' });
  }
}
