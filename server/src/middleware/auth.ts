import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import type { Role } from '../config/constants';
import { prisma } from '../prisma/client';
import { forbidden, unauthorized } from '../utils/http-error';

export const AUTH_COOKIE = 'sqms_session';

export interface AuthUser {
  id: string;
  role: Role;
  name: string;
  email: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

interface JwtPayload {
  sub: string;
  role: Role;
}

export function signSession(userId: string, role: Role): string {
  return jwt.sign({ sub: userId, role } satisfies JwtPayload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

function readToken(req: Request): string | undefined {
  const cookie = req.cookies?.[AUTH_COOKIE];
  if (cookie) return cookie;
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return undefined;
}

/** Verifies the session and loads the user, rejecting deactivated accounts. */
export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = readToken(req);
    if (!token) throw unauthorized();
    let payload: JwtPayload;
    try {
      payload = jwt.verify(token, env.jwtSecret) as unknown as JwtPayload;
    } catch {
      throw unauthorized('Your session has expired. Please sign in again.');
    }
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true, name: true, email: true, isActive: true },
    });
    if (!user || !user.isActive) throw unauthorized('Your account is not active.');
    req.user = { id: user.id, role: user.role as Role, name: user.name, email: user.email };
    next();
  } catch (err) {
    next(err);
  }
}

export const authorize =
  (...roles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) return next(forbidden());
    next();
  };
