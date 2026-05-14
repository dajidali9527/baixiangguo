import { Router } from 'express';
import { getHistoryData } from '../controllers/historyController.js';

export const historyRouter = Router();

historyRouter.get('/', getHistoryData);
