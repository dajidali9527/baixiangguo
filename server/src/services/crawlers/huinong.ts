import axios from 'axios';
import * as cheerio from 'cheerio';
import pool from '../../config/database.js';
import {
  logCrawl, createTaskExecution, updateTaskExecution, updateDataSourceStatus,
  checkDataExists, randomDelay, sanitize
} from './base.js';

interface HuinongPriceData {
  recordDate: string;
  product: string;
  origin: string;
  dailyPrice: number;
}

const HUINONG_BASE = 'https://www.cnhnb.com';
const HUINONG_LIST_URL = `${HUINONG_BASE}/hangqing/cdlist-2001332-12167-0-0-0-`;
const HUINONG_MAX_PAGES = 4;

async function fetchHuinongHtml(url: string, referer: string): Promise<string> {
  const response = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Referer': referer,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    },
    timeout: 30000,
    responseType: 'text',
    maxRedirects: 5,
  });
  return response.data;
}

function extractHuinongListItems(html: string): HuinongPriceData[] {
  const $ = cheerio.load(html);
  const items: HuinongPriceData[] = [];
  const seen = new Set<string>();

  $('a[href*="/hangqing/cd-"]').each((_, a) => {
    const li = $(a).closest('li.market-list-item');
    if (!li.length) return;

    const date = sanitize(li.find('span.time').text());
    const product = sanitize(li.find('span.product').text());
    const origin = sanitize(li.find('span.place').text());
    const priceText = sanitize(li.find('span.price').text()).replace(/[^\d.]/g, '');
    const dailyPrice = parseFloat(priceText);

    if (!date || !product || !origin || isNaN(dailyPrice) || dailyPrice <= 0) return;

    const key = `${date}|${product}|${origin}`;
    if (seen.has(key)) return;
    seen.add(key);

    items.push({ recordDate: date, product, origin, dailyPrice });
  });

  return items;
}

async function saveHuinongData(sourceId: number, data: HuinongPriceData[], isReexecute: boolean = false): Promise<number> {
  let savedCount = 0;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    if (isReexecute && data.length > 0) {
      const recordDate = data[0].recordDate;
      await connection.query(
        'DELETE FROM price_records WHERE source_id = ? AND record_date = ? AND source_type = ?',
        [sourceId, recordDate, 'huinong']
      );
    }

    for (const item of data) {
      await connection.query(
        `INSERT INTO price_records (source_id, source_type, product, origin, avg_price, record_date)
         VALUES (?, 'huinong', ?, ?, ?, ?)`,
        [sourceId, item.product, item.origin, item.dailyPrice, item.recordDate]
      );
      savedCount++;
    }

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    console.error('Failed to save huinong data:', err);
  } finally {
    connection.release();
  }
  return savedCount;
}

export async function crawlHuinong(sourceId: number = 2, executionType: string = 'manual'): Promise<{ success: boolean; records: number; message: string }> {
  const startTime = Date.now();
  await logCrawl(sourceId, 'info', `惠农网黄金百香果采集开始(${executionType})`);

  let sourceName = '惠农网黄金百香果';
  let sourceType = '电商平台';
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
    const allData: HuinongPriceData[] = [];
    let targetRecordDate = '';

    for (let pageNum = 1; pageNum <= HUINONG_MAX_PAGES; pageNum++) {
      const listUrl = `${HUINONG_LIST_URL}${pageNum}/`;
      await logCrawl(sourceId, 'info', `列表页 ${pageNum}: ${listUrl}`);

      let listHtml: string;
      try {
        listHtml = await fetchHuinongHtml(listUrl, `${HUINONG_BASE}/`);
      } catch (err) {
        await logCrawl(sourceId, 'error', `列表页 ${pageNum} 请求失败，跳过`);
        continue;
      }

      const items = extractHuinongListItems(listHtml);
      await logCrawl(sourceId, 'info', `列表页 ${pageNum} 解析到 ${items.length} 条`);

      if (items.length === 0) {
        await logCrawl(sourceId, 'info', '没有更多数据');
        break;
      }

      if (!targetRecordDate) {
        targetRecordDate = items[0].recordDate;
        await logCrawl(sourceId, 'info', `目标报价日期: ${targetRecordDate}`);

        const isReexecute = executionType.includes('重新执行');
        if (!isReexecute) {
          const exists = await checkDataExists(sourceId, targetRecordDate, '', 'huinong');
          if (exists) {
            await logCrawl(sourceId, 'info', `${targetRecordDate} 数据已存在，跳过`);
            const duration = ((Date.now() - startTime) / 1000).toFixed(1);
            await updateDataSourceStatus(sourceId, 'success', duration, 0, executionType);
            await updateTaskExecution(taskId, 'success', `${duration}s`, 0);
            return { success: true, records: 0, message: `${targetRecordDate} 数据已存在` };
          }
        }
      }

      for (const item of items) {
        if (item.recordDate !== targetRecordDate) continue;

        allData.push(item);
        await logCrawl(sourceId, 'info', `${item.recordDate} | ${item.product} | ${item.origin} | ${item.dailyPrice}`);
        await randomDelay(3000, 8000);
      }

      if (pageNum < HUINONG_MAX_PAGES) {
        await randomDelay(3000, 8000);
      }
    }

    if (allData.length === 0) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      await logCrawl(sourceId, 'info', '未获取到新数据');
      await updateDataSourceStatus(sourceId, 'success', duration, 0, executionType);
      await updateTaskExecution(taskId, 'success', `${duration}s`, 0);
      return { success: true, records: 0, message: '未获取到新数据' };
    }

    const isReexecute = executionType.includes('重新执行');
    const savedCount = await saveHuinongData(sourceId, allData, isReexecute);

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    const message = `惠农网黄金百香果采集完成，共 ${allData.length} 条，保存 ${savedCount} 条`;
    await logCrawl(sourceId, 'success', message);
    await updateDataSourceStatus(sourceId, 'success', duration, savedCount, executionType);
    await updateTaskExecution(taskId, 'success', `${duration}s`, savedCount);

    return { success: true, records: savedCount, message };
  } catch (err) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    const errorMsg = err instanceof Error ? err.message : '未知错误';
    await logCrawl(sourceId, 'error', `采集异常: ${errorMsg}`);
    await updateDataSourceStatus(sourceId, 'failed', duration, 0, executionType);
    await updateTaskExecution(taskId, 'failed', `${duration}s`, 0, errorMsg);
    return { success: false, records: 0, message: errorMsg };
  }
}