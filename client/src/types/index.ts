export type Role = 'STUDENT' | 'STAFF' | 'ADMIN';
export type TokenStatus = 'WAITING' | 'CALLED' | 'SERVED' | 'SKIPPED' | 'CANCELLED';
export type MealType = 'BREAKFAST' | 'LUNCH' | 'SNACKS' | 'DINNER';
export type MealState = 'SERVING' | 'UPCOMING' | 'CLOSED';
export type MenuCategory = 'MAIN' | 'SIDE' | 'BREAD' | 'RICE' | 'DESSERT' | 'BEVERAGE';

export interface CounterRef {
  id: string;
  name: string;
  code: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  rollNumber: string | null;
  phone: string | null;
  hostel: string | null;
  isActive: boolean;
  assignedCounterId: string | null;
  assignedCounter: CounterRef | null;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface Counter extends CounterRef {
  description: string | null;
  isActive: boolean;
  isPaused: boolean;
  serviceSecs: number | null;
  createdAt: string;
}

export interface CounterWithStats extends Counter {
  staff: { id: string; name: string }[];
  tokensToday: number;
  waiting: number;
  served: number;
}

export interface Meal {
  id: string;
  type: MealType;
  name: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
  sortOrder: number;
}

export interface MealWithState extends Meal {
  state: MealState;
  bookable: { ok: boolean; reason?: string };
}

export interface Meta {
  today: string;
  serverTime: string;
  service: {
    name: string;
    location: string;
    enforceMealTimings: boolean;
    approachThreshold: number;
    defaultServiceSecs: number;
  };
  currentMeal: { id: string; state: MealState } | null;
  meals: MealWithState[];
  counters: Counter[];
}

export interface TokenDetail {
  id: string;
  tokenNumber: number;
  display: string;
  status: TokenStatus;
  date: string;
  counter: CounterRef & { isPaused: boolean };
  meal: Pick<Meal, 'id' | 'name' | 'type' | 'startTime' | 'endTime'>;
  position: number | null;
  tokensAhead: number | null;
  estimatedWaitSecs: number | null;
  secsPerToken: number;
  estimateSource: 'observed' | 'configured';
  nowServing: string | null;
  recallCount: number;
  createdAt: string;
  calledAt: string | null;
  servedAt: string | null;
  skippedAt: string | null;
  cancelledAt: string | null;
  canCancel: boolean;
}

export interface TokenHistoryItem {
  id: string;
  display: string;
  status: TokenStatus;
  date: string;
  counter: { id: string; name: string };
  meal: { id: string; name: string; type: MealType };
  createdAt: string;
  calledAt: string | null;
  servedAt: string | null;
  waitSecs: number | null;
}

export interface QueueStatus {
  counter: CounterRef & { isActive: boolean; isPaused: boolean };
  meal: Pick<Meal, 'id' | 'name' | 'type' | 'startTime' | 'endTime'>;
  bookable: { ok: boolean; reason?: string };
  nowServing: string | null;
  waitingCount: number;
  servedCount: number;
  estimatedWaitSecs: number;
  secsPerToken: number;
  estimateSource: 'observed' | 'configured';
}

export interface QueueToken {
  id: string;
  tokenNumber: number;
  display: string;
  status: TokenStatus;
  position: number | null;
  etaSecs: number | null;
  recallCount: number;
  createdAt: string;
  calledAt: string | null;
  servedAt: string | null;
  skippedAt: string | null;
  cancelledAt: string | null;
  user: { id: string; name: string; rollNumber: string | null };
}

export interface QueueSnapshot {
  key: { counterId: string; mealId: string; date: string };
  counter: Counter;
  meal: Meal;
  estimate: { secsPerToken: number; source: 'observed' | 'configured'; samples: number };
  nowServing: (QueueToken & { display: string }) | null;
  lastServed: string | null;
  counts: Record<TokenStatus, number>;
  total: number;
  nextWaitSecs: number;
  tokens: QueueToken[];
}

export type NotificationType =
  | 'TOKEN_GENERATED'
  | 'TURN_APPROACHING'
  | 'TOKEN_CALLED'
  | 'TOKEN_RECALLED'
  | 'TOKEN_SERVED'
  | 'TOKEN_SKIPPED'
  | 'TOKEN_CANCELLED';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  tokenId: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  category: MenuCategory;
  isVeg: boolean;
  date: string;
  mealId: string;
  meal?: { id: string; name: string; type: MealType };
}

export interface MenuResponse {
  date: string;
  meals: (Meal & { items: MenuItem[] })[];
}

export interface ActivityEvent {
  id: string;
  type: string;
  createdAt: string;
  counter: CounterRef;
  actor: { id: string; name: string; role: Role } | null;
  token: { id: string; display: string; studentName: string } | null;
  details: Record<string, unknown> | null;
}

export interface StatBlock {
  generated: number;
  served: number;
  skipped: number;
  cancelled: number;
  active: number;
  avgWaitSecs: number;
  avgServiceSecs: number;
  serviceRate: number;
}

export interface Report {
  filters: { from: string; to: string; counterId?: string; mealId?: string };
  totals: StatBlock;
  daily: (StatBlock & { date: string })[];
  counters: (StatBlock & { id: string; name: string; code: string; isActive: boolean })[];
  meals: (StatBlock & { id: string; name: string; type: MealType })[];
}

export interface Overview {
  date: string;
  totals: {
    students: number;
    staff: number;
    tokensToday: number;
    waitingNow: number;
    calledNow: number;
    servedToday: number;
    skippedToday: number;
    cancelledToday: number;
    avgWaitSecs: number;
    avgServiceSecs: number;
    serviceRate: number;
  };
  hourly: { hour: number; tokens: number }[];
  weekly: (StatBlock & { date: string })[];
  weekTotals: StatBlock;
  byMealToday: Report['meals'];
  counters: (CounterRef & { isActive: boolean; isPaused: boolean; waiting: number; nowServing: string | null })[];
  recentActivity: { id: string; type: string; createdAt: string; counter: string; actor: string | null; token: string | null }[];
}

export interface Settings {
  id: string;
  name: string;
  location: string;
  description: string | null;
  defaultServiceSecs: number;
  approachThreshold: number;
  enforceMealTimings: boolean;
}

export interface Student extends User {
  totalTokens: number;
  servedTokens: number;
}
