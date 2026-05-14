import { Router } from 'express';
import { getDataSources, updateDataSource, getTaskStatus, getExecutionLogs } from '../controllers/configController.js';

export const configRouter = Router();

configRouter.get('/sources', getDataSources);
configRouter.put('/sources/:id', updateDataSource);
configRouter.get('/tasks', getTaskStatus);
configRouter.get('/logs', getExecutionLogs);
