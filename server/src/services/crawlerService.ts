import { chromium, Browser, Page } from 'playwright';
import * as cheerio from 'cheerio';
import axios from 'axios';
import https from 'https';
import pool from '../config/database.js';

const MIN_DATE = new Date('2026-04-01');

interface BxxPriceData {
  province: string;
  region: string;
  price: number;
  priceType: string;
  spec: string;
  remark: string;
}

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

let browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browser) {
    const execPath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || process.env.CHROMIUM_PATH;
    browser = await chromium.launch({
      headless: true,
      slowMo: 100,
      executablePath: execPath || undefined,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });
  }
  return browser;
}

export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

async function randomDelay(minMs: number = 1000, maxMs: number = 3000): Promise<void> {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  await new Promise(resolve => setTimeout(resolve, delay));
}

function toDateOnly(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function formatDateForDb(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateForXinfadi(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}/${month}/${day}`;
}

function getAllDatesBetween(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = [];
  const current = new Date(startDate);
  while (current <= endDate) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

async function createTaskExecution(
  sourceId: number,
  sourceName: string,
  sourceType: string,
  status: string,
  executionType: string
): Promise<number> {
  try {
    const [result] = await pool.query(
      'INSERT INTO task_executions (source_id, source_name, source_type, status, execution_type, execution_time) VALUES (?, ?, ?, ?, ?, NOW())',
      [sourceId, sourceName, sourceType, status, executionType]
    );
    return (result as any).insertId;
  } catch (err) {
    console.error('createTaskExecution error:', err);
    return 0;
  }
}

async function updateTaskExecution(
  taskId: number,
  status: string,
  duration: string,
  records: number,
  errorMessage?: string
): Promise<void> {
  try {
    await pool.query(
      'UPDATE task_executions SET status = ?, duration = ?, records = ?, error_message = ? WHERE id = ?',
      [status, duration, records, errorMessage || '', taskId]
    );
  } catch (err) {
    console.error('updateTaskExecution error:', err);
  }
}

async function updateDataSourceStatus(
  sourceId: number,
  status: string,
  duration: string,
  records: number,
  executionType: string
): Promise<void> {
  try {
    await pool.query(
      'UPDATE data_sources SET last_run = NOW(), status = ?, duration = ?, records = ?, execution_type = ? WHERE id = ?',
      [status, duration, records, executionType, sourceId]
    );
  } catch (err) {
    console.error('updateDataSourceStatus error:', err);
  }
}

export async function logCrawl(sourceId: number | null, level: 'info' | 'success' | 'error', message: string): Promise<void> {
  try {
    const safeMessage = message.length > 5000 ? message.substring(0, 5000) + '...[truncated]' : message;
    await pool.query(
      'INSERT INTO crawl_logs (source_id, level, message) VALUES (?, ?, ?)',
      [sourceId, level, safeMessage]
    );
  } catch (err) {
    console.error('Failed to log crawl:', err);
  }
}

async function checkDataExists(sourceId: number, recordDate: string, category2: string, sourceType: string = 'bxx'): Promise<boolean> {
  try {
    let query = 'SELECT id FROM price_records WHERE source_type = ? AND source_id = ? AND record_date = ?';
    const params: any[] = [sourceType, sourceId, recordDate];
    
    if (sourceType === 'jiangnan') {
      query += ' AND origin = ? LIMIT 1';
      params.push(category2);
    } else {
      query += ' AND category2 = ? LIMIT 1';
      params.push(category2);
    }
    
    const [rows] = await pool.query(query, params);
    return (rows as any[]).length > 0;
  } catch (err) {
    console.error('Check data exists error:', err);
    return false;
  }
}

async function getLatestDateFromDb(sourceId: number, sourceType: string = 'bxx'): Promise<Date> {
  try {
    const [rows] = await pool.query(
      'SELECT MAX(record_date) as last_date FROM price_records WHERE source_type = ? AND source_id = ?',
      [sourceType, sourceId]
    );
    const lastDateRow = rows as any[];
    if (lastDateRow[0]?.last_date) {
      return new Date(lastDateRow[0].last_date);
    }
    return new Date('2026-03-31');
  } catch (err) {
    console.error('Get latest date error:', err);
    return new Date('2026-03-31');
  }
}

async function saveXinfadiData(sourceId: number, items: XinfadiApiItem[]): Promise<number> {
  const connection = await pool.getConnection();
  try {
    let savedCount = 0;
    for (const item of items) {
      const recordDate = item.pubDate.split(' ')[0];
      const exists = await checkDataExists(sourceId, recordDate, item.prodPcat, 'xinfadi');
      if (!exists) {
        await connection.query(
          `INSERT INTO price_records 
           (source_type, source_id, category1, category2, name, high_price, low_price, avg_price, spec, origin, unit, record_date)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
    connection.release();
  }
}

