import type { Prisma } from '@prisma/client';
import type { TokenStatus } from '../config/constants';
import { prisma } from '../prisma/client';
import { addDays, dateRange, secondsBetween, todayStr } from '../utils/date';
import { toCsv } from '../utils/csv';
import { formatTokenNumber } from '../utils/format';

interface Filters {
  from: string;
  to: string;
  counterId?: string;
  mealId?: string;
}

type Row = {
  status: string;
  date: string;
  counterId: string;
  mealId: string;
  createdAt: Date;
  calledAt: Date | null;
  servedAt: Date | null;
};

interface Bucket {
  generated: number;
  served: number;
  skipped: number;
  cancelled: number;
  waiting: number;
  waitTotal: number;
  waitCount: number;
  serviceTotal: number;
  serviceCount: number;
}

const emptyBucket = (): Bucket => ({
  generated: 0,
  served: 0,
  skipped: 0,
  cancelled: 0,
  waiting: 0,
  waitTotal: 0,
  waitCount: 0,
  serviceTotal: 0,
  serviceCount: 0,
});

function add(b: Bucket, t: Row) {
  b.generated++;
  const s = t.status as TokenStatus;
  if (s === 'SERVED') b.served++;
  else if (s === 'SKIPPED') b.skipped++;
  else if (s === 'CANCELLED') b.cancelled++;
  else b.waiting++;
  // Waiting time = generation -> called at the counter.
  if (t.calledAt) {
    b.waitTotal += secondsBetween(t.createdAt, t.calledAt);
    b.waitCount++;
  }
  if (t.calledAt && t.servedAt) {
    b.serviceTotal += secondsBetween(t.calledAt, t.servedAt);
    b.serviceCount++;
  }
}

const finalize = (b: Bucket) => ({
  generated: b.generated,
  served: b.served,
  skipped: b.skipped,
  cancelled: b.cancelled,
  active: b.waiting,
  avgWaitSecs: b.waitCount ? Math.round(b.waitTotal / b.waitCount) : 0,
  avgServiceSecs: b.serviceCount ? Math.round(b.serviceTotal / b.serviceCount) : 0,
  serviceRate: b.generated ? Math.round((b.served / b.generated) * 100) : 0,
});

const rowSelect = {
  status: true,
  date: true,
  counterId: true,
  mealId: true,
  createdAt: true,
  calledAt: true,
  servedAt: true,
} satisfies Prisma.TokenSelect;

function whereFor(f: Filters): Prisma.TokenWhereInput {
  return {
    date: { gte: f.from, lte: f.to },
    ...(f.counterId ? { counterId: f.counterId } : {}),
    ...(f.mealId ? { mealId: f.mealId } : {}),
  };
}

export async function buildReport(f: Filters) {
  const [rows, counters, meals] = await Promise.all([
    prisma.token.findMany({ where: whereFor(f), select: rowSelect }),
    prisma.counter.findMany({ orderBy: { code: 'asc' } }),
    prisma.meal.findMany({ orderBy: { sortOrder: 'asc' } }),
  ]);

  const total = emptyBucket();
  const byDate = new Map(dateRange(f.from, f.to).map((d) => [d, emptyBucket()]));
  const byCounter = new Map(counters.map((c) => [c.id, emptyBucket()]));
  const byMeal = new Map(meals.map((m) => [m.id, emptyBucket()]));

  for (const t of rows) {
    add(total, t);
    const d = byDate.get(t.date);
    if (d) add(d, t);
    byCounter.get(t.counterId) && add(byCounter.get(t.counterId)!, t);
    byMeal.get(t.mealId) && add(byMeal.get(t.mealId)!, t);
  }

  return {
    filters: f,
    totals: finalize(total),
    daily: [...byDate.entries()].map(([date, b]) => ({ date, ...finalize(b) })),
    counters: counters
      .filter((c) => !f.counterId || c.id === f.counterId)
      .map((c) => ({ id: c.id, name: c.name, code: c.code, isActive: c.isActive, ...finalize(byCounter.get(c.id)!) })),
    meals: meals
      .filter((m) => !f.mealId || m.id === f.mealId)
      .map((m) => ({ id: m.id, name: m.name, type: m.type, ...finalize(byMeal.get(m.id)!) })),
  };
}

