import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';
import { badRequest } from '../utils/http-error';

type Source = 'body' | 'query' | 'params';

/** Validates and replaces req[source] with the parsed (typed, trimmed) value. */
export const validate =
  (schema: ZodSchema, source: Source = 'body') =>
  (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const issues = result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
      return next(badRequest(issues[0]?.message ?? 'Invalid input', issues));
    }
    (req as unknown as Record<Source, unknown>)[source] = result.data;
    next();
  };
