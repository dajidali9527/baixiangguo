import { Router } from 'express';
import { getDashboardData, getHuinongTrendChart, getXinfadiTrendChart, getJiangnanTrendChart } from '../controllers/dashboardController.js';

export const dashboardRouter = Router();

dashboardRouter.get('/', getDashboardData);
dashboardRouter.get('/huinong-trend', getHuinongTrendChart);
dashboardRouter.get('/xinfadi-trend', getXinfadiTrendChart);
dashboardRouter.get('/jiangnan-trend', getJiangnanTrendChart);