export async function getOverview() {
  const today = todayStr();
  const weekStart = addDays(today, -6);
  const [students, staff, week, todayRows, counters, recent] = await Promise.all([
    prisma.user.count({ where: { role: 'STUDENT' } }),
    prisma.user.count({ where: { role: 'STAFF', isActive: true } }),
    buildReport({ from: weekStart, to: today }),
    prisma.token.findMany({ where: { date: today }, select: rowSelect }),
    prisma.counter.findMany({ orderBy: { code: 'asc' } }),
    prisma.queueEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: {
        counter: { select: { name: true, code: true } },
        actor: { select: { name: true, role: true } },
        token: { select: { tokenNumber: true } },
      },
    }),
  ]);

  const todayBucket = emptyBucket();
  const hourly = new Map<number, number>();
  for (const t of todayRows) {
    add(todayBucket, t);
    const h = t.createdAt.getHours();
    hourly.set(h, (hourly.get(h) ?? 0) + 1);
  }
  const hours = [...hourly.keys()];
  const minH = Math.min(7, ...hours);
  const maxH = Math.max(21, ...hours);
  const todayStats = finalize(todayBucket);

  const counterLive = await Promise.all(
    counters.map(async (c) => {
      const [waiting, called] = await Promise.all([
        prisma.token.count({ where: { counterId: c.id, date: today, status: 'WAITING' } }),
        prisma.token.findFirst({ where: { counterId: c.id, date: today, status: 'CALLED' }, select: { tokenNumber: true } }),
      ]);
      return {
        id: c.id,
        name: c.name,
        code: c.code,
        isActive: c.isActive,
        isPaused: c.isPaused,
        waiting,
        nowServing: called ? formatTokenNumber(c.code, called.tokenNumber) : null,
      };
    }),
  );

  return {
    date: today,
    totals: {
      students,
      staff,
      tokensToday: todayStats.generated,
      waitingNow: todayRows.filter((t) => t.status === 'WAITING').length,
      calledNow: todayRows.filter((t) => t.status === 'CALLED').length,
      servedToday: todayStats.served,
      skippedToday: todayStats.skipped,
      cancelledToday: todayStats.cancelled,
      avgWaitSecs: todayStats.avgWaitSecs,
      avgServiceSecs: todayStats.avgServiceSecs,
      serviceRate: todayStats.serviceRate,
    },
    hourly: Array.from({ length: maxH - minH + 1 }, (_, i) => ({ hour: minH + i, tokens: hourly.get(minH + i) ?? 0 })),
    weekly: week.daily,
    weekTotals: week.totals,
    byMealToday: (await buildReport({ from: today, to: today })).meals,
    counters: counterLive,
    recentActivity: recent.map((e) => ({
      id: e.id,
      type: e.type,
      createdAt: e.createdAt,
      counter: e.counter.name,
      actor: e.actor?.name ?? null,
      token: e.token ? formatTokenNumber(e.counter.code, e.token.tokenNumber) : null,
    })),
  };
}

const fmtTime = (d: Date | null) => (d ? d.toLocaleString('en-IN', { hour12: false }) : '');
const mins = (secs: number) => (secs / 60).toFixed(1);

export async function exportCsv(f: Filters & { type: 'summary' | 'tokens' }) {
  if (f.type === 'tokens') {
    const tokens = await prisma.token.findMany({
      where: whereFor(f),
      orderBy: [{ date: 'asc' }, { counterId: 'asc' }, { tokenNumber: 'asc' }],
      include: {
        counter: { select: { name: true, code: true } },
        meal: { select: { name: true } },
        user: { select: { name: true, rollNumber: true } },
      },
    });
    return toCsv(
      ['Date', 'Token', 'Counter', 'Meal', 'Student', 'Roll No', 'Status', 'Generated', 'Called', 'Served', 'Wait (min)', 'Recalls'],
      tokens.map((t) => [
        t.date,
        formatTokenNumber(t.counter.code, t.tokenNumber),
        t.counter.name,
        t.meal.name,
        t.user.name,
        t.user.rollNumber,
        t.status,
        fmtTime(t.createdAt),
        fmtTime(t.calledAt),
        fmtTime(t.servedAt),
        t.calledAt ? mins(secondsBetween(t.createdAt, t.calledAt)) : '',
        t.recallCount,
      ]),
    );
  }

  const r = await buildReport(f);
  const head = ['Generated', 'Served', 'Skipped', 'Cancelled', 'Active', 'Avg wait (min)', 'Avg service (min)', 'Served %'];
  const vals = (x: ReturnType<typeof finalize>) => [
    x.generated,
    x.served,
    x.skipped,
    x.cancelled,
    x.active,
    mins(x.avgWaitSecs),
    mins(x.avgServiceSecs),
    x.serviceRate,
  ];
  const sections = [
    `SQMS Mess Report,${f.from} to ${f.to}`,
    '',
    toCsv(['Date', ...head], r.daily.map((d) => [d.date, ...vals(d)])),
    toCsv(['TOTAL', ...head], [['All days', ...vals(r.totals)]]).split('\r\n')[1],
    '',
    toCsv(['Counter', ...head], r.counters.map((c) => [c.name, ...vals(c)])),
    '',
    toCsv(['Meal', ...head], r.meals.map((m) => [m.name, ...vals(m)])),
  ];
  return sections.join('\r\n');
}
