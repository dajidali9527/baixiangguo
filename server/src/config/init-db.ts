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
    // 检查 pf_data_sources 表是否存在
    const tableCheck = await client.query(
      `SELECT EXISTS (SELECT FROM pg_tables WHERE tablename = 'pf_data_sources')`
    );
    const tableExists = tableCheck.rows[0].exists;

    if (tableExists) {
      // 表已存在，只执行表结构更新和清理孤儿任务
      console.log('Database already initialized, skipping seed data');
      try {
        await client.query(
          `ALTER TABLE pf_price_records ADD COLUMN IF NOT EXISTS avg7_price DECIMAL(10,2) DEFAULT 0`
        );
        await client.query(
          `ALTER TABLE pf_price_records ADD COLUMN IF NOT EXISTS rise_fall VARCHAR(10) DEFAULT ''`
        );
        await client.query(
          `ALTER TABLE pf_price_records ADD COLUMN IF NOT EXISTS trend_chart VARCHAR(500) DEFAULT ''`
        );
      } catch (err) {
        console.log('Column migration skipped:', (err as Error).message);
      }
      // 确保 pf_users 表存在（旧数据库升级）
      const usersCheck = await client.query(
        `SELECT EXISTS (SELECT FROM pg_tables WHERE tablename = 'pf_users')`
      );
      if (!usersCheck.rows[0].exists) {
        await client.query(`
          CREATE TABLE IF NOT EXISTS pf_users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(50) NOT NULL UNIQUE,
            password_hash VARCHAR(200) NOT NULL,
            role VARCHAR(20) NOT NULL DEFAULT 'user',
            display_name VARCHAR(100) DEFAULT '',
            last_login TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          INSERT INTO pf_users (id, username, password_hash, role, display_name) VALUES
          (1, '1860139182', '$2b$10$m1EasbliZATeUt0Vui61jeKNy3F.ugBhTmtu0oT8zWfNOVed2w6ES', 'admin', '管理员')
          ON CONFLICT (id) DO NOTHING;
          SELECT setval('pf_users_id_seq', (SELECT COALESCE(MAX(id), 1) FROM pf_users));
        `);
        console.log('Created pf_users table for existing database');
      }
    } else {
      // 表不存在，执行完整初始化
      console.log('Initializing database with seed data...');
      const sqlPath = path.join(__dirname, 'init-data.sql');
      const sql = fs.readFileSync(sqlPath, { encoding: 'utf8' });
      await client.query(sql);
    }

    // 清理孤儿任务（每次启动都执行）
    try {
      const result = await client.query(
        `UPDATE pf_task_executions SET status = 'failed', error_message = '服务重启，任务中断' WHERE status = 'running'`
      );
      if (result.rowCount && result.rowCount > 0) {
        console.log(`Cleaned up ${result.rowCount} orphaned running tasks`);
      }
    } catch (err) {
      console.log('No orphaned tasks to clean up');
    }

    // 重置运行中的数据源状态
    try {
      await client.query(
        `UPDATE pf_data_sources SET status = 'success' WHERE status = 'running'`
      );
    } catch (err) {
      console.log('No data sources need status reset');
    }

    console.log('Tables initialized successfully');
  } finally {
    client.release();
  }
}
