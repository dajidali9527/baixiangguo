
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('='.repeat(80));
console.log('惠农网黄金百香果爬虫 - URL直访模式');
console.log('='.repeat(80));

async function randomDelay(min, max) {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  console.log(`  ⏳ 等待 ${(delay/1000).toFixed(1)} 秒...`);
  return new Promise(resolve => setTimeout(resolve, delay));
}

async function scrapePage(page, pageNum) {
  const url = `https://www.cnhnb.com/hangqing/cdlist-2001332-12167-0-0-0-${pageNum}/`;
  
  console.log(`\n📄 第 ${pageNum} 页: ${url}`);
  
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await randomDelay(4000, 8000);
    
    await page.mouse.wheel(0, 300 + Math.random() * 500);
    await randomDelay(1000, 2000);
    
    const data = await page.$$eval(
      'table tr, li.market-list-item',
      (elements) => {
        const results = [];
        
        for (const el of elements) {
          let rowData = {};
          
          if (el.tagName.toLowerCase() === 'tr') {
            const tds = el.querySelectorAll('td');
            if (tds && tds.length >= 4) {
              rowData = {
                date: tds[0]?.innerText.trim(),
                product: tds[1]?.innerText.trim(),
                area: tds[2]?.innerText.trim(),
                price: tds[3]?.innerText.trim(),
                change: tds[4]?.innerText.trim()
              };
            }
          } else if (el.classList.contains('market-list-item')) {
            const spans = el.querySelectorAll('span, div');
            let textParts = [];
            spans.forEach(s => textParts.push(s.innerText.trim()));
            rowData = {
              rawText: textParts.join(' | '),
              text: el.innerText.trim()
            };
          }
          
          if (rowData.date || rowData.product || rowData.text) {
            results.push(rowData);
          }
        }
        
        return results;
      }
    );
    
    console.log(`  ✅ 提取到 ${data.length} 条数据`);
    
    const html = await page.content();
    fs.writeFileSync(
      path.join(__dirname, `page-${pageNum}.html`),
      html
    );
    console.log(`  💾 HTML已保存`);
    
    return data;
  } catch (err) {
    console.log(`  ❌ 第 ${pageNum} 页失败:`, err.message);
    return null;
  }
}

async function main() {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 100,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage'
    ]
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'zh-CN'
  });

  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    window.chrome = { runtime: {} };
    Object.defineProperty(navigator, 'languages', { get: () => ['zh-CN', 'zh', 'en'] });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });
  });

  const page = await context.newPage();
  
  console.log('\n📢 重要提示：');
  console.log('1. 浏览器将打开，先等待页面加载');
  console.log('2. 如果弹出验证码，请手动过一次');
  console.log('3. 过了验证码后，程序将自动采集');
  console.log('='.repeat(80));
  
  const allData = [];
  
  try {
    console.log('\n🚀 初始化访问首页...');
    await page.goto('https://www.cnhnb.com/hangqing/cdlist-2001332-12167-0-0-0-1/', { 
      waitUntil: 'domcontentloaded', 
      timeout: 90000 
    });
    
    console.log('\n⏰ 给你 30 秒时间手动过验证码（如果有）...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    const maxPages = 5;
    console.log(`\n🎯 开始采集，计划 ${maxPages} 页`);
    
    for (let i = 1; i <= maxPages; i++) {
      const pageData = await scrapePage(page, i);
      if (pageData) {
        allData.push(...pageData);
      }
    }
    
    console.log(`\n✅ 采集完成！共 ${allData.length} 条数据`);
    
    const resultFile = path.join(__dirname, 'huinong-result.json');
    fs.writeFileSync(
      resultFile,
      JSON.stringify(allData, null, 2)
    );
    console.log(`💾 数据已保存: ${resultFile}`);
    
  } catch (err) {
    console.error('\n❌ 运行失败:', err.message);
    console.error(err.stack);
  } finally {
    console.log('\n📋 浏览器将在 10 秒后关闭...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    await browser.close();
  }
}

main();
