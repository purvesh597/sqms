import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as c from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/async-handler';
import { changePasswordSchema, loginSchema, updateProfileSchema } from '../validators/auth.validators';

const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { message: 'Too many sign-in attempts. Please wait a few minutes and try again.', code: 'RATE_LIMITED' } },
});

export const authRoutes = Router()
  .post('/login', loginLimiter, validate(loginSchema), asyncHandler(c.login))
  .post('/logout', c.logout)
  .get('/me', authenticate, asyncHandler(c.me))
  .patch('/profile', authenticate, validate(updateProfileSchema), asyncHandler(c.updateProfile))
  .post('/change-password', authenticate, validate(changePasswordSchema), asyncHandler(c.changePassword));
