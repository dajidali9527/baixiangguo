import { Router } from 'express';
import { authRouter } from '../controllers/authController.js';

export const authRoute = Router();
authRoute.use('/', authRouter);
