import { chromium, Browser } from 'playwright';
import * as cheerio from 'cheerio';
import pool from '../../config/database.js';
import { logCrawl, createTaskExecution, updateTaskExecution, updateDataSourceStatus, checkDataExists, getLatestDateFromDb, getValidDatesBetween, randomDelay, toDateOnly, formatDateForDb, MIN_DATE } from './base.js';

interface BxxPriceData {
  province: string;
  region: string;
  price: number;
  priceType: string;
  spec: string;
  remark: string;
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
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const recordDate = formatDateForDb(date);
    await client.query(
      'DELETE FROM pf_price_records WHERE source_type = $1 AND source_id = $2 AND record_date = $3',
      ['bxx', sourceId, recordDate]
    );
    let savedCount = 0;
    for (const item of data) {
      await client.query(
        `INSERT INTO pf_price_records
         (source_type, source_id, province, region, high_price, low_price, avg_price, price_type, spec, remark, record_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        ['bxx', sourceId, item.province, item.region, item.price, item.price, item.price, item.priceType, item.spec, item.remark, recordDate]
      );
      savedCount++;
    }
    await client.query('COMMIT');
    const verify = await client.query(
      'SELECT COUNT(*) as cnt FROM pf_price_records WHERE source_type = $1 AND source_id = $2 AND record_date = $3',
      ['bxx', sourceId, recordDate]
    );
    await logCrawl(sourceId, 'info', `保存验证: ${recordDate} 实际存入 ${verify.rows[0].cnt} 条，parseBxxData 返回 ${data.length} 条`);
    return savedCount;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function crawlBxx(sourceId: number = 1, executionType: string = 'manual'): Promise<{ success: boolean; records: number; message: string }> {
  const startTime = Date.now();
  await logCrawl(sourceId, 'info', `开始执行百香果信息平台抓取（${executionType}）`);
  let sourceName = '百香果信息平台';
  let sourceType = '自媒体';
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
