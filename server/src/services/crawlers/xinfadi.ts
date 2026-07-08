import axios from 'axios';
import pool from '../../config/database.js';
import {
  logCrawl, createTaskExecution, updateTaskExecution, updateDataSourceStatus,
  checkDataExists, getLatestDateFromDb, randomDelay, toDateOnly, formatDateForDb,
  formatDateForXinfadi, MIN_DATE
} from './base.js';

interface XinfadiApiItem {
  id: number;
  prodName: string;
  prodCatid: number;
  prodCat: string;
  prodPcatid: number;
  prodPcat: string;
  lowPrice: string;
  highPrice: string;
  avgPrice: string;
  place: string;
  specInfo: string;
  unitInfo: string;
  pubDate: string;
}

interface XinfadiApiResponse {
  current: number;
  limit: number;
  count: number;
  list: XinfadiApiItem[];
}

async function saveXinfadiData(sourceId: number, items: XinfadiApiItem[]): Promise<number> {
  const client = await pool.connect();
  try {
    let savedCount = 0;
    for (const item of items) {
      const recordDate = item.pubDate.split(' ')[0];
      const exists = await checkDataExists(sourceId, recordDate, item.prodPcat, 'xinfadi');
      if (!exists) {
        await client.query(
          `INSERT INTO pf_price_records
           (source_type, source_id, category1, category2, name, high_price, low_price, avg_price, spec, origin, unit, record_date)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            'xinfadi',
            sourceId,
            item.prodCat,
            item.prodPcat,
            item.prodName,
            parseFloat(item.highPrice) || 0,
            parseFloat(item.lowPrice) || 0,
            parseFloat(item.avgPrice) || 0,
            item.specInfo,
            item.place,
            item.unitInfo,
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
    client.release();
  }
}

async function fetchXinfadiWithRetry(startDate: Date, endDate: Date, retries: number = 3): Promise<XinfadiApiResponse> {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.post(
        'http://www.xinfadi.com.cn/getPriceData.html',
        new URLSearchParams({
          limit: '200',
          current: '1',
          pubDateStartTime: formatDateForXinfadi(startDate),
          pubDateEndTime: formatDateForXinfadi(endDate),
          prodName: '百香果'
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
            'Referer': 'http://www.xinfadi.com.cn/priceDetail.html'
          },
          timeout: 30000
        }
      );
      if (response.data && typeof response.data === 'object') {
        return response.data;
      }
      throw new Error('Invalid response format');
    } catch (error) {
      lastError = error as Error;
      console.error(`Attempt ${attempt} failed:`, error);
      if (attempt < retries) {
        await randomDelay(2000, 5000);
      }
    }
  }
  throw lastError || new Error('Failed after retries');
}

export async function crawlXinfadi(sourceId: number = 3, executionType: string = 'manual'): Promise<{ success: boolean; records: number; message: string }> {
  const startTime = Date.now();
  await logCrawl(sourceId, 'info', `开始执行北京新发地百香果抓取(${executionType})`);
  let sourceName = '北京新发地百香果';
  let sourceType = '大型批发市场';
  try {
    const result = await pool.query('SELECT name, type FROM pf_data_sources WHERE id = $1', [sourceId]);
    if (result.rows.length > 0) {
      sourceName = result.rows[0].name;
      sourceType = result.rows[0].type;
    }
  } catch (err) {
    console.error('Failed to get source info:', err);
  }

  const taskId = await createTaskExecution(sourceId, sourceName, sourceType, 'running', executionType);

  try {
    const latestDbDate = await getLatestDateFromDb(sourceId, 'xinfadi');
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

    await logCrawl(sourceId, 'info', '正在请求新发地API...');
    const apiResponse = await fetchXinfadiWithRetry(actualStartDate, todayOnly);

    await logCrawl(sourceId, 'info', `API返回数据条数: ${apiResponse.list.length}`);

    const passionFruitItems = apiResponse.list.filter(item =>
      item.prodName.includes('百香果') || item.prodName.includes('黄金百香果')
    );

    if (passionFruitItems.length === 0) {
      await logCrawl(sourceId, 'info', '未找到百香果相关数据');
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      await updateDataSourceStatus(sourceId, 'success', duration, 0, executionType);
      await updateTaskExecution(taskId, 'success', `${duration}s`, 0);
      return { success: true, records: 0, message: '未找到百香果相关数据' };
    }

    await logCrawl(sourceId, 'info', `筛选到百香果数据: ${passionFruitItems.length} 条`);

    const uniqueDataMap = new Map<string, XinfadiApiItem>();
    for (const item of passionFruitItems) {
      const recordDate = item.pubDate.split(' ')[0];
      const key = `${recordDate}_${item.prodPcat}`;
      if (!uniqueDataMap.has(key)) {
        uniqueDataMap.set(key, item);
      }
    }

    const uniqueItems = Array.from(uniqueDataMap.values());
    await logCrawl(sourceId, 'info', `去重后保留: ${uniqueItems.length} 条`);

    await logCrawl(sourceId, 'info', '正在保存数据到数据库...');
    const savedCount = await saveXinfadiData(sourceId, uniqueItems);

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    const status = savedCount > 0 ? 'success' : 'success';
    const message = savedCount > 0
      ? `北京新发地百香果抓取完成，保存 ${savedCount} 条记录`
      : `北京新发地百香果抓取完成，未获取到新数据`;

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
