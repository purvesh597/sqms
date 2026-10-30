import type { Meal, MessService } from '@prisma/client';
import { BOOKING_LEAD_MINUTES } from '../config/constants';
import { prisma } from '../prisma/client';
import { minutesNow, timeToMinutes } from '../utils/date';

export type MealState = 'SERVING' | 'UPCOMING' | 'CLOSED';

export async function getMessService(): Promise<MessService> {
  const service = await prisma.messService.findFirst();
  if (!service) throw new Error('Mess service is not configured. Run the database seed.');
  return service;
}

export function mealState(meal: Meal, now = new Date()): MealState {
  const m = minutesNow(now);
  if (m >= timeToMinutes(meal.startTime) && m < timeToMinutes(meal.endTime)) return 'SERVING';
  if (m < timeToMinutes(meal.startTime)) return 'UPCOMING';
  return 'CLOSED';
}

/** Whether students can currently book a token for this meal. */
export function isBookable(meal: Meal, service: MessService, now = new Date()) {
  if (!meal.isActive) return { ok: false, reason: `${meal.name} is not active today.` };
  if (!service.enforceMealTimings) return { ok: true as const };
  const m = minutesNow(now);
  const opens = timeToMinutes(meal.startTime) - BOOKING_LEAD_MINUTES;
  const closes = timeToMinutes(meal.endTime);
  if (m < opens) return { ok: false, reason: `Token booking for ${meal.name} opens ${BOOKING_LEAD_MINUTES} minutes before ${meal.startTime}.` };
  if (m >= closes) return { ok: false, reason: `${meal.name} service has ended for today.` };
  return { ok: true as const };
}

/**
 * The meal currently being served; otherwise the next one today; otherwise the
 * last meal of the day (so dashboards always have a sensible default).
 */
export function resolveCurrentMeal(meals: Meal[], now = new Date()): { meal: Meal | null; state: MealState | null } {
  const active = meals.filter((m) => m.isActive).sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  if (!active.length) return { meal: null, state: null };
  const serving = active.find((m) => mealState(m, now) === 'SERVING');
  if (serving) return { meal: serving, state: 'SERVING' };
  const upcoming = active.find((m) => mealState(m, now) === 'UPCOMING');
  if (upcoming) return { meal: upcoming, state: 'UPCOMING' };
  return { meal: active[active.length - 1], state: 'CLOSED' };
}

export async function getMealsWithState() {
  const [meals, service] = await Promise.all([prisma.meal.findMany({ orderBy: { sortOrder: 'asc' } }), getMessService()]);
  const now = new Date();
  const current = resolveCurrentMeal(meals, now);
  return {
    service,
    current,
    meals: meals.map((m) => ({ ...m, state: mealState(m, now), bookable: isBookable(m, service, now) })),
  };
}
