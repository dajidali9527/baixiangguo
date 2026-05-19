import express from 'express';
import cors from 'cors';
import { initDatabase } from './config/init-db.js';
import { dashboardRouter } from './routes/dashboard.js';
import { historyRouter } from './routes/history.js';
import { configRouter } from './routes/config.js';
import { crawlerRouter } from './routes/crawler.js';
import { openclawRouter } from './routes/openclaw.js';
import { initTables } from './config/init-db.js';
import { runInitialCrawl, startScheduler } from './services/schedulerService.js';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

app.use(cors());
app.use(express.json());

app.use('/api/dashboard', dashboardRouter);
app.use('/api/history', historyRouter);
app.use('/api/config', configRouter);
app.use('/api/crawler', crawlerRouter);
app.use('/api/openclaw', openclawRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function start() {
  let retries = 10;
  while (retries > 0) {
    try {
      await initDatabase();
      await initTables();
      console.log('Database connected and initialized successfully');
      break;
    } catch (err) {
      retries--;
      console.error(`Database connection failed, retries left: ${retries}`, (err as Error).message);
      if (retries === 0) {
        console.error('Could not connect to database, exiting');
        process.exit(1);
      }
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  startScheduler();
  setTimeout(() => {
    runInitialCrawl();
  }, 5000);

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start();
