import { Router } from 'express';
import { adminRoutes } from './admin.routes';
import { authRoutes } from './auth.routes';
import { commonRoutes } from './common.routes';
import { staffRoutes } from './staff.routes';
import { studentRoutes } from './student.routes';

export const apiRouter = Router()
  .get('/health', (_req, res) => res.json({ status: 'ok', time: new Date() }))
  .use('/auth', authRoutes)
  .use('/student', studentRoutes)
  .use('/staff', staffRoutes)
  .use('/admin', adminRoutes)
  .use('/', commonRoutes);
