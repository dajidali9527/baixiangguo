import schedule from 'node-schedule';
import { crawlBxx, crawlHuinong, crawlXinfadi, crawlJiangnan, logCrawl } from './crawlerService.js';

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
    await crawlXinfadi(3, '系统启动后');
    await crawlJiangnan(4, '系统启动后');
  } catch (err) {
    console.error('Initial crawl failed:', err);
  } finally {
    isRunning = false;
  }
}

export function startScheduler() {
  console.log('Starting scheduler...');
  
  // 百香果信息平台：每周二、周四、周六 22:00
  schedule.scheduleJob('0 22 * * 2,4,6', async () => {
    if (isRunning) {
      console.log('Crawl is already running, skipping scheduled crawl');
      return;
    }
    
    isRunning = true;
    try {
      console.log('Running scheduled crawl for BXX at 22:00...');
      await logCrawl(null, 'info', '定时任务触发（每周二、周四、周六 22:00），开始执行百香果信息平台数据抓取');
      await crawlBxx(1, '每周二、周四、周六 22:00');
    } catch (err) {
      console.error('Scheduled crawl failed:', err);
    } finally {
      isRunning = false;
    }
  });
  
  // 惠农网黄金百香果：每天 22:00
  schedule.scheduleJob('0 22 * * *', async () => {
    if (isRunning) {
      console.log('Crawl is already running, skipping scheduled crawl');
      return;
    }

    isRunning = true;
    try {
      console.log('Running scheduled crawl for Huinong at 22:00...');
      await logCrawl(null, 'info', '定时任务触发（每日 22:00），开始执行惠农网黄金百香果数据抓取');
      await crawlHuinong(2, '每日 22:00');
    } catch (err) {
      console.error('Scheduled crawl failed:', err);
    } finally {
      isRunning = false;
    }
  });

  // 北京新发地：每天 22:00
  schedule.scheduleJob('0 22 * * *', async () => {
    if (isRunning) {
      console.log('Crawl is already running, skipping scheduled crawl');
      return;
    }
    
    isRunning = true;
    try {
      console.log('Running scheduled crawl for Xinfadi at 22:00...');
      await logCrawl(null, 'info', '定时任务触发（每日 22:00），开始执行北京新发地数据抓取');
      await crawlXinfadi(3, '每日 22:00');
    } catch (err) {
      console.error('Scheduled crawl failed:', err);
    } finally {
      isRunning = false;
    }
  });

  // 广州江南：每天 22:00
  schedule.scheduleJob('0 22 * * *', async () => {
    if (isRunning) {
      console.log('Crawl is already running, skipping scheduled crawl');
      return;
    }
    
    isRunning = true;
    try {
      console.log('Running scheduled crawl for Jiangnan at 22:00...');
      await logCrawl(null, 'info', '定时任务触发（每日 22:00），开始执行广州江南数据抓取');
      await crawlJiangnan(4, '每日 22:00');
    } catch (err) {
      console.error('Scheduled crawl failed:', err);
    } finally {
      isRunning = false;
    }
  });
  
  console.log('Scheduler started: will run BXX every Tue/Thu/Sat 22:00, Xinfadi every day 22:00, and Jiangnan every day 22:00');
}

export function stopScheduler() {
  console.log('Stopping scheduler...');
  schedule.gracefulShutdown();
}
