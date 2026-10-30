import type { Request, Response } from 'express';
import * as admin from '../services/admin.service';
import * as analytics from '../services/analytics.service';
import { todayStr } from '../utils/date';

export const overview = async (_req: Request, res: Response) => res.json(await analytics.getOverview());

export const listCounters = async (_req: Request, res: Response) => res.json({ counters: await admin.listCounters() });
export const createCounter = async (req: Request, res: Response) =>
  res.status(201).json({ counter: await admin.createCounter(req.body) });
export const updateCounter = async (req: Request, res: Response) =>
  res.json({ counter: await admin.updateCounter(req.params.id, req.body) });

export const listMeals = async (_req: Request, res: Response) => res.json({ meals: await admin.listMeals() });
export const updateMeal = async (req: Request, res: Response) => res.json({ meal: await admin.updateMeal(req.params.id, req.body) });

export const getSettings = async (_req: Request, res: Response) => res.json({ settings: await admin.getSettings() });
export const updateSettings = async (req: Request, res: Response) =>
  res.json({ settings: await admin.updateSettings(req.body) });

export const listMenu = async (req: Request, res: Response) => {
  const { date, mealId } = req.query as { date?: string; mealId?: string };
  res.json({ items: await admin.listMenu(date || todayStr(), mealId || undefined) });
};
export const createMenuItem = async (req: Request, res: Response) =>
  res.status(201).json({ item: await admin.createMenuItem(req.body) });
export const updateMenuItem = async (req: Request, res: Response) =>
  res.json({ item: await admin.updateMenuItem(req.params.id, req.body) });
export const deleteMenuItem = async (req: Request, res: Response) => {
  await admin.deleteMenuItem(req.params.id);
  res.json({ ok: true });
};
export const copyMenu = async (req: Request, res: Response) =>
  res.json({ copied: await admin.copyMenu(req.body.fromDate, req.body.toDate, req.body.replace) });

export const listStaff = async (req: Request, res: Response) =>
  res.json({ staff: await admin.listStaff(req.query.search as string | undefined) });
export const createStaff = async (req: Request, res: Response) => res.status(201).json({ user: await admin.createStaff(req.body) });
export const updateStaff = async (req: Request, res: Response) =>
  res.json({ user: await admin.updateStaff(req.params.id, req.body) });

export const listStudents = async (req: Request, res: Response) =>
  res.json({ students: await admin.listStudents(req.query.search as string | undefined) });

export const report = async (req: Request, res: Response) => res.json(await analytics.buildReport(req.query as never));

export const exportReport = async (req: Request, res: Response) => {
  const q = req.query as unknown as { from: string; to: string; type: 'summary' | 'tokens'; counterId?: string; mealId?: string };
  const csv = await analytics.exportCsv(q);
  const filename = `sqms-${q.type}-${q.from}_to_${q.to}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send('﻿' + csv);
};
