import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HUINONG_URL = 'https://www.cnhnb.com/hangqing/cdlist-2001332-12167-0-0-0-1/';

console.log('='.repeat(80));
console.log('惠农网黄金百香果 - axios 直接请求测试');
console.log('='.repeat(80));

async function testRequest() {
  try {
    console.log('\n[1] 正在请求 URL:', HUINONG_URL);
    
    const res = await axios.get(HUINONG_URL, {
      headers: {
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
      },
      timeout: 60000
    });

    console.log('\n[2] 响应状态码:', res.status);
    console.log('[3] 响应头 Content-Type:', res.headers['content-type']);

    const htmlFile = path.join(__dirname, 'huinong-axios-response.html');
    fs.writeFileSync(htmlFile, res.data, 'utf8');
    console.log('[4] HTML 响应已保存到:', htmlFile);

    console.log('\n[5] HTML 前 5000 字符预览:');
    console.log(res.data.slice(0, 5000));

    console.log('\n' + '='.repeat(80));
    console.log('✅ 测试完成！');
    console.log('='.repeat(80));

    console.log('\n接下来你可以：');
    console.log('1. 检查 huinong-axios-response.html 看看有没有数据');
    console.log('2. 如果有数据，我们可以用 cheerio 来解析它');

  } catch (err) {
    console.error('\n❌ 请求失败:', err.message);
    if (err.response) {
      console.error('响应状态码:', err.response.status);
      console.error('响应内容:', err.response.data.slice(0, 5000));
    }
    console.error(err.stack);
  }
}

testRequest();
