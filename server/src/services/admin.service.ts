import type { Prisma } from '@prisma/client';
import { prisma } from '../prisma/client';
import { todayStr } from '../utils/date';
import { badRequest, conflict, notFound } from '../utils/http-error';
import { events } from './events.service';
import { getMessService } from './meal.service';
import { hashPassword, publicUserSelect } from './auth.service';

/* ---------------- Counters ---------------- */

export async function listCounters() {
  const today = todayStr();
  const counters = await prisma.counter.findMany({
    orderBy: { code: 'asc' },
    include: { staff: { select: { id: true, name: true } }, _count: { select: { tokens: { where: { date: today } } } } },
  });
  const grouped = await prisma.token.groupBy({ by: ['counterId', 'status'], where: { date: today }, _count: true });
  return counters.map((c) => {
    const stat = (s: string) => grouped.find((g) => g.counterId === c.id && g.status === s)?._count ?? 0;
    return {
      ...c,
      tokensToday: c._count.tokens,
      waiting: stat('WAITING'),
      served: stat('SERVED'),
    };
  });
}

export async function createCounter(data: { name: string; code: string; description?: string; serviceSecs?: number | null; isActive?: boolean }) {
  const service = await getMessService();
  if (await prisma.counter.findUnique({ where: { code: data.code } })) throw conflict(`Counter code "${data.code}" is already in use.`);
  const counter = await prisma.counter.create({ data: { ...data, messServiceId: service.id } });
  events.broadcast({ type: 'counter.updated', data: { counterId: counter.id } });
  return counter;
}

export async function updateCounter(id: string, data: Prisma.CounterUpdateInput & { code?: string }) {
  const existing = await prisma.counter.findUnique({ where: { id } });
  if (!existing) throw notFound('Counter not found');
  if (data.code && data.code !== existing.code) {
    const active = await prisma.token.count({ where: { counterId: id, date: todayStr(), status: { in: ['WAITING', 'CALLED'] } } });
    if (active) throw conflict('Cannot change the code while this counter has active tokens today.');
    if (await prisma.counter.findUnique({ where: { code: data.code } })) throw conflict(`Counter code "${data.code}" is already in use.`);
  }
  const counter = await prisma.counter.update({ where: { id }, data });
  events.broadcast({ type: 'counter.updated', data: { counterId: id } });
  return counter;
}

/* ---------------- Meals & settings ---------------- */

export const listMeals = () => prisma.meal.findMany({ orderBy: { sortOrder: 'asc' } });

export async function updateMeal(id: string, data: { name?: string; startTime?: string; endTime?: string; isActive?: boolean }) {
  const meal = await prisma.meal.findUnique({ where: { id } });
  if (!meal) throw notFound('Meal session not found');
  const start = data.startTime ?? meal.startTime;
  const end = data.endTime ?? meal.endTime;
  if (start >= end) throw badRequest('End time must be after start time.');
  const updated = await prisma.meal.update({ where: { id }, data });
  events.broadcast({ type: 'config.updated', data: {} });
  return updated;
}

export const getSettings = () => getMessService();

export async function updateSettings(data: Prisma.MessServiceUpdateInput) {
  const service = await getMessService();
  const updated = await prisma.messService.update({ where: { id: service.id }, data });
  events.broadcast({ type: 'config.updated', data: {} });
  return updated;
}

/* ---------------- Menu ---------------- */

const CATEGORY_ORDER: string[] = ['MAIN', 'RICE', 'BREAD', 'SIDE', 'DESSERT', 'BEVERAGE'];

export async function listMenu(date: string, mealId?: string) {
  const items = await prisma.menuItem.findMany({
    where: { date, ...(mealId ? { mealId } : {}) },
    orderBy: [{ meal: { sortOrder: 'asc' } }, { name: 'asc' }],
    include: { meal: { select: { id: true, name: true, type: true, sortOrder: true } } },
  });
  // Stable sort keeps name order within a category.
  return items.sort(
    (a, b) => a.meal.sortOrder - b.meal.sortOrder || CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category),
  );
}

