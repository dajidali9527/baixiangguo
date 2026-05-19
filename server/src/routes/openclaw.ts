import { Router } from 'express';
import { getWeixinStatus, loginWeixin, unbindWeixin } from '../controllers/openclawController.js';

export const openclawRouter = Router();

openclawRouter.get('/weixin/status', getWeixinStatus);
openclawRouter.get('/weixin/login', loginWeixin);
openclawRouter.post('/weixin/unbind', unbindWeixin);