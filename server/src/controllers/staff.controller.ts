import type { Request, Response } from 'express';
import * as queue from '../services/queue.service';
import { todayStr } from '../utils/date';

export async function snapshot(req: Request, res: Response) {
  const { counterId, mealId } = req.query as { counterId: string; mealId: string };
  res.json(await queue.getQueueSnapshot({ counterId, mealId, date: todayStr() }));
}

export async function callNext(req: Request, res: Response) {
  res.json(await queue.callNext(req.user!.id, req.body.counterId, req.body.mealId));
}

export async function recall(req: Request, res: Response) {
  res.json(await queue.recallToken(req.user!.id, req.params.id));
}

export async function serve(req: Request, res: Response) {
  res.json(await queue.serveToken(req.user!.id, req.params.id));
}

export async function skip(req: Request, res: Response) {
  res.json(await queue.skipToken(req.user!.id, req.params.id));
}

export async function pause(req: Request, res: Response) {
  res.json({ counter: await queue.setPaused(req.user!.id, req.params.id, true) });
}

export async function resume(req: Request, res: Response) {
  res.json({ counter: await queue.setPaused(req.user!.id, req.params.id, false) });
}

export async function activity(req: Request, res: Response) {
  const { counterId, limit } = req.query as unknown as { counterId?: string; limit: number };
  res.json({ events: await queue.getActivity(counterId, limit) });
}
