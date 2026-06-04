import axios from 'axios';
import https from 'https';
import pool from '../../config/database.js';
import {
  logCrawl,
  createTaskExecution,
  updateTaskExecution,
  updateDataSourceStatus,
  checkDataExists,
  getLatestDateFromDb,
  randomDelay,
  toDateOnly,
  formatDateForDb,
  MIN_DATE
} from './base.js';

interface JiangnanApiItem {
  createBy: string;
  createTime: string;
  updateBy: string;
  updateTime: string;
  id: number;
  importId: number;
  productName: string;
  provenanceName: string;
  topPrice: string;
  minimumPrice: string;
  averagePrice: string;
  standard: string;
  kind: string;
  weight: string;
  sourceType: string;
  priceDate: string;
  tradingVolume: string;
}

interface JiangnanApiResponse {
  total: number;
  rows: JiangnanApiItem[];
}

async function saveJiangnanData(sourceId: number, items: JiangnanApiItem[]): Promise<number> {
  const connection = await pool.getConnection();
  try {
    let savedCount = 0;

    for (const item of items) {
      const recordDate = item.priceDate;

      const name = item.productName || '百香果';
      const origin = item.provenanceName || '广西/云南/海南';
      const spec = item.standard || '泡沫箱';

      const exists = await checkDataExists(sourceId, recordDate, origin, 'jiangnan');
      if (!exists) {
        await connection.query(
          `INSERT INTO price_records 
           (source_type, source_id, name, high_price, low_price, avg_price, spec, origin, record_date)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            'jiangnan',
            sourceId,
            name,
            parseFloat(item.topPrice) || 0,
            parseFloat(item.minimumPrice) || 0,
            parseFloat(item.averagePrice) || 0,
            spec,
            origin,
            recordDate
          ]
        );
        savedCount++;
      }
    }
    return savedCount;
  } catch (err) {
    throw err;
  } finally {
    connection.release();
  }
}

async function fetchJiangnanWithRetry(retries: number = 3): Promise<JiangnanApiResponse> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.get(
        'https://www.jnmarket.net/api/dailypricelist',
        {
          params: {
            pageNum: 1,
            pageSize: 500,
            kind: 2,
            productName: '百香果'
          },
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
            'Referer': 'https://www.jnmarket.net/fruitsvegetables/dailyprice/fruitprice'
          },
          timeout: 30000,
          httpsAgent: new https.Agent({
            rejectUnauthorized: false
          })
        }
      );

      if (response.data && typeof response.data === 'object') {
        return response.data;
      }

      throw new Error('Invalid response format');
    } catch (error) {
      lastError = error as Error;
      console.error(`Jiangnan fetch attempt ${attempt} failed:`, error);
      if (attempt < retries) {
        await randomDelay(2000, 5000);
      }
    }
  }

  throw lastError || new Error('Failed after retries');
}

export async function crawlJiangnan(sourceId: number = 4, executionType: string = 'manual'): Promise<{ success: boolean; records: number; message: string }> {
  const startTime = Date.now();
  await logCrawl(sourceId, 'info', `开始执行广州江南百香果抓取(${executionType})`);

  let sourceName = '广州江南百香果';
  let sourceType = '大型批发市场';
  try {
    const [rows] = await pool.query('SELECT name, type FROM data_sources WHERE id = ?', [sourceId]);
    const sources = rows as any[];
    if (sources.length > 0) {
      sourceName = sources[0].name;
      sourceType = sources[0].type;
    }
  } catch (err) {
    console.error('Failed to get source info:', err);
  }

  const taskId = await createTaskExecution(sourceId, sourceName, sourceType, 'running', executionType);

  try {
    const latestDbDate = await getLatestDateFromDb(sourceId, 'jiangnan');
    const latestDbDateOnly = toDateOnly(latestDbDate);
    const weekDayNames = ['日', '一', '二', '三', '四', '五', '六'];
    await logCrawl(sourceId, 'info', `数据库最新报价日期: ${formatDateForDb(latestDbDateOnly)} (周${weekDayNames[latestDbDateOnly.getDay()]})`);

    const today = new Date();
    const todayOnly = toDateOnly(today);
    const startDate = new Date(latestDbDateOnly);
    startDate.setDate(startDate.getDate() + 1);

    const actualStartDate = startDate < MIN_DATE ? MIN_DATE : startDate;
    if (actualStartDate > todayOnly) {
      await logCrawl(sourceId, 'info', '没有待检查的日期');
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      await updateDataSourceStatus(sourceId, 'success', duration, 0, executionType);
      await updateTaskExecution(taskId, 'success', `${duration}s`, 0);
      return { success: true, records: 0, message: '没有需要检查的新日期' };
    }

    await logCrawl(sourceId, 'info', `检查日期范围: ${formatDateForDb(actualStartDate)} 至 ${formatDateForDb(todayOnly)}`);

    await logCrawl(sourceId, 'info', '正在请求广州江南API...');
    const apiResponse = await fetchJiangnanWithRetry();

    await logCrawl(sourceId, 'info', `API返回百香果数据: ${apiResponse.rows.length} 条`);

    if (apiResponse.rows.length === 0) {
      await logCrawl(sourceId, 'info', '未找到百香果相关数据');
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      await updateDataSourceStatus(sourceId, 'success', duration, 0, executionType);
      await updateTaskExecution(taskId, 'success', `${duration}s`, 0);
      return { success: true, records: 0, message: '未找到百香果相关数据' };
    }

    await logCrawl(sourceId, 'info', '正在保存数据到数据库...');
    const savedCount = await saveJiangnanData(sourceId, apiResponse.rows);

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    const status = savedCount >= 0 ? 'success' : 'success';
    const message = savedCount > 0
      ? `广州江南百香果抓取完成，保存 ${savedCount} 条记录`
      : `广州江南百香果抓取完成，未获取到新数据`;

    await logCrawl(sourceId, 'success', message);
    await updateDataSourceStatus(sourceId, status, duration, savedCount, executionType);
    await updateTaskExecution(taskId, status, `${duration}s`, savedCount);

    return { success: true, records: savedCount, message };
  } catch (err) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    const errorMsg = err instanceof Error ? err.message : '未知错误';
    await logCrawl(sourceId, 'error', `抓取异常: ${errorMsg}`);
    await updateDataSourceStatus(sourceId, 'failed', duration, 0, executionType);
    await updateTaskExecution(taskId, 'failed', `${duration}s`, 0, errorMsg);
    return { success: false, records: 0, message: errorMsg };
  }
}