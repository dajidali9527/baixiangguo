import { Request, Response } from 'express';
import pool from '../config/database.js';

// 获取某个产地的近7日历史数据（用于计算统计）
async function getHuinongRecent7DaysForOrigin(origin: string) {
  try {
    const [records] = await pool.query(
      `SELECT avg_price as price, DATE_FORMAT(record_date, '%Y-%m-%d') as date
       FROM price_records
       WHERE source_type = 'huinong' AND origin = ?
       ORDER BY record_date DESC
       LIMIT 7`,
      [origin]
    );
    return records as Array<{ price: number; date: string }>;
  } catch (err) {
    console.error('Get huinong 7 days error:', err);
    return [];
  }
}

// 计算近7日统计数据
function calculate7DayStats(records: Array<{ price: number }>) {
  if (!records.length) {
    return { high7Price: 0, low7Price: 0, avg7Price: 0 };
  }
  const prices = records.map(r => Number(r.price));
  const high7Price = Math.max(...prices);
  const low7Price = Math.min(...prices);
  const avg7Price = prices.reduce((a, b) => a + b, 0) / prices.length;
  return { high7Price, low7Price, avg7Price };
}

// 计算升/降值（对比前一天）
async function calculateRiseFall(origin: string, currentDate: string, currentPrice: number) {
  try {
    const [records] = await pool.query(
      `SELECT avg_price as price
       FROM price_records
       WHERE source_type = 'huinong' AND origin = ? AND record_date < ?
       ORDER BY record_date DESC
       LIMIT 1`,
      [origin, currentDate]
    );
    
    const prevRecords = records as Array<{ price: number }>;
    if (!prevRecords.length) {
      return '-';
    }
    
    const prevPrice = Number(prevRecords[0].price);
    const diff = currentPrice - prevPrice;
    
    if (diff > 0) {
      return `+${diff.toFixed(2)}`;
    } else if (diff < 0) {
      return diff.toFixed(2);
    } else {
      return '-';
    }
  } catch (err) {
    console.error('Calculate rise/fall error:', err);
    return '-';
  }
}

export async function getDashboardData(req: Request, res: Response) {
  try {
    const [bxxRecords] = await pool.query(
      `SELECT id, province, region, high_price as highPrice, low_price as lowPrice,
              avg_price as avgPrice, price_type as priceType, spec, remark,
              DATE_FORMAT(record_date, '%Y-%m-%d') as date
       FROM price_records WHERE source_type = 'bxx'
       AND record_date = (SELECT MAX(record_date) FROM price_records WHERE source_type = 'bxx')
       ORDER BY id DESC`
    );

    // 惠农网数据：获取基础数据，然后补充本地计算的近7日统计和升/降
    const [huinongBaseRecords] = await pool.query(
      `SELECT id, DATE_FORMAT(record_date, '%Y-%m-%d') as date, product, origin, avg_price as avgPrice
       FROM price_records WHERE source_type = 'huinong' ORDER BY record_date DESC, id DESC LIMIT 50`
    );

    // 为每条记录补充近7日统计数据和升/降
    const huinongRecordsWithStats = await Promise.all(
      (huinongBaseRecords as Array<{ origin: string; date: string; avgPrice: number; [key: string]: unknown }>).map(async (record) => {
        const recent7Days = await getHuinongRecent7DaysForOrigin(record.origin);
        const stats = calculate7DayStats(recent7Days);
        const riseFall = await calculateRiseFall(record.origin, record.date, record.avgPrice);
        return { ...record, ...stats, riseFall };
      })
    );

    const [xinfadiRecords] = await pool.query(
      `SELECT id, category1, category2, name, low_price as lowPrice, avg_price as avgPrice,
              high_price as highPrice, spec, origin, unit, DATE_FORMAT(record_date, '%Y-%m-%d') as date
       FROM price_records WHERE source_type = 'xinfadi' ORDER BY record_date DESC, id DESC LIMIT 50`
    );
    const [jiangnanRecords] = await pool.query(
      `SELECT id, name, origin, high_price as highPrice, low_price as lowPrice,
              avg_price as refPrice, spec, DATE_FORMAT(record_date, '%Y-%m-%d') as date
       FROM price_records WHERE source_type = 'jiangnan' ORDER BY record_date DESC, id DESC LIMIT 50`
    );

    const avgPrice = (records: Record<string, unknown>[], field: string) =>
      records.length > 0
        ? (records.reduce((s: number, r: Record<string, unknown>) => s + (Number(r[field]) || 0), 0) / records.length).toFixed(2)
        : '0';

    res.json({
      code: 200,
      data: {
        bxx: { records: bxxRecords, avgPrice: avgPrice(bxxRecords as Record<string, unknown>[], 'avgPrice'), updateTime: new Date().toISOString() },
        huinong: { records: huinongRecordsWithStats, avgPrice: avgPrice(huinongRecordsWithStats as Record<string, unknown>[], 'avgPrice'), updateTime: new Date().toISOString() },
        xinfadi: { records: xinfadiRecords, avgPrice: avgPrice(xinfadiRecords as Record<string, unknown>[], 'avgPrice'), updateTime: new Date().toISOString() },
        jiangnan: { records: jiangnanRecords, avgPrice: avgPrice(jiangnanRecords as Record<string, unknown>[], 'refPrice'), updateTime: new Date().toISOString() },
      },
      message: 'ok',
    });
  } catch (err) {
    console.error('Dashboard query error:', err);
    res.status(500).json({ code: 500, data: null, message: '服务器内部错误' });
  }
}

