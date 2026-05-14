import { Request, Response } from 'express';
import { crawlBxx, crawlHuinong, crawlXinfadi } from '../services/crawlerService.js';

let isCrawling = false;

export async function manualCrawl(req: Request, res: Response) {
  if (isCrawling) {
    return res.status(400).json({
      code: 400,
      message: '抓取任务正在进行中，请稍后再试',
      data: null
    });
  }

  const { sourceId = 1 } = req.body;

  if (sourceId !== 1 && sourceId !== 2 && sourceId !== 3) {
    return res.status(400).json({
      code: 400,
      message: '不支持的数据源，目前仅支持ID 1、2和3',
      data: null
    });
  }

  isCrawling = true;

  try {
    let result;
    if (sourceId === 1) {
      result = await crawlBxx(sourceId, '手动点击立即执行');
    } else if (sourceId === 2) {
      result = await crawlHuinong(sourceId, '手动点击立即执行');
    } else {
      result = await crawlXinfadi(sourceId, '手动点击立即执行');
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