async function saveJiangnanData(sourceId: number, items: JiangnanApiItem[]): Promise<number> {
  const connection = await pool.getConnection();
  try {
    let savedCount = 0;
    
    for (const item of items) {
      const recordDate = item.priceDate;
      
      // 确保数据正确，添加 fallback 值
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

function getValidDatesBetween(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = [];
  const current = new Date(startDate);
  while (current <= endDate) {
    const day = current.getDay();
    if (day === 2 || day === 4 || day === 6) {
      dates.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

async function searchWeChatArticle(dateStr: string): Promise<string | null> {
  const searchKeyword = `百香果信息平台：百香果价格行情(${dateStr})`;
  await logCrawl(null, 'info', `正在搜索: ${searchKeyword}`);
  
  const browserInstance = await getBrowser();
  const context = await browserInstance.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();
  
  try {
    await logCrawl(null, 'info', '正在打开搜狗微信首页...');
    await page.goto('https://weixin.sogou.com/', { waitUntil: 'networkidle', timeout: 60000 });
    await randomDelay(2000, 4000);

    await logCrawl(null, 'info', '正在输入搜索关键词...');
    await page.fill('input[name="query"]', searchKeyword);
    await randomDelay();

    await logCrawl(null, 'info', '正在点击搜文章...');
    await page.click('input[type="submit"][value="搜文章"]');
    await randomDelay(3000, 6000);

    try {
      await page.waitForSelector('.news-list', { timeout: 20000 });
    } catch (e) {
      await logCrawl(null, 'error', '等待搜索结果超时');
    }

    await logCrawl(null, 'info', '正在查找匹配的文章...');
    const results = await page.$$('.news-list li');
    
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      
      const fullTitle = await result.$eval('h3 a', el => el.textContent?.trim() || '').catch(() => '');
      const sourceSpan = await result.$eval('.s-p span', el => el.textContent?.trim() || '').catch(() => '');
      
      if (fullTitle.includes(dateStr) && sourceSpan.includes('百香果信息平台')) {
        await logCrawl(null, 'success', '找到匹配的文章！');
        
        await logCrawl(null, 'info', '正在获取文章链接...');
        const articleUrl = await result.$eval('h3 a', el => el.getAttribute('href'));
        
        if (!articleUrl) {
          await logCrawl(null, 'error', '获取文章链接失败');
          await context.close();
          return null;
        }
        
        let fullUrl = articleUrl;
        if (!articleUrl.startsWith('http')) {
          if (articleUrl.startsWith('//')) {
            fullUrl = 'https:' + articleUrl;
          } else if (articleUrl.startsWith('/')) {
            fullUrl = 'https://weixin.sogou.com' + articleUrl;
          }
        }
        
        await logCrawl(null, 'info', `尝试直接访问: ${fullUrl}`);
        await page.goto(fullUrl, { waitUntil: 'networkidle', timeout: 60000 });
        await randomDelay(3000, 6000);
        
        let currentUrl = page.url();
        if (currentUrl.includes('weixin.sogou.com') && !currentUrl.includes('mp.weixin.qq.com')) {
          await logCrawl(null, 'info', '还在搜狗页面，等待重定向...');
          await randomDelay(3000, 6000);
          currentUrl = page.url();
        }
        
        if (!currentUrl.includes('mp.weixin.qq.com')) {
          await logCrawl(null, 'info', '查找页面中的跳转链接...');
          const redirectLink = await page.$('a[href*="mp.weixin.qq.com"]');
          if (redirectLink) {
            await logCrawl(null, 'info', '找到跳转链接，点击...');
            await Promise.all([
              page.waitForNavigation({ waitUntil: 'networkidle', timeout: 60000 }),
              redirectLink.click()
            ]);
            await randomDelay();
          }
        }
        
        const html = await page.content();
        await context.close();
        return html;
      }
    }
    
    await logCrawl(null, 'error', '未找到匹配的文章');
    await context.close();
    return null;
    
  } catch (err) {
    console.error('Search failed:', err);
    await logCrawl(null, 'error', `搜索失败: ${err instanceof Error ? err.message : '未知错误'}`);
    await context.close();
    return null;
  } finally {
    await page.close();
  }
}

function parseBxxData(html: string): BxxPriceData[] {
  const $ = cheerio.load(html);
  const data: BxxPriceData[] = [];
  
  let content = $('#img-content');
  if (!content.length) {
    content = $('body');
  }
  
  let currentProduct: string | null = null;
  const nodes = content.find('img, table');
  
  for (let i = 0; i < nodes.length; i++) {
    const node = $(nodes[i]);
    
    if (node.is('img')) {
      const alt = node.attr('alt');
      
      if (alt && (alt.includes('图片2') || alt.includes('黄金百香果'))) {
        currentProduct = '黄金百香果';
      } else if (alt && (alt.includes('图片1') || alt.includes('百香桂蜜'))) {
        currentProduct = '百香桂蜜';
      } else {
        currentProduct = null;
      }
      
    } else if (node.is('table')) {
      if (currentProduct === '黄金百香果') {
        const rows = node.find('tr');
        
        if (rows.length > 0) {
          const headerRow = $(rows[0]);
          const headerCells = headerRow.find('td, th');
          const headerTexts = headerCells.map((_, cell) => $(cell).text().trim()).get();
          
          if (headerTexts.includes('省') && headerTexts.includes('地区') && headerTexts.includes('市斤价')) {
            let currentProvince = '';
            let currentRegion = '';
            let currentRemark = '';
            
            for (let r = 1; r < rows.length; r++) {
              const row = $(rows[r]);
              const cells = row.find('td, th');
              const cellTexts = cells.map((_, cell) => $(cell).text().trim()).get();
              
              if (cellTexts.every(t => !t.trim())) {
                continue;
              }
              
              let foundPriceIdx = -1;
              for (let c = 0; c < cellTexts.length; c++) {
                if (cellTexts[c] && cellTexts[c].match(/^\d+(\.\d+)?$/)) {
                  foundPriceIdx = c;
                  break;
                }
              }
              
              if (foundPriceIdx === -1) {
                continue;
              }
              
              let provinceText = '';
              let regionText = '';
              let priceTypeText = '产地价';
              let specText = '';
              let remarkText = '';
              
              const possibleProvinceIdx = foundPriceIdx - 2;
              if (possibleProvinceIdx >= 0 && cellTexts[possibleProvinceIdx]?.trim()) {
                provinceText = cellTexts[possibleProvinceIdx].trim();
              } else if (currentProvince) {
                provinceText = currentProvince;
              }
              
              const possibleRegionIdx = foundPriceIdx - 1;
              if (possibleRegionIdx >= 0 && cellTexts[possibleRegionIdx]?.trim()) {
                regionText = cellTexts[possibleRegionIdx].trim();
              } else if (currentRegion) {
                regionText = currentRegion;
              }
              
              const possiblePriceTypeIdx = foundPriceIdx + 1;
              if (possiblePriceTypeIdx < cellTexts.length && cellTexts[possiblePriceTypeIdx]?.trim()) {
                priceTypeText = cellTexts[possiblePriceTypeIdx].trim();
              }
              
              const possibleSpecIdx = foundPriceIdx + 2;
              if (possibleSpecIdx < cellTexts.length) {
                specText = cellTexts[possibleSpecIdx] || '';
              }
              
              const possibleRemarkIdx = foundPriceIdx + 3;
              if (possibleRemarkIdx < cellTexts.length && cellTexts[possibleRemarkIdx]?.trim()) {
                remarkText = cellTexts[possibleRemarkIdx].trim();
              } else if (currentRemark) {
                remarkText = currentRemark;
              }
              
              if (provinceText) currentProvince = provinceText;
              if (regionText) currentRegion = regionText;
              if (remarkText) currentRemark = remarkText;
              
              const price = parseFloat(cellTexts[foundPriceIdx]);
              if (!isNaN(price) && price > 0) {
                data.push({
                  province: provinceText,
                  region: regionText,
                  price: price,
                  priceType: priceTypeText,
                  spec: specText,
                  remark: remarkText
                });
              }
            }
          }
        }
      }
    }
  }
  
  return data;
}

async function saveBxxData(sourceId: number, date: Date, data: BxxPriceData[]): Promise<number> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const recordDate = formatDateForDb(date);
    await connection.query(
      'DELETE FROM price_records WHERE source_type = ? AND source_id = ? AND record_date = ?',
      ['bxx', sourceId, recordDate]
    );

    let savedCount = 0;
    for (const item of data) {
      await connection.query(
        `INSERT INTO price_records 
         (source_type, source_id, province, region, high_price, low_price, avg_price, price_type, spec, remark, record_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['bxx', sourceId, item.province, item.region, item.price, item.price, item.price, item.priceType, item.spec, item.remark, recordDate]
      );
      savedCount++;
    }

    await connection.commit();
    
    const [verify] = await connection.query(
      'SELECT COUNT(*) as cnt FROM price_records WHERE source_type = ? AND source_id = ? AND record_date = ?',
      ['bxx', sourceId, recordDate]
    );
    await logCrawl(sourceId, 'info', `保存验证: ${recordDate} 实际存入 ${(verify as any[])[0].cnt} 条，parseBxxData 返回 ${data.length} 条`);
    
    return savedCount;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

export async function crawlBxx(sourceId: number = 1, executionType: string = 'manual'): Promise<{ success: boolean; records: number; message: string }> {
  const startTime = Date.now();
  await logCrawl(sourceId, 'info', `开始执行百香果信息平台抓取（${executionType}）`);

  let sourceName = '百香果信息平台';
  let sourceType = '自媒体';
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
    const latestDbDate = await getLatestDateFromDb(sourceId);
    const latestDbDateOnly = toDateOnly(latestDbDate);
    const weekDayNames = ['日', '一', '二', '三', '四', '五', '六'];
    await logCrawl(sourceId, 'info', `数据库最新报价日期: ${formatDateForDb(latestDbDateOnly)} (周${weekDayNames[latestDbDateOnly.getDay()]})`);

    const today = new Date();
    const todayOnly = toDateOnly(today);
    const startDate = new Date(latestDbDateOnly);
    startDate.setDate(startDate.getDate() + 1);
    const datesToCheck = getValidDatesBetween(startDate, todayOnly);
    
    await logCrawl(sourceId, 'info', `检查日期范围: ${formatDateForDb(startDate)} 至 ${formatDateForDb(todayOnly)}`);
    
    if (datesToCheck.length === 0) {
      await logCrawl(sourceId, 'info', '没有待检查的日期');
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      await updateDataSourceStatus(sourceId, 'success', duration, 0, executionType);
      await updateTaskExecution(taskId, 'success', `${duration}s`, 0);
      await closeBrowser();
      return { success: true, records: 0, message: '没有需要检查的新日期' };
    }

    await logCrawl(sourceId, 'info', `待检查日期列表(${datesToCheck.length}个): ${datesToCheck.map((d: Date) => `${formatDateForDb(d)}(周${weekDayNames[d.getDay()]})`).join(', ')}`);

    let totalRecords = 0;
    let successDates = 0;

    for (let i = 0; i < datesToCheck.length; i++) {
      const date = datesToCheck[i];
      const dateStrSearch = `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`;
      const dateStrDb = formatDateForDb(date);
      
      const exists = await checkDataExists(sourceId, dateStrDb, '', 'bxx');
      if (exists) {
        await logCrawl(sourceId, 'info', `${dateStrDb} 数据已存在，跳过`);
        continue;
      }

      await logCrawl(sourceId, 'info', `正在抓取 ${dateStrDb} 的数据...`);

      const articleHtml = await searchWeChatArticle(dateStrSearch);
      if (!articleHtml) {
        await logCrawl(sourceId, 'error', `未找到 ${dateStrDb} 的文章`);
        continue;
      }

      const bxxData = parseBxxData(articleHtml);
      if (bxxData.length === 0) {
        await logCrawl(sourceId, 'error', `解析 ${dateStrDb} 数据失败或无黄金百香果数据`);
        continue;
      }

      const savedCount = await saveBxxData(sourceId, date, bxxData);
      totalRecords += savedCount;
      successDates++;
      await logCrawl(sourceId, 'success', `${dateStrDb} 抓取成功，parseBxxData返回${bxxData.length}条，实际保存${savedCount}条`);
      
      if (i < datesToCheck.length - 1) {
        await logCrawl(sourceId, 'info', `等待 10-20 秒后继续...`);
        await randomDelay(10000, 20000);
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    const message = successDates > 0 
      ? `百香果信息平台抓取完成，成功 ${successDates}/${datesToCheck.length} 个日期，共 ${totalRecords} 条记录`
      : `百香果信息平台抓取完成，未获取到新数据`;

    await logCrawl(sourceId, 'success', message);
    await updateDataSourceStatus(sourceId, 'success', duration, totalRecords, executionType);
    await updateTaskExecution(taskId, 'success', `${duration}s`, totalRecords);
    await closeBrowser();

    return { success: true, records: totalRecords, message };
  } catch (err) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    const errorMsg = err instanceof Error ? err.message : '未知错误';
    await logCrawl(sourceId, 'error', `抓取异常: ${errorMsg}`);
    await updateDataSourceStatus(sourceId, 'failed', duration, 0, executionType);
    await updateTaskExecution(taskId, 'failed', `${duration}s`, 0, errorMsg);
    await closeBrowser();
    return { success: false, records: 0, message: errorMsg };
  }
}

export async function crawlHuinong(sourceId: number = 2, executionType: string = 'manual'): Promise<{ success: boolean; records: number; message: string }> {
  return { success: true, records: 0, message: '暂未实现' };
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
