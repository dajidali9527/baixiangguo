import schedule from 'node-schedule';
import { crawlBxx, crawlHuinong, crawlXinfadi, logCrawl } from './crawlerService.js';

let isRunning = false;

export async function runInitialCrawl() {
  if (isRunning) {
    console.log('Crawl is already running, skipping initial crawl');
    return;
  }
  
  isRunning = true;
  try {
    console.log('Running initial crawl on system startup...');
    await logCrawl(null, 'info', '系统启动后，开始执行初始数据抓取');
    await crawlBxx(1, '系统启动后');
    await logCrawl(null, 'info', '系统启动后，开始执行惠农网数据抓取');
    await crawlHuinong(2, '系统启动后');
    await logCrawl(null, 'info', '系统启动后，开始执行北京新发地数据抓取');
    await crawlXinfadi(3, '系统启动后');
  } catch (err) {
    console.error('Initial crawl failed:', err);
  } finally {
    isRunning = false;
  }
}

export function startScheduler() {
  console.log('Starting scheduler...');
  
  schedule.scheduleJob('0 22 * * 2,4,6', async () => {
    if (isRunning) {
      console.log('Crawl is already running, skipping scheduled crawl');
      return;
    }
    
    isRunning = true;
    try {
      console.log('Running scheduled crawl at 22:00 (bxx)...');
      await logCrawl(null, 'info', '定时任务触发（每周二、四、六 22:00），开始执行百香果信息平台数据抓取');
      await crawlBxx(1, '每周二、四、六晚上22:00');
    } catch (err) {
      console.error('Scheduled bxx crawl failed:', err);
    } finally {
      isRunning = false;
    }
  });
  
  schedule.scheduleJob('0 22 * * *', async () => {
    if (isRunning) {
      console.log('Crawl is already running, skipping scheduled huinong crawl');
      return;
    }
    
    isRunning = true;
    try {
      console.log('Running scheduled huinong crawl at 22:00...');
      await logCrawl(null, 'info', '定时任务触发（每日 22:00），开始执行惠农网黄金百香果数据抓取');
      await crawlHuinong(2, '每日晚上22:00');
    } catch (err) {
      console.error('Scheduled huinong crawl failed:', err);
    } finally {
      isRunning = false;
    }
  });
  
  schedule.scheduleJob('0 22 * * *', async () => {
    if (isRunning) {
      console.log('Crawl is already running, skipping scheduled xinfadi crawl');
      return;
    }
    
    isRunning = true;
    try {
      console.log('Running scheduled xinfadi crawl at 22:00...');
      await logCrawl(null, 'info', '定时任务触发（每日 22:00），开始执行北京新发地百香果数据抓取');
      await crawlXinfadi(3, '每日晚上22:00');
    } catch (err) {
      console.error('Scheduled xinfadi crawl failed:', err);
    } finally {
      isRunning = false;
    }
  });
  
  console.log('Scheduler started: bxx every Tue/Thu/Sat 22:00, huinong daily 22:00, xinfadi daily 22:00');
}

export function stopScheduler() {
  console.log('Stopping scheduler...');
  schedule.gracefulShutdown();
}