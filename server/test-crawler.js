import { chromium } from 'playwright';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('='.repeat(60));
console.log('百香果信息平台爬虫测试 (参考Python版本)');
console.log('测试日期：2026.5.5');
console.log('='.repeat(60));

const dateStr = '2026.5.5';
const searchKeyword = `百香果信息平台：百香果价格行情(${dateStr})`;

async function randomDelay(min = 1000, max = 3000) {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  console.log(`⏳ 等待 ${delay}ms...`);
  await new Promise(resolve => setTimeout(resolve, delay));
}

async function parseArticle(html) {
  console.log('\n【解析文章】');
  const $ = cheerio.load(html);
  const data = [];
  
  // 1. 找正文区域
  let content = $('#img-content');
  if (!content.length) {
    content = $('body');
  }
  console.log(`找到正文区域，长度: ${content.length}`);
  
  // 2. 遍历所有 img 和 table 节点（参考Python版本）
  let currentProduct = null;
  const nodes = content.find('img, table');
  console.log(`找到 ${nodes.length} 个 img/table 节点`);
  
  for (let i = 0; i < nodes.length; i++) {
    const node = $(nodes[i]);
    
    if (node.is('img')) {
      // 处理图片
      console.log(`\n节点 ${i}: <img>`);
      
      // 尝试获取 data-src 或 src
      let imgUrl = node.attr('data-src') || node.attr('src');
      console.log(`  图片URL: ${imgUrl ? imgUrl.substring(0, 50) + '...' : 'null'}`);
      
      // 获取 alt 属性
      const alt = node.attr('alt');
      console.log(`  alt: ${alt}`);
      
      // 判断品种（暂时用alt判断，不用OCR先）
      if (alt && (alt.includes('图片2') || alt.includes('黄金百香果'))) {
        currentProduct = '黄金百香果';
        console.log('  ✅ 标记为黄金百香果');
      } else if (alt && (alt.includes('图片1') || alt.includes('百香桂蜜'))) {
        currentProduct = '百香桂蜜';
        console.log('  🚫 标记为其他品种');
      } else {
        currentProduct = null;
      }
      
    } else if (node.is('table')) {
      // 处理表格
      console.log(`\n节点 ${i}: <table>`);
      console.log(`  当前品种: ${currentProduct}`);
      
      if (currentProduct === '黄金百香果') {
        console.log('  ✅ 开始解析表格');
        
        const rows = node.find('tr');
        console.log(`  表格有 ${rows.length} 行`);
        
        // 先处理表头
        if (rows.length > 0) {
          const headerRow = $(rows[0]);
          const headerCells = headerRow.find('td, th');
          const headerTexts = headerCells.map((_, cell) => $(cell).text().trim()).get();
          console.log(`  表头: ${headerTexts}`);
          
          // 确认是我们要的表格
          if (headerTexts.includes('省') && headerTexts.includes('地区') && headerTexts.includes('市斤价')) {
            console.log('  ✅ 确认是价格表格');
            
            // 处理数据行 - 用市斤价列作为参考点
            let currentProvince = '';
            let currentRegion = '';
            let currentRemark = '';
            
            for (let r = 1; r < rows.length; r++) {
              const row = $(rows[r]);
              const cells = row.find('td, th');
              const cellTexts = cells.map((_, cell) => $(cell).text().trim()).get();
              
              console.log(`\n  行 ${r} 原始单元格:`, cellTexts);
              
              // 跳过空行
              if (cellTexts.every(t => !t.trim())) {
                console.log(`  ⏭️ 跳过空行`);
                continue;
              }
              
              // 查找价格列（市斤价）的位置 - 优先找纯数字
              let foundPriceIdx = -1;
              for (let c = 0; c < cellTexts.length; c++) {
                if (cellTexts[c] && cellTexts[c].match(/^\d+(\.\d+)?$/)) {
                  foundPriceIdx = c;
                  break;
                }
              }
              
              if (foundPriceIdx === -1) {
                console.log(`  ❌ 行 ${r} 未找到价格`);
                continue;
              }
              
              console.log(`  💰 价格在列 ${foundPriceIdx}: ${cellTexts[foundPriceIdx]}`);
              
              // 根据价格列的位置计算其他列
              // 假设顺序：省 | 地区 | 市斤价 | 价类 | 规格 | 备注
              let provinceText = '';
              let regionText = '';
              let priceTypeText = '产地价';
              let specText = '';
              let remarkText = '';
              
              // 省：在价格列左边第2位
              const possibleProvinceIdx = foundPriceIdx - 2;
              if (possibleProvinceIdx >= 0 && cellTexts[possibleProvinceIdx]?.trim()) {
                provinceText = cellTexts[possibleProvinceIdx].trim();
              } else if (currentProvince) {
                provinceText = currentProvince;
              }
              
              // 地区：在价格列左边第1位
              const possibleRegionIdx = foundPriceIdx - 1;
              if (possibleRegionIdx >= 0 && cellTexts[possibleRegionIdx]?.trim()) {
                regionText = cellTexts[possibleRegionIdx].trim();
              } else if (currentRegion) {
                regionText = currentRegion;
              }
              
              // 价类：在价格列右边第1位
              const possiblePriceTypeIdx = foundPriceIdx + 1;
              if (possiblePriceTypeIdx < cellTexts.length && cellTexts[possiblePriceTypeIdx]?.trim()) {
                priceTypeText = cellTexts[possiblePriceTypeIdx].trim();
              }
              
              // 规格：在价格列右边第2位
              const possibleSpecIdx = foundPriceIdx + 2;
              if (possibleSpecIdx < cellTexts.length) {
                specText = cellTexts[possibleSpecIdx] || '';
              }
              
              // 备注：在价格列右边第3位，或用当前备注
              const possibleRemarkIdx = foundPriceIdx + 3;
              if (possibleRemarkIdx < cellTexts.length && cellTexts[possibleRemarkIdx]?.trim()) {
                remarkText = cellTexts[possibleRemarkIdx].trim();
              } else if (currentRemark) {
                remarkText = currentRemark;
              }
              
              // 更新当前值（用于下一行）
              if (provinceText) currentProvince = provinceText;
              if (regionText) currentRegion = regionText;
              if (remarkText) currentRemark = remarkText;
              
              console.log(`  📍 省: ${provinceText} 地区: ${regionText} 价类: ${priceTypeText} 规格: ${specText} 备注: ${remarkText}`);
              
              const price = parseFloat(cellTexts[foundPriceIdx]);
              if (!isNaN(price) && price > 0) {
                const record = {
                  province: provinceText,
                  region: regionText,
                  price: price,
                  priceType: priceTypeText,
                  spec: specText,
                  remark: remarkText
                };
                data.push(record);
                console.log(`  ✅ 行 ${r} 保存:`, record);
              }
            }
          } else {
            console.log('  ❌ 不是目标表格，跳过');
          }
        }
      } else {
        console.log('  ❌ 不是黄金百香果的表格，跳过');
      }
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ 解析完成');
  console.log(`共获取 ${data.length} 条黄金百香果报价数据`);
  console.log('='.repeat(60));
  
  console.log('\n【最终数据】');
  console.log(JSON.stringify(data, null, 2));
  
  // 保存最终数据
  fs.writeFileSync(path.join(__dirname, 'result.json'), JSON.stringify(data, null, 2));
  console.log('\n💾 数据已保存到 result.json');
}

async function test() {
  const browser = await chromium.launch({
    headless: true,
    slowMo: 100,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu'
    ]
  });
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 }
  });
  
  const page = await context.newPage();
  
  try {
    // 1. 访问搜狗微信首页
    console.log('\n【1】正在打开搜狗微信首页...');
    await page.goto('https://weixin.sogou.com/', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    await randomDelay(2000, 3000);
    await page.screenshot({ path: path.join(__dirname, 'step1-home.png') });
    
    // 2. 输入关键词
    console.log('\n【2】正在输入搜索关键词...');
    await page.fill('input[name="query"]', searchKeyword);
    await randomDelay(500, 1500);
    await page.screenshot({ path: path.join(__dirname, 'step2-input.png') });
    
    // 3. 点击"搜文章"按钮
    console.log('\n【3】正在点击搜文章...');
    await page.click('input[type="submit"][value="搜文章"]');
    await randomDelay(3000, 5000);
    await page.screenshot({ path: path.join(__dirname, 'step3-search.png') });
    
    // 等待搜索结果加载
    try {
      await page.waitForSelector('.news-list', { timeout: 15000 });
    } catch (e) {
      console.log('⚠️ 未找到 .news-list，检查是否需要验证码...');
    }
    await randomDelay(1000, 2000);
    
    // 保存当前页面
    const searchHtml = await page.content();
    fs.writeFileSync(path.join(__dirname, 'search-page.html'), searchHtml);
    
    // 4. 查找匹配的搜索结果
    console.log('\n【4】正在查找匹配的文章...');
    const results = await page.$$('.news-list li');
    console.log(`找到 ${results.length} 个搜索结果`);
    
    let targetResult = null;
    
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      
      const fullTitle = await result.$eval('h3 a', el => el.textContent?.trim() || '').catch(() => '');
      const sourceSpan = await result.$eval('.s-p span', el => el.textContent?.trim() || '').catch(() => '');
      
      console.log(`\n结果 ${i + 1}:`);
      console.log(`  标题: ${fullTitle}`);
      console.log(`  来源: ${sourceSpan}`);
      
      if (fullTitle.includes(dateStr) && sourceSpan.includes('百香果信息平台')) {
        console.log('✅ 找到匹配的文章！');
        targetResult = result;
        break;
      }
    }
    
    if (!targetResult) {
      console.log('\n❌ 未找到匹配的文章');
      return;
    }
    
    // 5. 获取文章链接并直接访问
    console.log('\n【5】正在获取文章链接...');
    const articleUrl = await targetResult.$eval('h3 a', el => el.getAttribute('href'));
    console.log('文章原始链接:', articleUrl);
    
    // 构建完整URL
    let fullUrl = articleUrl;
    if (!articleUrl.startsWith('http')) {
      if (articleUrl.startsWith('//')) {
        fullUrl = 'https:' + articleUrl;
      } else if (articleUrl.startsWith('/')) {
        fullUrl = 'https://weixin.sogou.com' + articleUrl;
      }
    }
    
    console.log('尝试直接访问:', fullUrl);
    
    await page.goto(fullUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await randomDelay(3000, 5000);
    
    // 检查当前URL
    let currentUrl = page.url();
    console.log(`当前URL: ${currentUrl}`);
    
    // 如果还在搜狗页面，尝试等待更长时间或刷新
    if (currentUrl.includes('weixin.sogou.com') && !currentUrl.includes('mp.weixin.qq.com')) {
      console.log('⚠️ 还在搜狗页面，等待重定向...');
      await randomDelay(3000, 5000);
      currentUrl = page.url();
      console.log(`重定向后的URL: ${currentUrl}`);
    }
    
    // 如果还没到微信，尝试查找跳转链接
    if (!currentUrl.includes('mp.weixin.qq.com')) {
      console.log('🔍 查找页面中的跳转链接...');
      const pageContent = await page.content();
      fs.writeFileSync(path.join(__dirname, 'debug-intermediate.html'), pageContent);
      
      const redirectLink = await page.$('a[href*="mp.weixin.qq.com"]');
      if (redirectLink) {
        console.log('✅ 找到跳转链接，点击...');
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }),
          redirectLink.click()
        ]);
        await randomDelay(2000, 4000);
      }
    }
    
    currentUrl = page.url();
    console.log(`最终URL: ${currentUrl}`);
    
    // 保存最终页面
    const articleHtml = await page.content();
    fs.writeFileSync(path.join(__dirname, 'article-final.html'), articleHtml);
    await page.screenshot({ path: path.join(__dirname, 'step5-article.png'), fullPage: true });
    console.log('💾 文章页面已保存');
    
    // 6. 解析文章
    await parseArticle(articleHtml);
    
  } catch (err) {
    console.error('\n❌ 测试失败:', err.message);
    console.error(err.stack);
    await page.screenshot({ path: path.join(__dirname, 'error.png') });
  } finally {
    await browser.close();
  }
}

test();
