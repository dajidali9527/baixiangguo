import { Request, Response } from 'express';
import pool from '../config/database.js';

export async function getHistoryData(req: Request, res: Response) {
  try {
    const source = (req.query.source as string) || 'bxx';
    const keyword = (req.query.keyword as string) || '';
    const date = (req.query.date as string) || '';
    const page = parseInt((req.query.page as string) || '1', 10);
    const pageSize = parseInt((req.query.pageSize as string) || '15', 10);
    const offset = (page - 1) * pageSize;

    let whereClause = `WHERE source_type = ?`;
    const params: (string | number)[] = [source];

    if (keyword) {
      whereClause += ` AND (province LIKE ? OR region LIKE ? OR product LIKE ? OR origin LIKE ? OR price_type LIKE ? OR spec LIKE ?)`;
      const kw = `%${keyword}%`;
      params.push(kw, kw, kw, kw, kw, kw);
    }
    if (date) {
      whereClause += ` AND record_date = ?`;
      params.push(date);
    }

    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM price_records ${whereClause}`,
      params
    );
    const total = (countResult as Record<string, number>[])[0].total;

    const [records] = await pool.query(
      `SELECT id, province, region, product, origin, high_price as highPrice, low_price as lowPrice,
              avg_price as avgPrice, avg7_price as avg7Price, rise_fall as riseFall, trend_chart as trendChart,
              price_type as priceType, spec, unit, category1, category2,
              remark, DATE_FORMAT(record_date, '%Y-%m-%d') as date
       FROM price_records ${whereClause} ORDER BY record_date DESC, id DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    res.json({
      code: 200,
      data: { list: records, total, page, pageSize },
      message: 'ok',
    });
  } catch (err) {
    console.error('History query error:', err);
    res.status(500).json({ code: 500, data: null, message: '服务器内部错误' });
  }
}