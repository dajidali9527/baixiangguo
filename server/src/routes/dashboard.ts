import { Router } from 'express';
import { getDashboardData, getHuinongTrendChart, getXinfadiTrendChart } from '../controllers/dashboardController.js';

export const dashboardRouter = Router();

dashboardRouter.get('/', getDashboardData);
dashboardRouter.get('/huinong-trend', getHuinongTrendChart);
dashboardRouter.get('/xinfadi-trend', getXinfadiTrendChart);
