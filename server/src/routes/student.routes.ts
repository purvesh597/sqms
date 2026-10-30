import { Router } from 'express';
import * as c from '../controllers/student.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/async-handler';
import { idParam } from '../validators/common';
import { generateTokenSchema } from '../validators/queue.validators';

export const studentRoutes = Router()
  .use(authenticate, authorize('STUDENT'))
  .post('/tokens', validate(generateTokenSchema), asyncHandler(c.generate))
  .get('/tokens/active', asyncHandler(c.active))
  .get('/tokens/history', asyncHandler(c.history))
  .get('/tokens/:id', validate(idParam, 'params'), asyncHandler(c.getOne))
  .post('/tokens/:id/cancel', validate(idParam, 'params'), asyncHandler(c.cancel));
