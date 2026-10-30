import { Router } from 'express';
import * as c from '../controllers/common.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/async-handler';
import { idParam } from '../validators/common';
import { menuQuerySchema } from '../validators/admin.validators';
import { queueQuerySchema } from '../validators/queue.validators';

export const commonRoutes = Router()
  .use(authenticate)
  .get('/meta', asyncHandler(c.meta))
  .get('/menu', validate(menuQuerySchema, 'query'), asyncHandler(c.menu))
  .get('/queue/status', validate(queueQuerySchema, 'query'), asyncHandler(c.queueStatus))
  .get('/notifications', asyncHandler(c.listNotifications))
  .post('/notifications/read-all', asyncHandler(c.readAllNotifications))
  .patch('/notifications/:id/read', validate(idParam, 'params'), asyncHandler(c.readNotification))
  .get('/events', c.stream);
