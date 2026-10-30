import type { Request, Response } from 'express';
import { env } from '../config/env';
import { AUTH_COOKIE, signSession } from '../middleware/auth';
import type { Role } from '../config/constants';
import * as auth from '../services/auth.service';

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: env.isProduction,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
};

export async function login(req: Request, res: Response) {
  const user = await auth.login(req.body.email, req.body.password);
  res.cookie(AUTH_COOKIE, signSession(user.id, user.role as Role), cookieOptions);
  res.json({ user });
}

export function logout(_req: Request, res: Response) {
  res.clearCookie(AUTH_COOKIE, { ...cookieOptions, maxAge: undefined });
  res.json({ ok: true });
}

export async function me(req: Request, res: Response) {
  res.json({ user: await auth.getProfile(req.user!.id) });
}

export async function changePassword(req: Request, res: Response) {
  await auth.changePassword(req.user!.id, req.body.currentPassword, req.body.newPassword);
  res.json({ ok: true });
}

export async function updateProfile(req: Request, res: Response) {
  res.json({ user: await auth.updateProfile(req.user!.id, req.body) });
}
