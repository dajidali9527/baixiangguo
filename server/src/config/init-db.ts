import pool from './database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function initDatabase(): Promise<void> {
  const connection = await pool.getConnection();
  try {
    // 设置连接字符集
    await connection.query('SET NAMES utf8mb4');
    await connection.query('SET CHARACTER SET utf8mb4');
    await connection.query('SELECT 1');
    console.log('Database connected successfully');
  } finally {
    connection.release();
  }
}

export async function initTables(): Promise<void> {
  const connection = await pool.getConnection();
  try {
    await connection.query('SET NAMES utf8mb4');
    await connection.query('SET CHARACTER SET utf8mb4');
    
    const sqlPath = path.join(__dirname, 'init-data.sql');
    const sql = fs.readFileSync(sqlPath, { encoding: 'utf8' });
    const statements = sql.split(';').map(s => s.trim()).filter(s => s);
    
    for (const statement of statements) {
      try {
        await connection.query(statement);
      } catch (err) {
        const error = err as any;
        if (!(error.code === 'ER_TABLE_EXISTS_ERROR' || error.code === 'ER_DUP_ENTRY')) {
          throw err;
        }
      }
    }

    try {
      await connection.query(
        `ALTER TABLE price_records ADD COLUMN avg7_price DECIMAL(10,2) DEFAULT 0 COMMENT '近7日均价（惠农网专用）' AFTER avg_price`
      );
    } catch (err) {
      const error = err as any;
      if (error.code !== 'ER_DUP_FIELDNAME') {
        console.log('avg7_price column may already exist:', error.message);
      }
    }

    try {
      await connection.query(
        `ALTER TABLE price_records ADD COLUMN rise_fall VARCHAR(10) DEFAULT '' COMMENT '升/降（惠农网专用）' AFTER avg7_price`
      );
    } catch (err) {
      const error = err as any;
      if (error.code !== 'ER_DUP_FIELDNAME') {
        console.log('rise_fall column may already exist:', error.message);
      }
    }

    try {
      await connection.query(
        `ALTER TABLE price_records ADD COLUMN trend_chart VARCHAR(500) DEFAULT '' COMMENT '走势图链接（惠农网专用）' AFTER rise_fall`
      );
    } catch (err) {
      const error = err as any;
      if (error.code !== 'ER_DUP_FIELDNAME') {
        console.log('trend_chart column may already exist:', error.message);
      }
    }
    
    // 清理错误数据（2026-05-13，星期三，不是有效数据日期）
    try {
      await connection.query(
        `DELETE FROM price_records WHERE record_date = '2026-05-13'`
      );
      console.log('Cleaned up invalid data (2026-05-13)');
    } catch (err) {
      console.log('No invalid data to clean up or error cleaning:', (err as any).message);
    }
    
    console.log('Tables initialized successfully');
  } finally {
    connection.release();
  }
}
