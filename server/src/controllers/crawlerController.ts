import { Request, Response } from 'express';
import { crawlXinfadi, crawlJiangnan } from '../services/crawlerService.js';
import pool from '../config/database.js';

let isCrawling = false;

export async function manualCrawl(req: Request, res: Response) {
  if (isCrawling) {
    return res.status(400).json({
      code: 400,
      message: '抓取任务正在进行中，请稍后再试',
      data: null
    });
  }

  const { sourceId = 3 } = req.body;

  // 检查数据源是否存在且已启用
  const sourceResult = await pool.query('SELECT id, name, enabled FROM pf_data_sources WHERE id = $1', [sourceId]);
  const source = sourceResult.rows[0];
  
  if (!source) {
    return res.status(400).json({
      code: 400,
      message: '数据源不存在',
      data: null
    });
  }
  
  if (!source.enabled) {
    return res.status(400).json({
      code: 400,
      message: `${source.name} 数据源已禁用`,
      data: null
    });
  }

  isCrawling = true;

  try {
    let result;
    if (sourceId === 3) {
      result = await crawlXinfadi(sourceId, '手动点击立即执行');
    } else if (sourceId === 4) {
      result = await crawlJiangnan(sourceId, '手动点击立即执行');
    } else {
      return res.status(400).json({
        code: 400,
        message: '不支持的数据源',
        data: null
      });
    }
    
    res.json({
      code: 200,
      message: result.message,
      data: {
        success: result.success,
        records: result.records
      }
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : '未知错误';
    res.status(500).json({
      code: 500,
      message: errorMsg,
      data: null
    });
  } finally {
    isCrawling = false;
  }
}
