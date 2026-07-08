import schedule from 'node-schedule';
import { crawlXinfadi, crawlJiangnan, logCrawl } from './crawlerService.js';
import pool from '../config/database.js';

let isRunning = false;

async function isSourceEnabled(sourceId: number): Promise<boolean> {
  const result = await pool.query('SELECT enabled FROM pf_data_sources WHERE id = $1', [sourceId]);
  return result.rows[0]?.enabled === true || result.rows[0]?.enabled === 1;
}

export async function runInitialCrawl() {
  // 已禁用：启动时不再自动抓取，只保留手动触发和定时周期抓取
  console.log('Initial auto-crawl is disabled. Use manual trigger or scheduled jobs.');
  await logCrawl(null, 'info', '系统启动完成，自动抓取已禁用');
}

export function startScheduler() {
  console.log('Starting scheduler...');
  
  // 北京新发地：每天 22:00
  schedule.scheduleJob('0 22 * * *', async () => {
    if (isRunning) {
      console.log('Crawl is already running, skipping scheduled crawl');
      return;
    }
    
    if (!await isSourceEnabled(3)) {
      console.log('Xinfadi source is disabled, skipping scheduled crawl');
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
    
    if (!await isSourceEnabled(4)) {
      console.log('Jiangnan source is disabled, skipping scheduled crawl');
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
  
  console.log('Scheduler started: will run Xinfadi and Jiangnan every day 22:00 if enabled');
}

export function stopScheduler() {
  console.log('Stopping scheduler...');
  schedule.gracefulShutdown();
}
