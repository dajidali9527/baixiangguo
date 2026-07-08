import { Request, Response } from 'express';
import pool from '../config/database.js';

export async function getDataSources(_req: Request, res: Response) {
  try {
    const result = await pool.query('SELECT * FROM pf_data_sources ORDER BY id');
    res.json({ code: 200, data: result.rows, message: 'ok' });
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
      `UPDATE pf_data_sources SET url = $1, scope = $2, schedule = $3, enabled = $4 WHERE id = $5`,
      [url, scope, schedule, enabled ? 1 : 0, id]
    );
    const result = await pool.query('SELECT * FROM pf_data_sources WHERE id = $1', [id]);
    const updated = result.rows[0];
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
    const result = await pool.query(
      `SELECT id, source_name as name, source_type as type, status,
              TO_CHAR(execution_time, 'YYYY-MM-DD HH24:MI') as "executionTime",
              duration, records,
              execution_type as "executionType"
       FROM pf_task_executions
       ORDER BY execution_time DESC`
    );
    res.json({ code: 200, data: result.rows, message: 'ok' });
  } catch (err) {
    console.error('getTaskStatus error:', err);
    res.status(500).json({ code: 500, data: null, message: '服务器内部错误' });
  }
}

export async function getExecutionLogs(_req: Request, res: Response) {
  try {
    const result = await pool.query(
      `SELECT TO_CHAR(created_at, 'HH24:MI:SS') as time,
              level, message FROM pf_crawl_logs ORDER BY created_at DESC LIMIT 100`
    );
    res.json({
      code: 200,
      data: {
        list: result.rows,
        total: result.rows.length,
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
