import type { Request, Response } from 'express';
import * as queue from '../services/queue.service';

export async function generate(req: Request, res: Response) {
  const token = await queue.generateToken(req.user!.id, req.body.counterId, req.body.mealId);
  res.status(201).json({ token });
}

export async function active(req: Request, res: Response) {
  res.json({ tokens: await queue.getActiveTokens(req.user!.id) });
}

export async function getOne(req: Request, res: Response) {
  res.json({ token: await queue.getTokenForStudent(req.user!.id, req.params.id) });
}

export async function history(req: Request, res: Response) {
  res.json({ tokens: await queue.getTokenHistory(req.user!.id, Math.min(100, Number(req.query.limit) || 30)) });
}

export async function cancel(req: Request, res: Response) {
  res.json({ token: await queue.cancelToken(req.user!.id, req.params.id) });
}
