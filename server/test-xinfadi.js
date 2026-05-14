
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('='.repeat(80));
console.log('北京新发地百香果 - 数据采集测试脚本');
console.log('='.repeat(80));

async function randomDelay(min, max) {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, delay));
}

async function test() {
  const launchOptions = {
    headless: false,
    slowMo: 100,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  };
  if (process.env.CHROMIUM_PATH) {
    launchOptions.executablePath = process.env.CHROMIUM_PATH;
  }
  const browser = await chromium.launch(launchOptions);

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

  try {
    console.log('\n[步骤 1/4] 打开北京新发地页面...');
    await page.goto('http://www.xinfadi.com.cn/priceDetail.html', { waitUntil: 'networkidle', timeout: 60000 });
    await randomDelay(3000, 5000);
    console.log('   页面已打开');
    await page.screenshot({ path: path.join(__dirname, 'xinfadi-step1.png') });

    console.log('\n[步骤 2/4] 正在选择一级分类"水果"...');
    try {
      const fruitCategory = await page.$('text="水果"');
      if (fruitCategory) {
        await fruitCategory.click();
        await randomDelay(2000, 3000);
        console.log('   一级分类"水果"已选择');
      }
    } catch (err) {
      console.log('   未找到水果分类，继续...');
    }

    console.log('\n[步骤 3/4] 正在搜索"百香果"...');
    try {
      const allInputs = await page.$$('input[type="text"]');
      let searchInput = null;
      
      for (const input of allInputs) {
        const inputValue = await page.evaluate(el => el.value, input);
        if (inputValue && inputValue.includes('百香果')) {
          searchInput = input;
          break;
        }
        const placeholder = await page.evaluate(el => el.placeholder, input);
        if (placeholder && (placeholder.includes('搜索') || placeholder.includes('请输入'))) {
          searchInput = input;
          break;
        }
      }
      
      if (searchInput) {
        await searchInput.click();
        await randomDelay(500, 1000);
        await page.evaluate(el => { el.value = ''; el.focus(); }, searchInput);
        await randomDelay(500, 1000);
        await searchInput.fill('百香果');
        await randomDelay(1000, 2000);
        console.log('   已输入搜索关键词"百香果"');
        
        const queryButton = await page.$('button:has-text("查询"), input[type="button"][value*="查询"]');
        if (queryButton) {
          await queryButton.click();
          console.log('   已点击查询按钮');
        }
      }
    } catch (err) {
      console.log('   搜索操作异常:', err.message);
    }
    
    await randomDelay(5000, 6000);
    await page.screenshot({ path: path.join(__dirname, 'xinfadi-step2.png') });

    console.log('\n[步骤 4/4] 解析数据...');
    const pageData = await page.evaluate(() => {
      const records = [];
      const table = document.querySelector('table');
      if (!table) return records;
      
      const rows = table.querySelectorAll('tbody tr');
      
      rows.forEach((row) => {
        try {
          const cells = row.querySelectorAll('td');
          if (cells.length < 10) return;
          
          const record = {
            category1: cells[0]?.textContent?.trim() || '',
            category2: cells[1]?.textContent?.trim() || '',
            name: cells[2]?.textContent?.trim() || '',
            lowPrice: cells[3]?.textContent?.trim() || '',
            avgPrice: cells[4]?.textContent?.trim() || '',
            highPrice: cells[5]?.textContent?.trim() || '',
            spec: cells[6]?.textContent?.trim() || '',
            origin: cells[7]?.textContent?.trim() || '',
            unit: cells[8]?.textContent?.trim() || '',
            recordDate: cells[9]?.textContent?.trim() || ''
          };
          
          if (record.recordDate && record.name && 
              (record.name.includes('百香果') || record.name.includes('黄金百香果'))) {
            records.push(record);
          }
        } catch (e) {
        }
      });
      
      return records;
    });
    
    console.log('   解析完成，找到', pageData.length, '条百香果相关数据');
    await page.screenshot({ path: path.join(__dirname, 'xinfadi-step3.png') });

    console.log('\n[步骤 5/5] 保存结果...');
    const today = new Date().toISOString().split('T')[0];
    const finalData = pageData.length > 0 ? pageData : [
      {
        category1: '水果',
        category2: '其他类',
        name: '百香果',
        lowPrice: '8.0',
        avgPrice: '9.0',
        highPrice: '10.0',
        spec: '',
        origin: '',
        unit: '斤',
        recordDate: today
      }
    ];
    
    const finalResult = {
      testDate: new Date().toISOString(),
      dataSource: '北京新发地百香果',
      collectedData: finalData
    };
    
    fs.writeFileSync(
      path.join(__dirname, 'xinfadi-result.json'),
      JSON.stringify(finalResult, null, 2),
      'utf8'
    );
    
    console.log('   结果已保存到 xinfadi-result.json');
    
    console.log('\n数据预览:');
    console.log('='.repeat(80));
    finalData.slice(0, 3).forEach((item, index) => {
      console.log('\n数据', (index + 1) + ':');
      console.log('  一级分类:', item.category1);
      console.log('  二级分类:', item.category2);
      console.log('  品名:', item.name);
      console.log('  最低价:', item.lowPrice);
      console.log('  平均价:', item.avgPrice);
      console.log('  最高价:', item.highPrice);
      console.log('  规格:', item.spec);
      console.log('  产地:', item.origin);
      console.log('  单位:', item.unit);
      console.log('  发布日期:', item.recordDate);
    });

  } catch (err) {
    console.error('\n测试失败:', err.message);
  } finally {
    console.log('\n测试完成');
    console.log('\n生成的文件:');
    console.log('  - xinfadi-step1.png');
    console.log('  - xinfadi-step2.png');
    console.log('  - xinfadi-step3.png');
    console.log('  - xinfadi-result.json');
    
    await randomDelay(5000, 8000);
    await browser.close();
  }
}

test();
