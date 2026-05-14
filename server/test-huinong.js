
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HUINONG_URL = 'https://www.cnhnb.com/hangqing/cdlist-2001332-12167-0-0-0-1';

console.log('='.repeat(80));
console.log('惠农网黄金百香果 - 深度接口捕获模式 (去乱码版)');
console.log('='.repeat(80));
console.log('📌 使用说明：');
console.log('1. 浏览器打开后，先手动过验证码');
console.log('2. 然后点击分页');
console.log('3. 控制台会输出所有可疑接口');
console.log('4. 重点观察：');
console.log('   - 请求 URL');
console.log('   - POST DATA');
console.log('   - RESPONSE 内容');
console.log('='.repeat(80));

async function randomDelay(min, max) {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, delay));
}

async function test() {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 50,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  });

  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    locale: 'zh-CN',
    extraHTTPHeaders: { 'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8' }
  });

  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    window.chrome = { runtime: {} };
    Object.defineProperty(navigator, 'languages', { get: () => ['zh-CN', 'zh', 'en'] });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4] });
  });

  const page = await context.newPage();
  const apiResults = [];

  page.on('request', async (request) => {
    try {
      const url = request.url();
      const hit = url.includes('hangqing') || url.includes('price') || url.includes('list') ||
        url.includes('market') || url.includes('search') || url.includes('quote') ||
        url.includes('ajax') || url.includes('api');

      if (!hit) return;

      console.log('\n' + '='.repeat(80));
      console.log('🚀 REQUEST 捕获');
      console.log('='.repeat(80));
      console.log('URL:');
      console.log(url);
      console.log('\nMETHOD:');
      console.log(request.method());
      console.log('\nRESOURCE TYPE:');
      console.log(request.resourceType());

      const headers = request.headers();
      console.log('\nHEADERS:');
      console.log(JSON.stringify(headers, null, 2).slice(0, 2000));

      const postData = request.postData();
      if (postData) {
        console.log('\nPOST DATA:');
        console.log(postData);
      }

      apiResults.push({
        type: 'request',
        url,
        method: request.method(),
        resourceType: request.resourceType(),
        postData,
        headers,
        time: new Date().toISOString()
      });

      fs.writeFileSync(
        path.join(__dirname, 'captured-request.json'),
        JSON.stringify(apiResults, null, 2)
      );

    } catch (err) {
      console.log('REQUEST监听失败:', err.message);
    }
  });

  page.on('response', async (response) => {
    try {
      const request = response.request();
      const url = response.url();
      const hit = url.includes('hangqing') || url.includes('price') || url.includes('list') ||
        url.includes('market') || url.includes('search') || url.includes('quote') ||
        url.includes('ajax') || url.includes('api');

      if (!hit) return;

      const headers = response.headers();
      const contentType = headers['content-type'] || '';
      
      if (
        !contentType.includes('json') && 
        !contentType.includes('text') && 
        !contentType.includes('html')
      ) {
        return;
      }

      console.log('\n' + '='.repeat(80));
      console.log('📦 RESPONSE 捕获');
      console.log('='.repeat(80));
      console.log('URL:');
      console.log(url);
      console.log('\nSTATUS:');
      console.log(response.status());
      console.log('\nRESOURCE TYPE:');
      console.log(request.resourceType());
      console.log('\nCONTENT-TYPE:');
      console.log(contentType);

      let bodyText = '';
      try {
        bodyText = await response.text();
        console.log('\nBODY 前3000字符:');
        console.log(bodyText.slice(0, 3000));
      } catch (e) {
        console.log('\nBODY读取失败:', e.message);
      }

      apiResults.push({
        type: 'response',
        url,
        status: response.status(),
        resourceType: request.resourceType(),
        headers,
        bodyPreview: bodyText.slice(0, 5000),
        time: new Date().toISOString()
      });

      fs.writeFileSync(
        path.join(__dirname, 'captured-response.json'),
        JSON.stringify(apiResults, null, 2)
      );

    } catch (err) {
      console.log('RESPONSE监听失败:', err.message);
    }
  });

  try {
    console.log('\n🚀 打开页面中...');
    await page.goto(HUINONG_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await randomDelay(3000, 5000);
    console.log('\n✅ 页面已打开');
    console.log('👉 请手动翻页');
    console.log('👉 请观察控制台输出');
    console.log('👉 所有结果会保存到当前目录');

    while (true) {
      await randomDelay(5000, 10000);
    }
  } catch (err) {
    console.error('\n❌ 运行失败:', err.message);
  }
}

test();
