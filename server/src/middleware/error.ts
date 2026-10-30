import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { HttpError } from '../utils/http-error';

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: { message: `Route not found: ${req.method} ${req.path}`, code: 'NOT_FOUND' } });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: { message: err.message, code: err.code, details: err.details } });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: { message: 'A record with these details already exists.', code: 'CONFLICT' } });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ error: { message: 'Record not found.', code: 'NOT_FOUND' } });
    }
  }
  if (err instanceof SyntaxError && 'body' in (err as object)) {
    return res.status(400).json({ error: { message: 'Malformed JSON body.', code: 'BAD_REQUEST' } });
  }
  console.error('[error]', err);
  res.status(500).json({ error: { message: 'Something went wrong on our side. Please try again.', code: 'INTERNAL' } });
}
