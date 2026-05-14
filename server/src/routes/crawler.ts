import express from 'express';
import { manualCrawl } from '../controllers/crawlerController.js';

const router = express.Router();

router.post('/manual', manualCrawl);

export { router as crawlerRouter };