// 获取某个产地的7日走势图数据
export async function getHuinongTrendChart(req: Request, res: Response) {
  try {
    const { origin, days = 7 } = req.query;
    const limit = Number(days) || 7;

    const [records] = await pool.query(
      `SELECT CAST(avg_price AS DOUBLE) as price, DATE_FORMAT(record_date, '%Y-%m-%d') as date
       FROM price_records
       WHERE source_type = 'huinong' AND origin = ?
       ORDER BY record_date DESC
       LIMIT ?`,
      [origin, limit]
    );

    // 反转顺序，按日期从旧到新
    const orderedRecords = (records as Array<{ price: number; date: string }>).reverse();

    res.json({
      code: 200,
      data: orderedRecords,
      message: 'ok',
    });
  } catch (err) {
    console.error('Get huinong trend error:', err);
    res.status(500).json({ code: 500, data: null, message: '服务器内部错误' });
  }
}

// 获取北京新发地的近1个月走势图数据
export async function getXinfadiTrendChart(req: Request, res: Response) {
  try {
    const { days = 30 } = req.query;
    const limit = Number(days) || 30;

    const [records] = await pool.query(
      `SELECT CAST(avg_price AS DOUBLE) as price, DATE_FORMAT(record_date, '%Y-%m-%d') as date
       FROM price_records
       WHERE source_type = 'xinfadi'
       ORDER BY record_date DESC
       LIMIT ?`,
      [limit]
    );

    // 反转顺序，按日期从旧到新
    const orderedRecords = (records as Array<{ price: number; date: string }>).reverse();

    res.json({
      code: 200,
      data: orderedRecords,
      message: 'ok',
    });
  } catch (err) {
    console.error('Get xinfadi trend error:', err);
    res.status(500).json({ code: 500, data: null, message: '服务器内部错误' });
  }
}

// 获取广州江南的近1个月走势图数据
export async function getJiangnanTrendChart(req: Request, res: Response) {
  try {
    const { days = 30 } = req.query;
    const limit = Number(days) || 30;

    const [records] = await pool.query(
      `SELECT CAST(avg_price AS DOUBLE) as price, DATE_FORMAT(record_date, '%Y-%m-%d') as date
       FROM price_records
       WHERE source_type = 'jiangnan'
       ORDER BY record_date DESC
       LIMIT ?`,
      [limit]
    );

    // 反转顺序，按日期从旧到新
    const orderedRecords = (records as Array<{ price: number; date: string }>).reverse();

    res.json({
      code: 200,
      data: orderedRecords,
      message: 'ok',
    });
  } catch (err) {
    console.error('Get jiangnan trend error:', err);
    res.status(500).json({ code: 500, data: null, message: '服务器内部错误' });
  }
}
