import { Router } from 'express';
import * as c from '../controllers/admin.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/async-handler';
import { idParam } from '../validators/common';
import * as v from '../validators/admin.validators';

export const adminRoutes = Router()
  .use(authenticate, authorize('ADMIN'))
  .get('/overview', asyncHandler(c.overview))

  .get('/counters', asyncHandler(c.listCounters))
  .post('/counters', validate(v.counterCreateSchema), asyncHandler(c.createCounter))
  .patch('/counters/:id', validate(idParam, 'params'), validate(v.counterUpdateSchema), asyncHandler(c.updateCounter))

  .get('/meals', asyncHandler(c.listMeals))
  .patch('/meals/:id', validate(idParam, 'params'), validate(v.mealUpdateSchema), asyncHandler(c.updateMeal))
  .get('/settings', asyncHandler(c.getSettings))
  .patch('/settings', validate(v.settingsUpdateSchema), asyncHandler(c.updateSettings))

  .get('/menu', validate(v.menuQuerySchema, 'query'), asyncHandler(c.listMenu))
  .post('/menu', validate(v.menuCreateSchema), asyncHandler(c.createMenuItem))
  .post('/menu/copy', validate(v.menuCopySchema), asyncHandler(c.copyMenu))
  .patch('/menu/:id', validate(idParam, 'params'), validate(v.menuUpdateSchema), asyncHandler(c.updateMenuItem))
  .delete('/menu/:id', validate(idParam, 'params'), asyncHandler(c.deleteMenuItem))

  .get('/staff', validate(v.listQuerySchema, 'query'), asyncHandler(c.listStaff))
  .post('/staff', validate(v.staffCreateSchema), asyncHandler(c.createStaff))
  .patch('/staff/:id', validate(idParam, 'params'), validate(v.staffUpdateSchema), asyncHandler(c.updateStaff))

  .get('/students', validate(v.listQuerySchema, 'query'), asyncHandler(c.listStudents))

  .get('/reports', validate(v.reportQuerySchema, 'query'), asyncHandler(c.report))
  .get('/reports/export', validate(v.reportQuerySchema, 'query'), asyncHandler(c.exportReport));
