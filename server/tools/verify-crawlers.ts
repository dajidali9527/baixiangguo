import { crawlBxx, crawlHuinong, crawlXinfadi, crawlJiangnan, closeBrowser, logCrawl } from '../src/services/crawlerService.js';

async function main() {
  console.log('=== 爬虫模块完整性测试 ===\n');

  const tests = [
    { name: 'crawlBxx (百香果信息平台)', fn: crawlBxx },
    { name: 'crawlHuinong (惠农网黄金百香果)', fn: crawlHuinong },
    { name: 'crawlXinfadi (北京新发地百香果)', fn: crawlXinfadi },
    { name: 'crawlJiangnan (广州江南百香果)', fn: crawlJiangnan },
    { name: 'closeBrowser', fn: closeBrowser },
    { name: 'logCrawl', fn: logCrawl },
  ];

  let allPassed = true;
  for (const test of tests) {
    if (typeof test.fn === 'function') {
      console.log(`  ✅ ${test.name}`);
    } else {
      console.log(`  ❌ ${test.name} - 不是函数`);
      allPassed = false;
    }
  }

  console.log(`\n结果: ${allPassed ? '全部通过 ✅' : '存在失败 ❌'}`);
  process.exit(allPassed ? 0 : 1);
}

main().catch(err => {
  console.error('测试异常:', err);
  process.exit(1);
});