async function assertMeal(mealId?: string) {
  if (mealId && !(await prisma.meal.findUnique({ where: { id: mealId } }))) throw badRequest('Selected meal session does not exist.');
}

export async function createMenuItem(data: Prisma.MenuItemUncheckedCreateInput) {
  await assertMeal(data.mealId);
  const item = await prisma.menuItem.create({ data, include: { meal: { select: { id: true, name: true, type: true } } } });
  events.broadcast({ type: 'menu.updated', data: { date: item.date } });
  return item;
}

export async function updateMenuItem(id: string, data: Prisma.MenuItemUncheckedUpdateInput) {
  await assertMeal(data.mealId as string | undefined);
  const item = await prisma.menuItem.update({ where: { id }, data, include: { meal: { select: { id: true, name: true, type: true } } } });
  events.broadcast({ type: 'menu.updated', data: { date: item.date } });
  return item;
}

export async function deleteMenuItem(id: string) {
  const item = await prisma.menuItem.delete({ where: { id } });
  events.broadcast({ type: 'menu.updated', data: { date: item.date } });
}

export async function copyMenu(fromDate: string, toDate: string, replace: boolean) {
  const source = await prisma.menuItem.findMany({ where: { date: fromDate } });
  if (!source.length) throw badRequest(`There is no menu on ${fromDate} to copy.`);
  const created = await prisma.$transaction(async (tx) => {
    if (replace) await tx.menuItem.deleteMany({ where: { date: toDate } });
    const res = await tx.menuItem.createMany({
      data: source.map(({ name, description, category, isVeg, mealId }) => ({ name, description, category, isVeg, mealId, date: toDate })),
    });
    return res.count;
  });
  events.broadcast({ type: 'menu.updated', data: { date: toDate } });
  return created;
}

/* ---------------- Staff & students ---------------- */

const searchWhere = (search?: string): Prisma.UserWhereInput =>
  search ? { OR: [{ name: { contains: search } }, { email: { contains: search } }, { rollNumber: { contains: search } }] } : {};

export const listStaff = (search?: string) =>
  prisma.user.findMany({ where: { role: 'STAFF', ...searchWhere(search) }, orderBy: { createdAt: 'asc' }, select: publicUserSelect });

async function assertCounter(id?: string | null) {
  if (id && !(await prisma.counter.findUnique({ where: { id } }))) throw badRequest('Assigned counter does not exist.');
}

export async function createStaff(data: { name: string; email: string; phone?: string; password: string; assignedCounterId?: string | null }) {
  if (await prisma.user.findUnique({ where: { email: data.email } })) throw conflict('An account with this email already exists.');
  await assertCounter(data.assignedCounterId);
  const { password, ...rest } = data;
  return prisma.user.create({ data: { ...rest, role: 'STAFF', passwordHash: await hashPassword(password) }, select: publicUserSelect });
}

export async function updateStaff(
  id: string,
  data: { name?: string; email?: string; phone?: string; password?: string; assignedCounterId?: string | null; isActive?: boolean },
) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.role !== 'STAFF') throw notFound('Staff member not found');
  if (data.email && data.email !== user.email && (await prisma.user.findUnique({ where: { email: data.email } }))) {
    throw conflict('An account with this email already exists.');
  }
  await assertCounter(data.assignedCounterId);
  const { password, ...rest } = data;
  return prisma.user.update({
    where: { id },
    data: { ...rest, ...(password ? { passwordHash: await hashPassword(password) } : {}) },
    select: publicUserSelect,
  });
}

export async function listStudents(search?: string) {
  const students = await prisma.user.findMany({
    where: { role: 'STUDENT', ...searchWhere(search) },
    orderBy: { name: 'asc' },
    select: { ...publicUserSelect, _count: { select: { tokens: true } } },
  });
  const served = await prisma.token.groupBy({ by: ['userId'], where: { status: 'SERVED' }, _count: true });
  return students.map(({ _count, ...s }) => ({
    ...s,
    totalTokens: _count.tokens,
    servedTokens: served.find((x) => x.userId === s.id)?._count ?? 0,
  }));
}
