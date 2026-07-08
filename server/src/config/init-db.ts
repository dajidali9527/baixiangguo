import pool from './database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function initDatabase(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    console.log('Database connected successfully');
  } finally {
    client.release();
  }
}

export async function initTables(): Promise<void> {
  const client = await pool.connect();
  try {
    const sqlPath = path.join(__dirname, 'init-data.sql');
    const sql = fs.readFileSync(sqlPath, { encoding: 'utf8' });
    await client.query(sql);

    try {
      await client.query(
        `ALTER TABLE price_records ADD COLUMN IF NOT EXISTS avg7_price DECIMAL(10,2) DEFAULT 0`
      );
      await client.query(
        `ALTER TABLE price_records ADD COLUMN IF NOT EXISTS rise_fall VARCHAR(10) DEFAULT ''`
      );
      await client.query(
        `ALTER TABLE price_records ADD COLUMN IF NOT EXISTS trend_chart VARCHAR(500) DEFAULT ''`
      );
    } catch (err) {
      console.log('Column migration skipped:', (err as Error).message);
    }

    try {
      const result = await client.query(
        `UPDATE task_executions SET status = 'failed', error_message = '服务重启，任务中断' WHERE status = 'running'`
      );
      if (result.rowCount && result.rowCount > 0) {
        console.log(`Cleaned up ${result.rowCount} orphaned running tasks`);
      }
    } catch (err) {
      console.log('No orphaned tasks to clean up');
    }

    try {
      await client.query(
        `UPDATE data_sources SET status = 'success' WHERE status = 'running'`
      );
    } catch (err) {
      console.log('No data sources need status reset');
    }

    console.log('Tables initialized successfully');
  } finally {
    client.release();
  }
}
