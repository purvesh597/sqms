export const ROLES = ['STUDENT', 'STAFF', 'ADMIN'] as const;
export type Role = (typeof ROLES)[number];

export const TOKEN_STATUSES = ['WAITING', 'CALLED', 'SERVED', 'SKIPPED', 'CANCELLED'] as const;
export type TokenStatus = (typeof TOKEN_STATUSES)[number];

export const ACTIVE_STATUSES: TokenStatus[] = ['WAITING', 'CALLED'];

/** Allowed token state transitions. Anything not listed is rejected by the backend. */
export const TOKEN_TRANSITIONS: Record<TokenStatus, TokenStatus[]> = {
  WAITING: ['CALLED', 'SKIPPED', 'CANCELLED'],
  CALLED: ['SERVED', 'SKIPPED'],
  SERVED: [],
  SKIPPED: [],
  CANCELLED: [],
};

export const MEAL_TYPES = ['BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER'] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export const MENU_CATEGORIES = ['MAIN', 'SIDE', 'BREAD', 'RICE', 'DESSERT', 'BEVERAGE'] as const;

export const NOTIFICATION_TYPES = [
  'TOKEN_GENERATED',
  'TURN_APPROACHING',
  'TOKEN_CALLED',
  'TOKEN_RECALLED',
  'TOKEN_SERVED',
  'TOKEN_SKIPPED',
  'TOKEN_CANCELLED',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const QUEUE_EVENT_TYPES = [
  'TOKEN_GENERATED',
  'TOKEN_CALLED',
  'TOKEN_RECALLED',
  'TOKEN_SERVED',
  'TOKEN_SKIPPED',
  'TOKEN_CANCELLED',
  'QUEUE_PAUSED',
  'QUEUE_RESUMED',
] as const;
export type QueueEventType = (typeof QUEUE_EVENT_TYPES)[number];

/** Students may book a token this many minutes before a meal starts (when timings are enforced). */
export const BOOKING_LEAD_MINUTES = 30;

/** Bounds applied to observed service times so a single outlier cannot distort estimates. */
export const MIN_SERVICE_SECS = 20;
export const MAX_SERVICE_SECS = 600;
/** Gaps between consecutive calls longer than this are treated as breaks, not service time. */
export const MAX_OBSERVED_GAP_SECS = 600;
export const MIN_OBSERVED_SAMPLES = 3;
/** Calls closer together than this (e.g. rapid clicking) are not representative of service time. */
export const MIN_OBSERVED_GAP_SECS = 10;
