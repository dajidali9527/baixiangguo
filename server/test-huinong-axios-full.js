import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HUINONG_BASE_URL = 'https://www.cnhnb.com/hangqing/cdlist-2001332-12167-0-0-0-';
const MAX_PAGES = 4;

console.log('='.repeat(80));
console.log('惠农网黄金百香果 - axios + cheerio 完整采集');
console.log('='.repeat(80));

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Cache-Control': 'max-age=0',
  'Upgrade-Insecure-Requests': '1'
};

async function randomDelay(min = 3000, max = 5000) {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  console.log(`  ⏳ 等待 ${(delay / 1000).toFixed(1)} 秒...`);
  return new Promise(resolve => setTimeout(resolve, delay));
}

async function fetchPage(pageNum) {
  const url = `${HUINONG_BASE_URL}${pageNum}/`;
  console.log(`\n[第${pageNum}页] 正在请求: ${url}`);

  try {
    const res = await axios.get(url, {
      headers: HEADERS,
      timeout: 60000
    });

    const htmlFile = path.join(__dirname, `huinong-page-${pageNum}.html`);
    fs.writeFileSync(htmlFile, res.data, 'utf8');
    console.log(`[第${pageNum}页] HTML 已保存: ${htmlFile}`);

    return res.data;
  } catch (err) {
    console.error(`[第${pageNum}页] 请求失败:`, err.message);
    if (err.response) {
      console.error('状态码:', err.response.status);
    }
    return null;
  }
}

function parseHtml(html, pageNum) {
  console.log(`[第${pageNum}页] 正在解析 HTML...`);
  const $ = cheerio.load(html);
  const data = [];

  // 方案1: 尝试解析 li.market-list-item
  const items = $('li.market-list-item');
  console.log(`[第${pageNum}页] 找到 ${items.length} 个 market-list-item`);

  items.each((index, element) => {
    const item = $(element);

    const date = item.find('span.time').text().trim();
    const product = item.find('span.product').text().trim();
    const origin = item.find('span.place').text().trim();
    let priceText = item.find('span.price').text().trim();

    if (priceText) {
      priceText = priceText.replace(/[^\d.]/g, '');
    }

    const dailyPrice = parseFloat(priceText);

    if (date && product && origin && !isNaN(dailyPrice) && dailyPrice > 0) {
      data.push({
        recordDate: date,
        product,
        origin,
        dailyPrice,
        high7Price: 0,
        low7Price: 0,
        avg7Price: 0
      });
    }
  });

  // 方案2: 如果方案1没结果，尝试用更宽松的选择器
  if (data.length === 0) {
    console.log(`[第${pageNum}页] 方案1无结果，尝试方案2...`);
    const allText = $('body').text();
    
    // 尝试从页面文本中找规律
    const lines = allText.split(/\n+/).map(line => line.trim()).filter(line => line);
    
    console.log(`[第${pageNum}页] 提取到 ${lines.length} 行文本`);
    
    // 简单输出一些文本让用户参考
    console.log(`[第${pageNum}页] 前20行文本:`);
    for (let i = 0; i < Math.min(20, lines.length); i++) {
      console.log(`  ${i + 1}. ${lines[i].slice(0, 100)}`);
    }
  }

  return data;
}

async function main() {
  const allData = [];

  for (let pageNum = 1; pageNum <= MAX_PAGES; pageNum++) {
    const html = await fetchPage(pageNum);
    if (!html) continue;

    const pageData = parseHtml(html, pageNum);
    console.log(`[第${pageNum}页] 解析到 ${pageData.length} 条数据`);
    
    pageData.forEach((item, i) => {
      console.log(`  [${i + 1}] ${item.recordDate} | ${item.product} | ${item.origin} | ¥${item.dailyPrice}`);
    });

    allData.push(...pageData);

    if (pageNum < MAX_PAGES) {
      await randomDelay(4000, 8000);
    }
  }

  const resultFile = path.join(__dirname, 'huinong-axios-result.json');
  fs.writeFileSync(resultFile, JSON.stringify(allData, null, 2), 'utf8');
  console.log(`\n📊 采集完成! 共 ${allData.length} 条数据, 已保存至: ${resultFile}`);
}

main();
