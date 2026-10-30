import type { Request, Response } from 'express';
import { prisma } from '../prisma/client';
import { events } from '../services/events.service';
import { getMealsWithState } from '../services/meal.service';
import * as notifications from '../services/notification.service';
import { getQueueStatus } from '../services/queue.service';
import { listMenu } from '../services/admin.service';
import { todayStr } from '../utils/date';
import { notFound } from '../utils/http-error';

/** Configuration shared by every dashboard: meals with live state, counters, and service settings. */
export async function meta(_req: Request, res: Response) {
  const { service, current, meals } = await getMealsWithState();
  const counters = await prisma.counter.findMany({ orderBy: { code: 'asc' } });
  res.json({
    today: todayStr(),
    serverTime: new Date(),
    service: {
      name: service.name,
      location: service.location,
      enforceMealTimings: service.enforceMealTimings,
      approachThreshold: service.approachThreshold,
      defaultServiceSecs: service.defaultServiceSecs,
    },
    currentMeal: current.meal ? { id: current.meal.id, state: current.state } : null,
    meals,
    counters,
  });
}

export async function menu(req: Request, res: Response) {
  const date = (req.query.date as string) || todayStr();
  const meals = await prisma.meal.findMany({ orderBy: { sortOrder: 'asc' } });
  const items = await listMenu(date);
  res.json({
    date,
    meals: meals.map((m) => ({ ...m, items: items.filter((i) => i.mealId === m.id) })),
  });
}

export async function queueStatus(req: Request, res: Response) {
  const { counterId, mealId } = req.query as { counterId: string; mealId: string };
  const exists = await prisma.counter.count({ where: { id: counterId } });
  if (!exists) throw notFound('Counter not found');
  res.json(await getQueueStatus({ counterId, mealId, date: todayStr() }));
}

export async function listNotifications(req: Request, res: Response) {
  const unreadOnly = req.query.unread === 'true';
  const limit = Math.min(100, Number(req.query.limit) || 50);
  res.json(await notifications.listNotifications(req.user!.id, { unreadOnly, limit }));
}

export async function readNotification(req: Request, res: Response) {
  if (!(await notifications.markRead(req.user!.id, req.params.id))) throw notFound('Notification not found');
  res.json({ ok: true });
}

export async function readAllNotifications(req: Request, res: Response) {
  res.json({ updated: await notifications.markAllRead(req.user!.id) });
}

export function stream(req: Request, res: Response) {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();
  events.subscribe(req.user!.id, req.user!.role, res);
}
