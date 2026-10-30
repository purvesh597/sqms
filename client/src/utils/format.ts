import type { MealType, TokenStatus } from '../types';

const locale = 'en-IN';

export const formatTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' }) : '—';

export const formatDateTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString(locale, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—';

/** "YYYY-MM-DD" -> "Fri, 30 Oct 2026" (parsed as a local date). */
export function formatDate(date: string | Date, opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) {
  const d = typeof date === 'string' ? parseLocalDate(date) : date;
  return d.toLocaleDateString(locale, opts);
}

export function parseLocalDate(s: string) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toDateInput(d: Date = new Date()) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function shiftDate(s: string, days: number) {
  const d = parseLocalDate(s);
  d.setDate(d.getDate() + days);
  return toDateInput(d);
}

/** "19:30" -> "7:30 PM" */
export function formatClock(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });
}

export function formatRelative(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 45) return 'just now';
  if (diff < 3600) return `${Math.round(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)} hr ago`;
  if (diff < 7 * 86400) return `${Math.round(diff / 86400)} d ago`;
  return formatDateTime(iso);
}

/** Wait time for humans: "~4 min", "Under a minute". */
export function formatWait(secs: number | null | undefined) {
  if (secs === null || secs === undefined) return '—';
  if (secs < 45) return 'Under a minute';
  const mins = Math.round(secs / 60);
  if (mins < 60) return `~${mins} min`;
  return `~${Math.floor(mins / 60)} hr ${mins % 60} min`;
}

/** Compact duration for tables: "1m 32s", "4m". */
export function formatSecs(secs: number | null | undefined) {
  if (!secs) return '—';
  const m = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  if (!m) return `${s}s`;
  return s && m < 10 ? `${m}m ${s}s` : `${m}m`;
}

export const STATUS_META: Record<TokenStatus, { label: string; tone: 'blue' | 'amber' | 'green' | 'red' | 'gray' }> = {
  WAITING: { label: 'Waiting', tone: 'blue' },
  CALLED: { label: 'Called', tone: 'amber' },
  SERVED: { label: 'Served', tone: 'green' },
  SKIPPED: { label: 'Skipped', tone: 'red' },
  CANCELLED: { label: 'Cancelled', tone: 'gray' },
};

export const MEAL_ORDER: MealType[] = ['BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER'];

export const CATEGORY_LABEL: Record<string, string> = {
  MAIN: 'Main course',
  SIDE: 'Sides',
  BREAD: 'Breads',
  RICE: 'Rice',
  DESSERT: 'Dessert',
  BEVERAGE: 'Beverage',
};

export function initials(name: string) {
  return name
    .replace(/^(Dr|Mr|Ms|Mrs)\.?\s+/i, '')
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export function greeting(d = new Date()) {
  const h = d.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
