import { Router } from 'express';
import * as c from '../controllers/staff.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/async-handler';
import { idParam } from '../validators/common';
import { activityQuerySchema, callNextSchema, queueQuerySchema } from '../validators/queue.validators';

export const staffRoutes = Router()
  .use(authenticate, authorize('STAFF'))
  .get('/queue', validate(queueQuerySchema, 'query'), asyncHandler(c.snapshot))
  .post('/queue/call-next', validate(callNextSchema), asyncHandler(c.callNext))
  .post('/tokens/:id/recall', validate(idParam, 'params'), asyncHandler(c.recall))
  .post('/tokens/:id/serve', validate(idParam, 'params'), asyncHandler(c.serve))
  .post('/tokens/:id/skip', validate(idParam, 'params'), asyncHandler(c.skip))
  .post('/counters/:id/pause', validate(idParam, 'params'), asyncHandler(c.pause))
  .post('/counters/:id/resume', validate(idParam, 'params'), asyncHandler(c.resume))
  .get('/activity', validate(activityQuerySchema, 'query'), asyncHandler(c.activity));
